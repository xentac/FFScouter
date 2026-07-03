import { execSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { stdin as input, stdout as output } from "node:process";
import readline from "node:readline/promises";

const EDITIONS = {
  standard: {
    name: "FF Scouter V2",
    fileName: "base.user.js",
    branch: "release-standard",
    tagPrefix: "v",
    tagSuffix: null,
  },
  beta: {
    name: "FF Scouter V2 beta",
    fileName: "beta.user.js",
    branch: "release-beta",
    tagPrefix: "v",
    tagSuffix: "-beta",
  },
  xentac: {
    name: "FF Scouter V2 xentac edition",
    fileName: "xentac.user.js",
    branch: "release-xentac",
    tagPrefix: "v",
    tagSuffix: "-xentac",
  },
  v3: {
    name: "FF Scouter V3",
    fileName: "v3.user.js",
    branch: "release-v3",
    tagPrefix: "v",
    tagSuffix: "-alpha",
  },
} as const;

type EditionKey = keyof typeof EDITIONS;

// GreasyFork's "additional info" field is pointed at this file's raw URL on each
// release branch, so it needs to be copied into release worktrees just like the
// built userscript itself.
const ADDITIONAL_INFO_PATH = "docs/greasyfork-additional-info.md";

// Kept separate from "dist" (the dev watch build's output dir) so that running a
// release never deletes the userscript `bun run dev:tm` is currently serving.
const RELEASE_OUT_DIR = "dist-release";

// Helper to run shell commands safely
function runCmd(
  cmd: string,
  args: string[],
  options: { stdio?: "inherit" | "pipe" } = {},
) {
  const result = spawnSync(cmd, args, {
    stdio: options.stdio || "inherit",
    encoding: "utf-8",
  });
  if (result.status !== 0) {
    throw new Error(
      `Command failed: ${cmd} ${args.join(" ")}\n${result.stderr || ""}`,
    );
  }
  return result.stdout?.trim();
}

function getAllTagsSorted(): string[] {
  try {
    const raw = execSync("git tag --sort=-creatordate", { stdio: "pipe" })
      .toString()
      .trim();
    if (raw)
      return raw
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean);
  } catch (_e) {
    // Ignore
  }
  return [];
}

// Helper to get recent tags for a specific edition
function getRecentTagsForEdition(editionKey: EditionKey, count = 5): string[] {
  const edition = EDITIONS[editionKey];
  const allSuffixes = (
    Object.values(EDITIONS) as Array<{ tagSuffix: string | null }>
  )
    .map((e) => e.tagSuffix)
    .filter((s): s is string => s !== null);

  const allTags = getAllTagsSorted();
  if (edition.tagSuffix !== null) {
    const suffix = edition.tagSuffix.toLowerCase();
    return allTags
      .filter((t) => t.toLowerCase().includes(suffix))
      .slice(0, count);
  } else {
    return allTags
      .filter(
        (t) =>
          !allSuffixes.some((s) => t.toLowerCase().includes(s.toLowerCase())),
      )
      .slice(0, count);
  }
}

function printAllEditionsSummary(): void {
  console.log("\x1b[1mRecent tags by edition:\x1b[0m");
  for (const key of Object.keys(EDITIONS) as EditionKey[]) {
    const recent = getRecentTagsForEdition(key, 1);
    const latest = recent[0] ?? "\x1b[90m(no releases yet)\x1b[0m";
    console.log(`  \x1b[36m${key.padEnd(10)}\x1b[0m ${latest}`);
  }
  console.log("");
}

