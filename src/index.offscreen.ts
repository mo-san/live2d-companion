import { Config, ErrorIncompatible } from "./Constants";
// @ts-expect-error // "esbuild-plugin-inline-worker" loads it
import CanvasWorker from "./ModelManager.worker.ts";
import { addDomIfNotExists } from "./WidgetBase";
import { WidgetOffscreen } from "./WidgetOffscreen";

if (!Object.prototype.hasOwnProperty.call(window, "fetch") || !Object.prototype.hasOwnProperty.call(window, "caches")) {
  throw new Error(ErrorIncompatible);
}

export const ModelManagerWorker: Worker = CanvasWorker();

function companion(options: Config): void {
  addDomIfNotExists();

  const widget = new WidgetOffscreen(options);

  ModelManagerWorker.onmessage = async (event: MessageEvent) => {
    const { task, args } = event.data as { task: string; args: any };

    if (task === "load") return await widget.onModelLoad();
    if (task === "touch") return widget.sayWhenTouched(args.part);
  };

  widget.init();
}

declare const companionOption: Config;

companion(companionOption);
