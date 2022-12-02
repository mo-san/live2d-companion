import { Config, ErrorIncompatible } from "./Constants";
import { addStyleIfNotExists } from "./Styles";
import { addDomIfNotExists, Widget } from "./Widget";

if (!Object.prototype.hasOwnProperty.call(window, "fetch") || !Object.prototype.hasOwnProperty.call(window, "caches")) {
  throw new Error(ErrorIncompatible);
}

function companion(options: Config): void {
  addStyleIfNotExists();
  addDomIfNotExists();

  const widget = new Widget(options);
  void widget.main();
}

declare const companionOption: Config;

companion(companionOption);
