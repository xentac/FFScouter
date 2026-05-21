import { execSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, rmSync } from "node:fs";
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

async function main() {
  const rl = readline.createInterface({ input, output });

  try {
    // 1. Ensure working directory is clean
    const status = execSync("git status --porcelain").toString().trim();
    if (status) {
      console.error(
        "\x1b[31mError: Git working directory is not clean. Please commit or stash your changes first.\x1b[0m",
      );
      console.error(status);
      process.exit(1);
    }

    // Get current branch
    const currentBranch = execSync("git branch --show-current")
      .toString()
      .trim();

    // 2. Determine Edition
    const args = process.argv.slice(2);
    let editionKey = args[0] as EditionKey;
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

    // 3. Determine Version
    let version = args[1];
    if (!version) {
      // Suggest previous tag
      let suggestion = "1.0.0";
      try {
        const lastTag = execSync("git describe --tags --abbrev=0")
          .toString()
          .trim();
        suggestion = lastTag.startsWith("v") ? lastTag.slice(1) : lastTag;
      } catch (_e) {
        // No tags yet
      }

      version = await rl.question(
        `Enter release version (suggested: ${suggestion}): `,
      );
      version = version.trim();
      if (!version) {
        console.error("Version is required.");
        process.exit(1);
      }
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
    console.log("Committing built script to release branch...");
    runCmd("git", ["-C", worktreeDir, "add", edition.fileName]);

    // Check if there are changes to commit (could be already up to date)
    const hasChanges = execSync(`git -C ${worktreeDir} status --porcelain`)
      .toString()
      .trim();
    if (hasChanges) {
      runCmd("git", ["-C", worktreeDir, "commit", "-m", `Release ${version}`]);
    } else {
      console.log(
        "No changes detected in build output. Re-tagging latest commit.",
      );
    }

    // 9. Tag the Commit
    console.log(`Tagging release as ${tagName}...`);
    // Delete tag if it already exists locally to allow re-tagging (common in fix-ups)
    try {
      execSync(`git tag -d ${tagName}`, { stdio: "ignore" });
    } catch {
      // Tag didn't exist
    }
    runCmd("git", ["-C", worktreeDir, "tag", tagName]);

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