function getNextLogicalVersion(version: string): string {
  // 1. Matches standard prerelease versions like "2.0-beta1", "2.77-xentac1"
  const prereleaseMatch = version.match(/^(\d+(?:\.\d+)*)-([a-zA-Z]+)(\d+)$/i);
  if (prereleaseMatch) {
    const [_, base, type, numStr] = prereleaseMatch;
    const nextNum = parseInt(numStr || "", 10) + 1;
    return `${base}-${type}${nextNum}`;
  }

  // 2. Matches standard dotted prerelease SemVer like "2.0.0-beta.1", "2.77-xentac.1"
  const dottedPrereleaseMatch = version.match(
    /^(\d+(?:\.\d+)*)-([a-zA-Z]+)\.(\d+)$/i,
  );
  if (dottedPrereleaseMatch) {
    const [_, base, type, numStr] = dottedPrereleaseMatch;
    const nextNum = parseInt(numStr || "", 10) + 1;
    return `${base}-${type}.${nextNum}`;
  }

  // 3. Matches standard dotted versions like "1.17.0"
  const dottedMatch = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (dottedMatch) {
    const [_, major, minor, patch] = dottedMatch;
    const nextPatch = parseInt(patch || "", 10) + 1;
    return `${major}.${minor}.${nextPatch}`;
  }

  // 4. Matches minor dotted versions like "2.0"
  const minorDottedMatch = version.match(/^(\d+)\.(\d+)$/);
  if (minorDottedMatch) {
    const [_, major, minor] = minorDottedMatch;
    const nextMinor = parseInt(minor || "", 10) + 1;
    return `${major}.${nextMinor}`;
  }

  return version;
}

// Helper to get release metadata from branch
function getReleaseMetadata(branch: string) {
  try {
    const content = execSync(`git show ${branch}:release-metadata.json`, {
      stdio: "pipe",
    })
      .toString()
      .trim();
    if (content) {
      return JSON.parse(content);
    }
  } catch (_e) {
    try {
      const content = execSync(
        `git show origin/${branch}:release-metadata.json`,
        { stdio: "pipe" },
      )
        .toString()
        .trim();
      if (content) {
        return JSON.parse(content);
      }
    } catch (_err) {
      // Ignore
    }
  }
  return null;
}

// Ensure a release branch exists locally, tracking origin or created as an orphan
function ensureReleaseBranchExists(
  branch: string,
  currentBranch: string,
): void {
  let branchExists = false;
  try {
    execSync(`git show-ref --verify --quiet refs/heads/${branch}`);
    branchExists = true;
  } catch {
    // Local branch doesn't exist. Check remote
    try {
      execSync(`git show-ref --verify --quiet refs/remotes/origin/${branch}`);
      execSync(`git branch ${branch} origin/${branch}`);
      branchExists = true;
    } catch {
      // Doesn't exist anywhere. Create as orphan.
    }
  }

  if (!branchExists) {
    console.log(`Creating orphan release branch: ${branch}`);
    runCmd("git", ["checkout", "--orphan", branch]);
    runCmd("git", ["rm", "-rf", "."]);
    // Commit an empty file to initialize
    execSync('git commit --allow-empty -m "Initialize release branch"');
    runCmd("git", ["checkout", currentBranch]);
  }
}

// Copies the additional-info doc into a worktree for `branch` and commits it if changed.
// Returns true if a commit was made.
function publishAdditionalInfoToBranch(
  branch: string,
  sourceCommit: string,
): boolean {
  const worktreeDir = ".release-worktree";
  if (existsSync(worktreeDir)) {
    rmSync(worktreeDir, { recursive: true, force: true });
  }

  console.log(
    `Creating git worktree at ${worktreeDir} for branch ${branch}...`,
  );
  runCmd("git", ["worktree", "add", "-B", branch, worktreeDir, branch]);

  console.log(`Copying ${ADDITIONAL_INFO_PATH} to worktree...`);
  copyFileSync(
    ADDITIONAL_INFO_PATH,
    `${worktreeDir}/greasyfork-additional-info.md`,
  );
  runCmd("git", ["-C", worktreeDir, "add", "greasyfork-additional-info.md"]);

  const hasChanges = execSync(`git -C ${worktreeDir} status --porcelain`)
    .toString()
    .trim();
  let committed = false;
  if (hasChanges) {
    const commitMessage = `Update GreasyFork additional info\n\nSynced from commit: ${sourceCommit}`;
    runCmd("git", ["-C", worktreeDir, "commit", "-m", commitMessage]);
    committed = true;
  } else {
    console.log(`No changes to additional-info doc on ${branch}.`);
  }

  console.log("Cleaning up worktree...");
  runCmd("git", ["worktree", "remove", "--force", worktreeDir]);
  if (existsSync(worktreeDir)) {
    rmSync(worktreeDir, { recursive: true, force: true });
  }

  return committed;
}

