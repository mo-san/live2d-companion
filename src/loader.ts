export {};
declare const ESBUILD_DEFINE_PATH: string;

const hasOC =
  Object.prototype.hasOwnProperty.call(window, "OffscreenCanvas") &&
  new OffscreenCanvas(1, 1).getContext("webgl") != null; // eslint-disable-line compat/compat

const elem = Object.assign(document.createElement("script"), {
  src: ESBUILD_DEFINE_PATH + `/${hasOC ? "offscreen.js" : "onscreen.js"}`,
});
document.head.append(elem);
