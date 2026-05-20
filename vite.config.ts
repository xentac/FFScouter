import path from "node:path";
import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";
import { vitePluginVersionMark } from "vite-plugin-version-mark";

export default defineConfig(({ mode }) => {
  const isDev = mode === "dev";

  return {
    plugins: [
      vitePluginVersionMark({
        command: "git describe --tags --dirty --always",
        ifGlobal: true,
        ifLog: true,
        outputFile: true,
      }),
      monkey({
        entry: "src/index.ts",
        build: {
          fileName: isDev ? "base-dev.user.js" : "base.user.js",
        },
        userscript: {
          name: "FF Scouter V2",
          author:
            "xentac [3354782], MAVRI [2402357], rDacted [2670953], Weav3r [1853324], Glasnost [1844049]",
          description:
            "Shows the expected Fair Fight score against targets and faction war status",
          copyright: "2026, xentac",
          version: "0.0.0",
          namespace: "xentac",
          license: "GPLv3",
          connect: "ffscouter.com",
          match: ["https://www.torn.com/*"],
          "run-at": "document-start", // This has to be "document-start" to intercept http & ws
        },
      }),
    ],
    resolve: {
      alias: {
        "@ui": path.resolve(__dirname, "src/ui"),
        "@utils": path.resolve(__dirname, "src/utils"),
        "@features": path.resolve(__dirname, "src/features"),
      },
    },
    build: {
      minify: false,
      sourcemap: isDev ? "inline" : false,
    },
    test: {
      environment: "node",
      setupFiles: ["./src/tests/idbsetup.ts"],
      server: {
        deps: {
          inline: ["jsdom", "parse5"],
        },
      },
    },
  };
});
