import { CubismCoreUrl } from "./Constants";
import { ModelManager } from "./ModelManager";

// @ts-expect-error
self.importScripts(CubismCoreUrl);

let CANVAS: OffscreenCanvas;
let modelManager: ModelManager | undefined;

self.onmessage = async ({ data }: MessageEvent) => {
  for (const { task, args } of data as Array<{ task: string; args: any }>) {
    if (task === "OffscreenCanvas") {
      CANVAS = args.canvas;
      self.postMessage({ task });
      continue;
    }
    if (task === "resizeCanvas") {
      resizeCanvas(args.width, args.height);
      continue;
    }
    if (task === "load") {
      const glContext = CANVAS.getContext("webgl") as WebGLRenderingContext;
      modelManager = await ModelManager.init(args.model, args.version, glContext);
      await modelManager.load();
      self.postMessage({ task });
      continue;
    }
    if (task === "look") {
      modelManager?.setDragging(args.viewX, args.viewY);
      continue;
    }
    if (task === "touch") {
      const part = await modelManager?.touchAt(args.viewX, args.viewY);
      if (part != null) self.postMessage({ task, args: { part } });
      continue;
    }
    if (task === "release") {
      modelManager?.release();
      modelManager = undefined;
      continue;
    }
    if (task === "loop") {
      await modelManager?.loop(0);
    }
  }
};

function resizeCanvas(width: number, height: number): void {
  CANVAS.width = width;
  CANVAS.height = height;
}
