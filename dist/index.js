"use strict";(()=>{var e=Object.prototype.hasOwnProperty.call(window,"OffscreenCanvas")&&new OffscreenCanvas(1,1).getContext("webgl")!=null,n=Object.assign(document.createElement("script"),{src:`https://cdn.jsdelivr.net/gh/mo-san/live2d-companion@0.0.0/dist/${e?"index.offscreen.js":"index.onscreen.js"}`});document.head.append(n);var t=Object.assign(document.createElement("link"),{href:"https://cdn.jsdelivr.net/gh/mo-san/live2d-companion@0.0.0/dist/index.css",rel:"stylesheet"});document.head.append(t);})();