// Interactive flow for `--docs`: publish the additional-info doc to one or more
// release branches without building/tagging a release.
async function runDocsPublish(
  rl: readline.Interface,
  currentBranch: string,
  sourceCommit: string,
): Promise<void> {
  if (!existsSync(ADDITIONAL_INFO_PATH)) {
    console.error(`\x1b[31mError: ${ADDITIONAL_INFO_PATH} not found.\x1b[0m`);
    process.exit(1);
  }

  const keys = Object.keys(EDITIONS) as EditionKey[];
  console.log("Select branch(es) to publish the additional-info doc to:");
  keys.forEach((k, idx) => {
    console.log(`  [${idx + 1}] ${k} (${EDITIONS[k].branch})`);
  });
  const allIdx = keys.length + 1;
  console.log(`  [${allIdx}] all`);

  const choice = await rl.question(
    `Choice (comma-separated, e.g. "1,3", or ${allIdx} for all): `,
  );
  const picks = choice
    .split(",")
    .map((c) => parseInt(c.trim(), 10))
    .filter((n) => !Number.isNaN(n));

  const selectedKeys = picks.includes(allIdx)
    ? keys
    : picks
        .map((idx) => keys[idx - 1])
        .filter((k): k is EditionKey => Boolean(k));

  if (selectedKeys.length === 0) {
    console.error("\x1b[31mNo valid branches selected.\x1b[0m");
    process.exit(1);
  }

  console.log("\n------------------------------------------------");
  console.log("Publishing additional-info doc to:");
  for (const k of selectedKeys) {
    console.log(`  - ${EDITIONS[k].name} (${EDITIONS[k].branch})`);
  }
  console.log("------------------------------------------------\n");

  const proceed = await rl.question("Proceed? (y/N): ");
  if (proceed.toLowerCase() !== "y") {
    console.log("Cancelled.");
    return;
  }

  const updatedBranches: string[] = [];
  for (const key of selectedKeys) {
    const branch = EDITIONS[key].branch;
    ensureReleaseBranchExists(branch, currentBranch);
    if (publishAdditionalInfoToBranch(branch, sourceCommit)) {
      updatedBranches.push(branch);
    }
  }

  if (updatedBranches.length > 0) {
    console.log("\n\x1b[32mDone. To publish, run:\x1b[0m");
    console.log(
      `  \x1b[36mgit push origin ${updatedBranches.join(" ")}\x1b[0m\n`,
    );
  } else {
    console.log("\nNo branches had changes to publish.");
  }
}

// Helper to show status of an edition compared to HEAD
async function showEditionStatus(editionKey: EditionKey, sourceCommit: string) {
  const edition = EDITIONS[editionKey];
  console.log(`\n\x1b[1;35m=== Status for ${edition.name} ===\x1b[0m`);
  console.log(`Branch:          \x1b[36m${edition.branch}\x1b[0m`);

  // Recent Tags
  const recentTags = getRecentTagsForEdition(editionKey, 5);
  console.log("Recent tags:");
  if (recentTags.length > 0) {
    recentTags.forEach((tag) => {
      console.log(`  - \x1b[32m${tag}\x1b[0m`);
    });
  } else {
    console.log("  \x1b[90m(No tags found)\x1b[0m");
  }

  const metadata = getReleaseMetadata(edition.branch);
  if (!metadata) {
    console.log(
      `Release status:  \x1b[31mNo release metadata found (not yet released or branch missing)\x1b[0m`,
    );
    return;
  }

  console.log(`Current version: \x1b[32m${metadata.version}\x1b[0m`);
  console.log(`Build Date:      \x1b[90m${metadata.buildDate}\x1b[0m`);
  console.log(`Source Commit:   \x1b[36m${metadata.sourceCommit}\x1b[0m`);

  const relSourceCommit = metadata.sourceCommit;
  if (!relSourceCommit) {
    console.log(
      `\x1b[31mWarning: Release metadata does not contain sourceCommit.\x1b[0m`,
    );
    return;
  }

  // Check if sourceCommit exists in history
  let commitExists = false;
  try {
    execSync(`git cat-file -e ${relSourceCommit}`, { stdio: "ignore" });
    commitExists = true;
  } catch (_e) {
    // Ignore
  }

  if (!commitExists) {
    console.log(
      `\x1b[33mWarning: Release source commit ${relSourceCommit} is not in Git history. Cannot calculate diff.\x1b[0m`,
    );
    return;
  }

  // Commits between relSourceCommit and sourceCommit (HEAD)
  try {
    const countStr = execSync(
      `git rev-list --count ${relSourceCommit}..${sourceCommit}`,
      { stdio: "pipe" },
    )
      .toString()
      .trim();
    const count = parseInt(countStr, 10);

    if (count === 0) {
      console.log(
        `\x1b[32mHEAD is up to date with this release (0 commits difference).\x1b[0m`,
      );
    } else {
      console.log(
        `\x1b[33mHEAD is ahead of this release by ${count} commit(s):\x1b[0m`,
      );
      const logs = execSync(
        `git log ${relSourceCommit}..${sourceCommit} --format="- %s (%h)"`,
        { stdio: "pipe" },
      )
        .toString()
        .trim();
      const logLines = logs.split("\n").filter(Boolean);
      const limit = 15;
      logLines.slice(0, limit).forEach((line) => {
        console.log(`  ${line}`);
      });
      if (logLines.length > limit) {
        console.log(`  ... and ${logLines.length - limit} more commits.`);
      }
    }
  } catch (err) {
    console.log(`\x1b[31mFailed to calculate commit difference: ${err}\x1b[0m`);
  }
}

