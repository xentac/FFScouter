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
  },
  xentac: {
    name: "FF Scouter V2 xentac edition",
    fileName: "xentac.user.js",
    branch: "release-xentac",
    tagPrefix: "v",
  },
  v3: {
    name: "FF Scouter V3",
    fileName: "v3.user.js",
    branch: "release-v3",
    tagPrefix: "v",
  },
} as const;

type EditionKey = keyof typeof EDITIONS;

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

// Helper to get recent tags for a specific edition
function getRecentTagsForEdition(editionKey: EditionKey, count = 5): string[] {
  try {
    const output = execSync("git tag --sort=-creatordate", {
      stdio: "pipe",
    })
      .toString()
      .trim();

    if (output) {
      const allTags = output
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean);

      if (editionKey === "xentac") {
        return allTags.filter((t) => t.toLowerCase().includes("xentac")).slice(0, count);
      } else if (editionKey === "v3") {
        return allTags
          .filter(
            (t) =>
              t.toLowerCase().includes("v3") ||
              t.startsWith("v3") ||
              t.startsWith("3."),
          )
          .slice(0, count);
      } else {
        // Standard tags do not contain xentac or v3 or 3.
        return allTags
          .filter(
            (t) =>
              !t.toLowerCase().includes("xentac") &&
              !t.toLowerCase().includes("v3") &&
              !t.startsWith("v3") &&
              !t.startsWith("3."),
          )
          .slice(0, count);
      }
    }
  } catch (_e) {
    // Ignore error
  }
  return [];
}

function getNextLogicalVersion(version: string): string {
  // 1. Matches standard prerelease versions like "2.0-beta1", "2.77-xentac1"
  const prereleaseMatch = version.match(/^(\d+(?:\.\d+)*)-([a-zA-Z]+)(\d+)$/i);
  if (prereleaseMatch) {
    const [_, base, type, numStr] = prereleaseMatch;
    const nextNum = parseInt(numStr, 10) + 1;
    return `${base}-${type}${nextNum}`;
  }

  // 2. Matches standard dotted prerelease SemVer like "2.0.0-beta.1", "2.77-xentac.1"
  const dottedPrereleaseMatch = version.match(
    /^(\d+(?:\.\d+)*)-([a-zA-Z]+)\.(\d+)$/i,
  );
  if (dottedPrereleaseMatch) {
    const [_, base, type, numStr] = dottedPrereleaseMatch;
    const nextNum = parseInt(numStr, 10) + 1;
    return `${base}-${type}.${nextNum}`;
  }

  // 3. Matches standard dotted versions like "1.17.0"
  const dottedMatch = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (dottedMatch) {
    const [_, major, minor, patch] = dottedMatch;
    const nextPatch = parseInt(patch, 10) + 1;
    return `${major}.${minor}.${nextPatch}`;
  }

  // 4. Matches minor dotted versions like "2.0"
  const minorDottedMatch = version.match(/^(\d+)\.(\d+)$/);
  if (minorDottedMatch) {
    const [_, major, minor] = minorDottedMatch;
    const nextMinor = parseInt(minor, 10) + 1;
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

    const cleanArgs = args.filter(
      (arg) => !["--diff", "diff", "-d", "status", "--status"].includes(arg),
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
      } else {
        // Fallback to git describe --tags --abbrev=0 for general suggestion
        try {
          const lastTag = execSync("git describe --tags --abbrev=0")
            .toString()
            .trim();
          if (lastTag) {
            suggestion = lastTag.startsWith("v") ? lastTag.slice(1) : lastTag;
            suggestion = getNextLogicalVersion(suggestion);
          }
        } catch (_e) {
          // No tags yet
        }
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
    let branchExists = false;
    try {
      execSync(`git show-ref --verify --quiet refs/heads/${edition.branch}`);
      branchExists = true;
    } catch {
      // Local branch doesn't exist. Check remote
      try {
        execSync(
          `git show-ref --verify --quiet refs/remotes/origin/${edition.branch}`,
        );
        execSync(`git branch ${edition.branch} origin/${edition.branch}`);
        branchExists = true;
      } catch {
        // Doesn't exist anywhere. Create as orphan.
      }
    }

    if (!branchExists) {
      console.log(`Creating orphan release branch: ${edition.branch}`);
      runCmd("git", ["checkout", "--orphan", edition.branch]);
      runCmd("git", ["rm", "-rf", "."]);
      // Commit an empty file to initialize
      execSync('git commit --allow-empty -m "Initialize release branch"');
      runCmd("git", ["checkout", currentBranch]);
    }

    // 7. Run the Build
    console.log(`Building ${edition.name} v${version}...`);
    if (existsSync("dist")) {
      rmSync("dist", { recursive: true, force: true });
    }

    // Set environment variables for build
    const buildResult = spawnSync("bun", ["run", "build"], {
      env: {
        ...process.env,
        BUILD_EDITION: editionKey,
        BUILD_VERSION: version,
      },
      stdio: "inherit",
    });

    if (buildResult.status !== 0) {
      console.error("\x1b[31mBuild failed!\x1b[0m");
      process.exit(1);
    }

    const builtFilePath = `dist/${edition.fileName}`;
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

    // Commit to the release branch
    console.log("Committing built script and metadata to release branch...");
    runCmd("git", ["-C", worktreeDir, "add", edition.fileName]);

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
