import { execSync } from "node:child_process";
import path from "node:path";
import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";
import { vitePluginVersionMark } from "vite-plugin-version-mark";

const EDITIONS = {
  standard: {
    name: "FF Scouter V2",
    fileName: "base.user.js",
    namespace: "Violentmonkey Scripts",
  },
  beta: {
    name: "FF Scouter V2 beta",
    fileName: "beta.user.js",
    namespace: "xentac-beta",
  },
  xentac: {
    name: "FF Scouter V2 xentac edition",
    fileName: "xentac.user.js",
    namespace: "xentac-edition",
  },
  v3: {
    name: "FF Scouter V3",
    fileName: "v3.user.js",
    namespace: "xentac-v3",
  },
};

function getFallbackVersion(): string {
  try {
    const describe = execSync("git describe --tags --always").toString().trim();
    return describe.startsWith("v") ? describe.slice(1) : describe;
  } catch (_e) {
    return "0.0.0-dev";
  }
}

export default defineConfig(({ mode }) => {
  const isDev =
    mode === "dev" ||
    // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
    process.env["DEV_BUILD"] === "true" ||
    (() => {
      const modeIdx = process.argv.indexOf("--mode");
      return (
        (modeIdx !== -1 && process.argv[modeIdx + 1] === "dev") ||
        process.argv.includes("--mode=dev")
      );
    })();
  // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
  const editionKey = (process.env["BUILD_EDITION"] ||
    "standard") as keyof typeof EDITIONS;
  const edition = EDITIONS[editionKey] || EDITIONS.standard;
  // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
  const version = process.env["BUILD_VERSION"] || getFallbackVersion();
  const userscriptName =
    // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
    process.env["BUILD_NAME"] ||
    (isDev ? `${edition.name} - DEV` : edition.name);

  const isDeprecatedEdition = editionKey === "xentac" || editionKey === "v3";

  return {
    plugins: [
      // For non-deprecated editions, stub out the deprecation-notice feature so
      // it is not bundled at all. The glob in src/features/index.ts discovers it,
      // but this plugin intercepts the resolution and returns a null export instead.
      !isDeprecatedEdition && {
        name: "stub-deprecation-notice",
        enforce: "pre" as const,
        resolveId(source: string) {
          if (source.includes("deprecation-notice")) {
            return "\0deprecated-stub";
          }
        },
        load(id: string) {
          if (id === "\0deprecated-stub") {
            return "export default null;";
          }
        },
      },
      vitePluginVersionMark({
        version: version,
        ifGlobal: true,
        ifLog: true,
        outputFile: true,
      }),
      monkey({
        entry: "src/index.ts",
        build: {
          fileName: isDev
            ? `${edition.fileName.replace(".user.js", "")}-dev.user.js`
            : edition.fileName,
          cssSideEffects: (css) => {
            const style = document.createElement("style");
            style.textContent = css;
            (document.head || document.documentElement).appendChild(style);
          },
        },
        userscript: {
          name: userscriptName,
          author:
            "xentac [3354782], MAVRI [2402357], rDacted [2670953], Weav3r [1853324], Glasnost [1844049]",
          description:
            "Shows the expected Fair Fight score against targets and faction war status",
          copyright: "2026, xentac",
          version: version,
          namespace: edition.namespace,
          license: "GPLv3",
          connect: "ffscouter.com",
          match: ["https://www.torn.com/*"],
          "run-at": "document-start", // This has to be "document-start" to intercept http & ws
          // Fallback React copy for when unsafeWindow doesn't bridge to
          // Torn's own React/ReactDOM (see ADR 0007 and src/shims/react-loader.ts).
          // This is Torn's own react-dom build, so it stays in lockstep with
          // whatever React version the page itself runs. It has no version
          // number in the URL we control -- the hash is Torn's own build
          // artifact name and changes on their deploys, so this needs manual
          // bumping (check a Torn page's <script src> tags matching
          // /builds/react-umd/react-dom.*.production.js) when the fallback
          // path stops working.
          require: [
            "https://www.torn.com/builds/react-umd/react-dom.19.2.0.93c06d8e.production.js",
          ],
        },
      }),
    ],
    resolve: {
      alias: [
        { find: "@ui", replacement: path.resolve(__dirname, "src/ui") },
        { find: "@utils", replacement: path.resolve(__dirname, "src/utils") },
        {
          find: "@features",
          replacement: path.resolve(__dirname, "src/features"),
        },
        {
          find: /^react$/,
          replacement: path.resolve(__dirname, "src/shims/react.ts"),
        },
        {
          find: /^react-dom\/client$/,
          replacement: path.resolve(__dirname, "src/shims/react-dom.ts"),
        },
        {
          find: /^react\/jsx-runtime$/,
          replacement: path.resolve(__dirname, "src/shims/jsx-runtime.ts"),
        },
        {
          find: /^react\/jsx-dev-runtime$/,
          replacement: path.resolve(__dirname, "src/shims/jsx-runtime.ts"),
        },
        // Used only in test setup to get real React without going through the
        // shim (avoids the circular: shim reads unsafeWindow.React = shim).
        {
          find: "@real-react",
          replacement: path.resolve(__dirname, "node_modules/react/index.js"),
        },
        {
          find: "@real-react-dom",
          replacement: path.resolve(
            __dirname,
            "node_modules/react-dom/index.js",
          ),
        },
        {
          find: "@real-react-dom-client",
          replacement: path.resolve(
            __dirname,
            "node_modules/react-dom/client.js",
          ),
        },
      ],
    },
    define: {
      __FF_SCOUTER_EDITION__: JSON.stringify(editionKey),
    },
    build: {
      minify: false,
      sourcemap: isDev ? "inline" : false,
    },
    test: {
      environment: "node",
      setupFiles: ["./src/tests/idbsetup.ts"],
      css: {
        // Resolve CSS Module imports to their literal (unscoped) class names so
        // `styles.foo` returns "foo" in tests, letting `.class` querySelectors
        // and getComputedStyle()-based assertions keep matching the source CSS.
        modules: { classNameStrategy: "non-scoped" },
      },
    },
  };
});
