import "src/style.sass";
export {};
declare const ESBUILD_DEFINE_PATH: string;

const hasOC =
  Object.prototype.hasOwnProperty.call(window, "OffscreenCanvas") &&
  new OffscreenCanvas(1, 1).getContext("webgl") != null; // eslint-disable-line compat/compat

const elem = Object.assign(document.createElement("script"), {
  src: ESBUILD_DEFINE_PATH + `/${hasOC ? "index.offscreen.js" : "index.onscreen.js"}`,
});
document.head.append(elem);

const style = Object.assign(document.createElement("link"), {
  href: ESBUILD_DEFINE_PATH + "/index.css",
  rel: "stylesheet",
});
document.head.append(style);
