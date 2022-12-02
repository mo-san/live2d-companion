import { Config, ErrorIncompatible } from "./Constants";
import { addStyleIfNotExists, clsAppRoot } from "./Styles";
import { addDomIfNotExists, Widget } from "./Widget";
// @ts-ignore
import Worker from "./webgl.worker.ts";

if (!Object.prototype.hasOwnProperty.call(window, "fetch") || !Object.prototype.hasOwnProperty.call(window, "caches")) {
  throw new Error(ErrorIncompatible);
}

export const ModelManagerWorker = Worker();

function companion(options: Config): void {
  addStyleIfNotExists();
  addDomIfNotExists();

  const widget = new Widget(options);

  const CANVAS = document.querySelector(`.${clsAppRoot} canvas`) as HTMLCanvasElement;
  const OffscreenCanvas = CANVAS.transferControlToOffscreen();

  ModelManagerWorker.onmessage = async (event: MessageEvent) => {
    const { task, args } = event.data as { task: string; args: any };

    if (task === "OffscreenCanvas") {
      widget.init();
      return;
    }
    // if (task === "resizeCanvas") {
    //   return;
    // }
    if (task === "load") {
      widget.refreshViewpointMatrix(widget.modelCoordInitial);
      widget.bringBackAppIntoWindow();
      await widget.main();
      return;
    }
    if (task === "touch") {
      widget.sayWhenTouched(args.part);
    }
    // if (task === "release") {
    //   return;
    // }
    // if (task === "loop") {
    //   return;
    // }
  };

  ModelManagerWorker.postMessage([{ task: "OffscreenCanvas", args: { canvas: OffscreenCanvas } }], [OffscreenCanvas]);
}

declare const companionOption: Config;

companion(companionOption);
