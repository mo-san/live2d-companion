import { Config, WorkerUrl } from "./Constants";
import {
  clsAppRoot,
  clsContent,
  clsCredit,
  clsHider,
  clsLanguage,
  clsMenuButton,
  clsMessage,
  clsRevealer,
  clsSheet,
  clsSwitcher,
  clsToast,
  clsToggleMessage,
  CssString,
} from "./Styles";
import { Widget } from "./Widget";

if (!Object.prototype.hasOwnProperty.call(window, "fetch") || !Object.prototype.hasOwnProperty.call(window, "caches")) {
  throw new Error(
    `[Live2D-Companion] This browser does not support APIs for the app to run. Please consider using another newer browser.`
  );
}

document.head.insertAdjacentHTML("beforeend", CssString);

document.body.insertAdjacentHTML(
  "beforeend",
  `<div class="${clsAppRoot}">
  <div class="${clsContent}" style="display: none;">
    <canvas></canvas>
    <div class="${clsMessage}"></div>
    <button class="${clsMenuButton}"><div></div></button>
    <div class="${clsSheet}">
      <a class="${clsSwitcher}"><p></p></a>
      <a class="${clsHider}"><p></p></a>
      <a class="${clsToggleMessage}"><p></p></a>
      <div class="${clsLanguage}">
        <p></p>
        <select></select>
        <div class="${clsToast}">Saved!</div>
      </div>
      <div class="${clsCredit}"><p></p><ul>
      <li>Live2D Cubism SDK</li>
      <li>Live2D Open Software License Agreement</li>
      <li>Live2D Proprietary Software License Agreement</li>
      </ul></div>
    </div>
  </div>
  <a class="${clsRevealer}"><p></p></a>
</div>`
);

export const elemAppRoot = document.querySelector(`.${clsAppRoot}`) as HTMLDivElement;

export const CANVAS = elemAppRoot.querySelector("canvas") as HTMLCanvasElement;

export const ModelManagerWorker = new Worker(WorkerUrl);

export const elemContent = elemAppRoot.querySelector(`.${clsContent}`) as HTMLDivElement;
export const elemMessage = elemAppRoot.querySelector(`.${clsMessage}`) as HTMLDivElement;
export const elemMenuButton = elemAppRoot.querySelector(`.${clsMenuButton}`) as HTMLButtonElement;
export const elemSheet = elemAppRoot.querySelector(`.${clsSheet}`) as HTMLDivElement;
export const elemSwitcher = elemAppRoot.querySelector(`.${clsSwitcher}`) as HTMLAnchorElement;
export const elemHider = elemAppRoot.querySelector(`.${clsHider}`) as HTMLAnchorElement;
export const elemToggleMessage = elemAppRoot.querySelector(`.${clsToggleMessage}`) as HTMLAnchorElement;
export const elemCredit = elemAppRoot.querySelector(`.${clsCredit}`) as HTMLDivElement;
export const elemLanguage = elemAppRoot.querySelector(`.${clsLanguage}`) as HTMLDivElement;
export const elemLanguageOptions = elemAppRoot.querySelector(`.${clsLanguage} select`) as HTMLSelectElement;
export const elemToast = elemAppRoot.querySelector(`.${clsToast}`) as HTMLDivElement;
export const elemRevealer = elemAppRoot.querySelector(`.${clsRevealer}`) as HTMLAnchorElement;

function companion(options: Config): void {
  const widget = new Widget(options);

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
      return;
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

declare global {
  // noinspection JSUnusedGlobalSymbols
  interface Window {
    companion: (options: Config) => void;
  }
}

window.companion = companion;