async function main() {
  const rl = readline.createInterface({ input, output });

  try {
    const args = process.argv.slice(2);
    const isDiff = args.some((arg) =>
      ["--diff", "diff", "-d", "status", "--status"].includes(arg),
    );
    const isDocsMode = args.some((arg) => ["--docs", "docs"].includes(arg));

    // 1. Ensure working directory is clean (skipped in diff/status mode)
    if (!isDiff) {
      const status = execSync("git status --porcelain").toString().trim();
      if (status) {
        console.error(
          "\x1b[31mError: Git working directory is not clean. Please commit or stash your changes first.\x1b[0m",
        );
        console.error(status);
        process.exit(1);
      }
    }

    // Get current branch and commit details
    const currentBranch =
      execSync("git branch --show-current").toString().trim() ||
      "DETACHED_HEAD";
    const sourceCommit = execSync("git rev-parse HEAD").toString().trim();

    printAllEditionsSummary();

    const cleanArgs = args.filter(
      (arg) =>
        ![
          "--diff",
          "diff",
          "-d",
          "status",
          "--status",
          "--docs",
          "docs",
        ].includes(arg),
    );

    // Handle status/diff mode
    if (isDiff) {
      let editionKey = cleanArgs[0] as EditionKey;
      if (!editionKey || !EDITIONS[editionKey]) {
        console.log("Select edition to compare with HEAD:");
        const keys = Object.keys(EDITIONS) as EditionKey[];
        keys.forEach((k, idx) => {
          console.log(`  [${idx + 1}] ${k} (${EDITIONS[k].name})`);
        });
        console.log(
          `  [${keys.length + 1}] all (Show status for all editions)`,
        );

        const choice = await rl.question(`Choice (1-${keys.length + 1}): `);
        const idx = parseInt(choice.trim(), 10) - 1;
        if (Number.isNaN(idx) || idx < 0 || idx > keys.length) {
          console.error("Invalid choice.");
          process.exit(1);
        }
        if (idx === keys.length) {
          for (const k of keys) {
            await showEditionStatus(k, sourceCommit);
          }
          process.exit(0);
        }
        const selectedKey = keys[idx];
        if (!selectedKey) {
          console.error("Invalid choice.");
          process.exit(1);
        }
        editionKey = selectedKey;
      }

      await showEditionStatus(editionKey, sourceCommit);
      process.exit(0);
    }

    // Handle docs-only publish mode (escape hatch: no build, no version, no tag)
    if (isDocsMode) {
      await runDocsPublish(rl, currentBranch, sourceCommit);
      process.exit(0);
    }

    // 2. Determine Edition
    let editionKey = cleanArgs[0] as EditionKey;
    if (!editionKey || !EDITIONS[editionKey]) {
      console.log("Select edition to release:");
      const keys = Object.keys(EDITIONS) as EditionKey[];
      keys.forEach((k, idx) => {
        console.log(`  [${idx + 1}] ${k} (${EDITIONS[k].name})`);
      });

      const choice = await rl.question("Choice (1-3): ");
      const idx = parseInt(choice.trim(), 10) - 1;
      if (Number.isNaN(idx) || idx < 0 || idx >= keys.length) {
        console.error("Invalid choice.");
        process.exit(1);
      }
      const selectedKey = keys[idx];
      if (!selectedKey) {
        console.error("Invalid choice.");
        process.exit(1);
      }
      editionKey = selectedKey;
    }

    const edition = EDITIONS[editionKey];

    // Show status for this edition before prompting for version
    await showEditionStatus(editionKey, sourceCommit);

    // 3. Determine Version
    let version = cleanArgs[1];
    if (!version) {
      // Suggest previous tag
      let suggestion = "1.0.0";
      const recentTags = getRecentTagsForEdition(editionKey, 5);
      const lastTag = recentTags[0];
      if (lastTag) {
        suggestion = lastTag.startsWith("v") ? lastTag.slice(1) : lastTag;
        suggestion = getNextLogicalVersion(suggestion);
      }

      console.log(""); // newline spacing
      version = await rl.question(
        `Enter release version (suggested: ${suggestion}): `,
      );
      version = version.trim() || suggestion;
    }

    // 4. Validate Version Format based on edition
    if (editionKey === "xentac" && !version.includes("xentac")) {
      const confirm = await rl.question(
        `\x1b[33mWarning: Xentac edition version typically contains "xentac" (e.g. 2.77-xentac1). You entered "${version}". Continue anyway? (y/N): \x1b[0m`,
      );
      if (confirm.toLowerCase() !== "y") {
        process.exit(0);
      }
    } else if (
      editionKey === "v3" &&
      !version.includes("v3") &&
      !version.startsWith("3.")
    ) {
      const confirm = await rl.question(
        `\x1b[33mWarning: V3 edition version typically starts with "3." or contains "v3". You entered "${version}". Continue anyway? (y/N): \x1b[0m`,
      );
      if (confirm.toLowerCase() !== "y") {
        process.exit(0);
      }
    }

    // 5. Confirm Release Action
    const tagName = `${edition.tagPrefix}${version}`;
    console.log("\n------------------------------------------------");
    console.log(`Edition:   \x1b[32m${edition.name}\x1b[0m`);
    console.log(`Version:   \x1b[32m${version}\x1b[0m`);
    console.log(`Branch:    \x1b[32m${edition.branch}\x1b[0m`);
    console.log(`Tag:       \x1b[32m${tagName}\x1b[0m`);
    console.log("------------------------------------------------\n");

    const proceed = await rl.question("Proceed with release? (y/N): ");
    if (proceed.toLowerCase() !== "y") {
      console.log("Release cancelled.");
      process.exit(0);
    }

    // 6. Ensure Release Branch Exists
    ensureReleaseBranchExists(edition.branch, currentBranch);

    // 7. Run the Build
    console.log(`Building ${edition.name} v${version}...`);
    if (existsSync(RELEASE_OUT_DIR)) {
      rmSync(RELEASE_OUT_DIR, { recursive: true, force: true });
    }

    // Set environment variables for build
    const buildResult = spawnSync(
      "bun",
      ["run", "build", "--", "--outDir", RELEASE_OUT_DIR],
      {
        env: {
          ...process.env,
          BUILD_EDITION: editionKey,
          BUILD_VERSION: version,
        },
        stdio: "inherit",
      },
    );

    if (buildResult.status !== 0) {
      console.error("\x1b[31mBuild failed!\x1b[0m");
      process.exit(1);
    }

    const builtFilePath = `${RELEASE_OUT_DIR}/${edition.fileName}`;
    if (!existsSync(builtFilePath)) {
      console.error(
        `\x1b[31mError: Expected built file not found at ${builtFilePath}\x1b[0m`,
      );
      process.exit(1);
    }

    // 8. Create Git Worktree to Commit Build
    const worktreeDir = ".release-worktree";
    if (existsSync(worktreeDir)) {
      rmSync(worktreeDir, { recursive: true, force: true });
    }

    console.log(
      `Creating git worktree at ${worktreeDir} for branch ${edition.branch}...`,
    );
    runCmd("git", [
      "worktree",
      "add",
      "-B",
      edition.branch,
      worktreeDir,
      edition.branch,
    ]);

    // Copy build output to the worktree
    console.log(`Copying ${builtFilePath} to worktree...`);
    copyFileSync(builtFilePath, `${worktreeDir}/${edition.fileName}`);

    // Copy GreasyFork additional info doc, since GF reads it directly from this branch
    if (existsSync(ADDITIONAL_INFO_PATH)) {
      console.log(`Copying ${ADDITIONAL_INFO_PATH} to worktree...`);
      copyFileSync(
        ADDITIONAL_INFO_PATH,
        `${worktreeDir}/greasyfork-additional-info.md`,
      );
    } else {
      console.warn(
        `\x1b[33mWarning: ${ADDITIONAL_INFO_PATH} not found; skipping additional-info publish.\x1b[0m`,
      );
    }

    // Commit to the release branch
    console.log("Committing built script and metadata to release branch...");
    runCmd("git", ["-C", worktreeDir, "add", edition.fileName]);
    if (existsSync(`${worktreeDir}/greasyfork-additional-info.md`)) {
      runCmd("git", [
        "-C",
        worktreeDir,
        "add",
        "greasyfork-additional-info.md",
      ]);
    }

    // Write release metadata
    const metadataPath = `${worktreeDir}/release-metadata.json`;

    // Gather commit summary since the last release
    let commitSummary = "";
    if (existsSync(metadataPath)) {
      try {
        const oldMetadata = JSON.parse(readFileSync(metadataPath, "utf-8"));
        const lastSourceCommit = oldMetadata.sourceCommit;

        if (lastSourceCommit && lastSourceCommit !== sourceCommit) {
          // Safety Check: Verify the previous source commit still exists in local Git history
          let commitExists = false;
          try {
            execSync(`git cat-file -e ${lastSourceCommit}`, {
              stdio: "ignore",
            });
            commitExists = true;
          } catch {
            console.log(
              `\x1b[33mWarning: Previous release source commit ${lastSourceCommit} is no longer in Git history (likely reset/garbage collected). Skipping changelog summary.\x1b[0m`,
            );
          }

          if (commitExists) {
            // Get beautiful one-line logs from the main repository
            const logs = execSync(
              `git log ${lastSourceCommit}..${sourceCommit} --format="- %s (%h)"`,
            )
              .toString()
              .trim();

            if (logs) {
              commitSummary = `\n\nChanges since last release:\n${logs}`;
            }
          }
        }
      } catch (e) {
        console.warn(
          "Could not retrieve commit logs from last release metadata:",
          e,
        );
      }
    }

    const metadata = {
      edition: editionKey,
      version: version,
      buildDate: new Date().toISOString(),
      sourceCommit: sourceCommit,
      sourceBranch: currentBranch,
    };
    writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
    runCmd("git", ["-C", worktreeDir, "add", "release-metadata.json"]);

    // Check if there are changes to commit (could be already up to date)
    const hasChanges = execSync(`git -C ${worktreeDir} status --porcelain`)
      .toString()
      .trim();
    const commitMessage = `Release ${version}\n\nBuilt from commit: ${sourceCommit}\nSource branch: ${currentBranch}${commitSummary}`;

    if (hasChanges) {
      runCmd("git", ["-C", worktreeDir, "commit", "-m", commitMessage]);
    } else {
      console.log(
        "No changes detected in build output. Re-tagging latest commit.",
      );
    }

    // 9. Tag the Source Commit
    console.log(`Tagging source commit as ${tagName}...`);
    // Delete tag if it already exists locally to allow re-tagging (common in fix-ups)
    try {
      execSync(`git tag -d ${tagName}`, { stdio: "ignore" });
    } catch {
      // Tag didn't exist
    }
    runCmd("git", ["tag", "-a", tagName, sourceCommit, "-m", commitMessage]);

    // 10. Clean up worktree
    console.log("Cleaning up worktree...");
    runCmd("git", ["worktree", "remove", "--force", worktreeDir]);
    if (existsSync(worktreeDir)) {
      rmSync(worktreeDir, { recursive: true, force: true });
    }

    console.log(
      "\n\x1b[32mSuccess! Release built, committed, and tagged locally.\x1b[0m",
    );
    console.log("To publish, run:");
    console.log(
      `  \x1b[36mgit push origin ${edition.branch} ${tagName}\x1b[0m\n`,
    );
  } catch (error) {
    console.error("\x1b[31mAn error occurred during release:\x1b[0m", error);
    // Attempt worktree cleanup
    if (existsSync(".release-worktree")) {
      try {
        spawnSync("git", [
          "worktree",
          "remove",
          "--force",
          ".release-worktree",
        ]);
        rmSync(".release-worktree", { recursive: true, force: true });
      } catch {
        // Ignored
      }
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
