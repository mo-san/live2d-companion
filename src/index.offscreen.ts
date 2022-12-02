import { Config, ErrorIncompatible } from "./Constants";
import { addStyleIfNotExists, clsAppRoot } from "./Styles";
// @ts-expect-error // "esbuild-plugin-inline-worker" loads it
import Worker from "./ModelManager.worker.ts";
import { addDomIfNotExists } from "./WidgetBase";
import { WidgetOffscreen } from "./WidgetOffscreen";

if (!Object.prototype.hasOwnProperty.call(window, "fetch") || !Object.prototype.hasOwnProperty.call(window, "caches")) {
  throw new Error(ErrorIncompatible);
}

export const ModelManagerWorker = Worker();

function companion(options: Config): void {
  addStyleIfNotExists();
  addDomIfNotExists();

  const widget = new WidgetOffscreen(options);

  const CANVAS = document.querySelector(`.${clsAppRoot} canvas`) as HTMLCanvasElement;
  const OffscreenCanvas = CANVAS.transferControlToOffscreen();

  ModelManagerWorker.onmessage = async (event: MessageEvent) => {
    const { task, args } = event.data as { task: string; args: any };

    if (task === "OffscreenCanvas") return widget.init();
    if (task === "load") return await widget.onModelLoad();
    if (task === "touch") return widget.sayWhenTouched(args.part);
    // if (task === "resizeCanvas") return;
    // if (task === "release") return;
    // if (task === "loop") return;
  };

  ModelManagerWorker.postMessage([{ task: "OffscreenCanvas", args: { canvas: OffscreenCanvas } }], [OffscreenCanvas]);
}

declare const companionOption: Config;

companion(companionOption);
