import { execSync } from "node:child_process";
import path from "node:path";
import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";
import { vitePluginVersionMark } from "vite-plugin-version-mark";

const EDITIONS = {
  standard: {
    name: "FF Scouter V2",
    fileName: "base.user.js",
    namespace: "xentac",
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
    },
  };
});
