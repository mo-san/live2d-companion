import { analyzeMetafile, build } from "esbuild";
import { emptyDir } from "fs-extra";
import { readFileSync, writeFileSync } from "node:fs";
import serve, { error as logError, log } from "create-serve";
import browserslistToEsbuild from "browserslist-to-esbuild";

const version = process.env.npm_package_version;
const watchChanges = process.argv.slice(2).includes("--watch");
const doAnalysis = process.env.MODE === "analyze";
const isDevelopment = watchChanges || process.env.NODE_ENV === "development";
const servingRoot = "dist";
const servingPort = 5173;

function combine() {
  const core = readFileSync("Live2dSdk/Core/live2dcubismcore.min.js", { encoding: "utf8" });
  const app = readFileSync(`${servingRoot}/onscreen.js`, { encoding: "utf8" });
  writeFileSync(`${servingRoot}/onscreen.js`, [core, app].join("\n\n"));
}

(async () => {
  await emptyDir(servingRoot);

  // options for esbuild
  const result = await build({
    // prettier-ignore
    entryPoints: [
      "src/loader.ts",
      "src/onscreen.ts",
    ],
    outdir: servingRoot,
    bundle: true,
    charset: "utf8",
    minify: !isDevelopment,
    platform: "browser",
    sourcemap: isDevelopment,
    metafile: doAnalysis,
    target: browserslistToEsbuild(),
    tsconfig: "tsconfig.json",
    write: true,
    watch: watchChanges && {
      onRebuild: (error) => {
        combine();
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

  combine();

  if (doAnalysis) log(await analyzeMetafile(result.metafile));

  // options for 'Serve'
  watchChanges &&
    serve.start({
      port: servingPort,
      root: ".",
    });
})();
