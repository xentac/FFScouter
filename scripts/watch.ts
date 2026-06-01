import { spawn } from "node:child_process";
import { readdirSync, statSync, watch } from "node:fs";
import { join } from "node:path";

function getDirectories(dir: string): string[] {
  const dirs: string[] = [dir];
  try {
    const files = readdirSync(dir);
    for (const file of files) {
      if (file === "node_modules" || file === ".git" || file === "dist") {
        continue;
      }
      const fullPath = join(dir, file);
      if (statSync(fullPath).isDirectory()) {
        dirs.push(...getDirectories(fullPath));
      }
    }
  } catch {
    // Ignore errors
  }
  return dirs;
}

let buildPending = false;
let buildInProgress = false;
let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

function runBuild(): void {
  if (buildInProgress) {
    buildPending = true;
    return;
  }

  buildInProgress = true;
  buildPending = false;
  console.log(
    `\n[watcher] 🚀 Starting build at ${new Date().toLocaleTimeString()}...`,
  );

  const proc = spawn("bun", ["run", "build", "--", "--mode", "dev"], {
    env: { ...process.env, DEV_BUILD: "true" },
    stdio: "inherit",
    shell: true,
  });

  proc.on("close", (code) => {
    buildInProgress = false;
    if (code === 0) {
      console.log("[watcher] ✅ Build succeeded.");
    } else {
      console.error(`[watcher] ❌ Build failed with code ${code}.`);
    }

    if (buildPending) {
      runBuild();
    }
  });
}

function triggerBuild(): void {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }
  debounceTimeout = setTimeout(() => {
    runBuild();
  }, 100);
}

const watchers = new Map<string, ReturnType<typeof watch>>();

function watchDir(dir: string): void {
  if (watchers.has(dir)) {
    return;
  }

  try {
    const watcher = watch(dir, (eventType, filename) => {
      if (!filename) {
        return;
      }

      if (
        filename.startsWith(".") ||
        filename.endsWith("~") ||
        filename.includes("dist")
      ) {
        return;
      }

      if (
        filename.endsWith(".ts") ||
        filename.endsWith(".tsx") ||
        filename.endsWith(".css") ||
        filename.endsWith(".json") ||
        filename.endsWith(".js")
      ) {
        console.log(
          `[watcher] File changed: ${join(dir, filename)} (${eventType})`,
        );

        if (eventType === "rename") {
          try {
            const fullPath = join(dir, filename);
            if (statSync(fullPath).isDirectory()) {
              console.log(
                `[watcher] New directory detected, watching: ${fullPath}`,
              );
              watchDir(fullPath);
            }
          } catch {
            // File might have been deleted, ignore
          }
        }

        triggerBuild();
      }
    });

    watchers.set(dir, watcher);
  } catch (e) {
    console.error(`[watcher] Failed to watch directory: ${dir}`, e);
  }
}

const dirsToWatch = [...getDirectories("src"), "."];

console.log(
  `[watcher] Watching ${dirsToWatch.length} directories for changes...`,
);
for (const dir of dirsToWatch) {
  watchDir(dir);
}

// Initial build
runBuild();
