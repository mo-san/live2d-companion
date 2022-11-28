import { analyzeMetafile, build } from "esbuild";
import { copy, emptyDir } from "fs-extra";
import serve, { error as logError, log } from "create-serve";
import browserslistToEsbuild from 'browserslist-to-esbuild'

const watchChanges = process.argv.slice(2).includes("--watch");
const doAnalysis = process.env.MODE === "analyze";
const isDevelopment = watchChanges || process.env.NODE_ENV === "development";
const servingRoot = "dist";
const servingPort = 5173;

async function copyAssets() {
  [
    ["index.html", `${servingRoot}/index.html`],
    ["assets", `${servingRoot}/assets`],
  ].map(async ([src, dest]) => await copy(src, dest));
}

(async () => {
  await emptyDir(servingRoot);
  await copyAssets();

  // options for esbuild
  const result = await build({
    entryPoints: [
      "src/index.ts",
    ],
    outdir: servingRoot,
    bundle: true,
    charset: "utf8",
    minify: !isDevelopment,
    platform: "browser",
    sourcemap: true,
    metafile: doAnalysis,
    target: browserslistToEsbuild(),
    tsconfig: "tsconfig.json",
    write: true,
    watch: watchChanges && {
      onRebuild: (error) => {
        serve.update();
        error ? logError("× Failed") : log(`[${new Date().toLocaleString()}] ✓ Updated`);
      },
    },
  });

  if (doAnalysis) log(await analyzeMetafile(result.metafile));

  // options for 'Serve'
  watchChanges &&
    serve.start({
      port: servingPort,
      root: `${servingRoot}`,
    });
})();
