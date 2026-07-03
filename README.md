# FF Scouter V2

An attempt to add a build system to FF Scouter to make further development and releasing easier.

## Setup

This project uses [Node.js](https://nodejs.org/) and [Bun](https://bun.sh/).

1. Install dependencies:

   ```bash
   bun install
   ```

---

## Development

> [!warning]
> Xentac and V3 editions are deprecated. Do not release them anymore.

The project supports four editions of the userscript:

- **Standard Edition** (`standard`): "FF Scouter V2"
- **Beta Edition** (`beta`): "FF Scouter V2 beta"
- ~~**Xentac Edition** (`xentac`): "FF Scouter V2 xentac edition"~~
- ~~**V3 Edition** (`v3`): "FF Scouter V3"~~

To run the live watch-and-reload server for development:

```bash
# Standard edition (default)
bun run dev:tm

BUILD_EDITION=beta bun run dev:tm
```

This runs a local dev server and watches for file changes. Install the corresponding dev version from the `dist/` directory (e.g. `base-dev.user.js`, `beta-dev.user.js`, `xentac-dev.user.js`, or `v3-dev.user.js`) into your userscript manager (Tampermonkey/Violentmonkey) to start testing.

By default in development mode, the userscript's name has `- DEV` appended (e.g., `FF Scouter V2 - DEV`) to avoid conflicting with your installed release scripts. You can override the script name entirely by passing the `BUILD_NAME` environment variable (e.g., `BUILD_NAME="Custom Scouter" bun run dev:tm`).

---

## Release Procedure

Release builds are automated using an interactive script that compiles the selected edition, commits the build to an isolated release branch, and tags the release.

1. Ensure your git working directory is clean (all source changes committed or stashed).
2. Run the release command:

   ```bash
   bun run release
   ```

3. Follow the interactive prompts:
   - Select the edition: Standard (`1`), Beta (`2`), ~~Xentac (`3`)~~, or ~~V3 (`4`)~~.
   - Enter the release version number (e.g. `2.80.0`, `2.80.0-xentac1`, `3.0.0-alpha1`).
4. Review the summary and confirm.
5. Once built and committed locally, push the release commit and tag to GitHub using the command printed by the script:

   ```bash
   git push origin <release-branch> <tag>
   ```

### GreasyFork Syncing

The release branches contain only the built, single-file userscripts in their root directories. You should configure your GreasyFork project settings to automatically sync from these branches:

- **Standard Edition**: Sync from `release-standard` branch, file `base.user.js`.
- **Beta Edition**: Sync from `release-beta` branch, file `beta.user.js`.
- ~~**Xentac Edition**: Sync from `release-xentac` branch, file `xentac.user.js`.~~
- ~~**V3 Edition**: Sync from `release-v3` branch, file `v3.user.js`.~~

---

## Git Branching Workflow

- **`modernize`**: Main development branch for all editions.
- ~~**`alternative_torn_pda`**: Integration branch for the Xentac edition.~~
- **Feature Branches**: Branch off `modernize` to work on features, then merge back into `modernize` and release.
