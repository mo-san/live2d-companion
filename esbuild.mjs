import { analyzeMetafile, build } from "esbuild";
import { emptyDir } from "fs-extra";
import { readFileSync, writeFileSync } from "node:fs";
import serve, { error as logError, log } from "create-serve";
import browserslistToEsbuild from "browserslist-to-esbuild";
import inlineWorkerPlugin from "esbuild-plugin-inline-worker";
import { sassPlugin } from "esbuild-sass-plugin";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const version = process.env.npm_package_version;
const watchChanges = process.argv.slice(2).includes("--watch");
const doAnalysis = process.env.MODE === "analyze";
const isDevelopment = watchChanges || process.env.NODE_ENV === "development";
const servingRoot = "dist";
const servingPort = 5173;
const __dirname = dirname(fileURLToPath(import.meta.url));

function concatCubismCore() {
  const core = readFileSync("Live2dSdk/Core/live2dcubismcore.min.js", { encoding: "utf8" });
  const app = readFileSync(`${servingRoot}/index.onscreen.js`, { encoding: "utf8" });
  writeFileSync(`${servingRoot}/index.onscreen.js`, [core, app].join("\n\n"));
}

(async () => {
  await emptyDir(servingRoot);

  // options for esbuild
  const result = await build({
    // prettier-ignore
    entryPoints: [
      "src/index.ts",
      "src/index.onscreen.ts",
      "src/index.offscreen.ts",
    ],
    outdir: servingRoot,
    bundle: true,
    charset: "utf8",
    minify: !isDevelopment,
    platform: "browser",
    sourcemap: isDevelopment,
    metafile: doAnalysis,
    loader: { ".svg": "base64" },
    // prettier-ignore
    plugins: [
      inlineWorkerPlugin({
        format: "iife",
        minify: !isDevelopment,
        target: browserslistToEsbuild(),
      }),
      sassPlugin({
        // needed to use this plugin with pnpm
        loadPaths: [
          resolve(__dirname, "./node_modules"),
          resolve(__dirname, "./node_modules/.pnpm/node_modules"),
        ]
      }),
    ],
    target: browserslistToEsbuild(),
    tsconfig: "tsconfig.json",
    write: true,
    watch: watchChanges && {
      onRebuild: (error) => {
        concatCubismCore();
        serve.update();
        error ? logError("× Failed") : log(`[${new Date().toLocaleString()}] ✓ Updated`);
      },
    },
    define: {
      ESBUILD_DEFINE_PATH: isDevelopment
        ? `"${servingRoot}"`
        : `"https://cdn.jsdelivr.net/gh/mo-san/live2d-companion@${version}/dist"`,
    },
  });

  concatCubismCore();

  if (doAnalysis) log(await analyzeMetafile(result.metafile));

  // options for 'Serve'
  watchChanges &&
    serve.start({
      port: servingPort,
      root: ".",
    });
})();
