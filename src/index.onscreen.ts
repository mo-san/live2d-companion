import { Config, ErrorIncompatible } from "./Constants";
import { addDomIfNotExists } from "./WidgetBase";
import { WidgetOnscreen } from "./WidgetOnscreen";

if (!Object.prototype.hasOwnProperty.call(window, "fetch") || !Object.prototype.hasOwnProperty.call(window, "caches")) {
  throw new Error(ErrorIncompatible);
}

function companion(options: Config): void {
  addDomIfNotExists();

  const widget = new WidgetOnscreen(options);
  void widget.main();
}

declare const companionOption: Config;

companion(companionOption);
