import { CubismMatrix44 } from "@framework/math/cubismmatrix44";
import { CubismViewMatrix } from "@framework/math/cubismviewmatrix";
import { CANVAS } from "./main";
// import { ModelManager } from "./ModelManager";
import { transformViewX, transformViewY, viewMatrix } from "./Widget";

// export function savePicture(canvas: HTMLCanvasElement): void {
//   function asFile(url: string): void {
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = `image_${Math.floor(Math.random() * 1000)}.png`;
//     a.click();
//   }
//
//   function asImage(url: string): void {
//     const newImg = document.createElement("img");
//     newImg.onload = () => URL.revokeObjectURL(url);
//     newImg.src = url;
//     document.body.appendChild(newImg);
//   }
//
//   canvas.toBlob((blob) => {
//     if (blob == null) return;
//     const url = URL.createObjectURL(blob);
//     asFile(url);
//     asImage(url);
//   }, "image/png");
// }

/**
 * Live2D モデルの視点の原点を探すための関数
 * setDrag(0, 0) になる点。
 */
// function findOrigin() {
//   function findMinimumPair(minX: number, maxX: number, minY: number, maxY: number): number[] {
//     const viewMinX = transformViewX(minX);
//     const viewMaxX = transformViewX(maxX);
//     const viewMinY = transformViewY(minY);
//     const viewMaxY = transformViewY(maxY);
//     let index = -1;
//     const minSum = [
//       Math.abs(viewMinX + viewMinY),
//       Math.abs(viewMinX + viewMaxY),
//       Math.abs(viewMaxX + viewMinY),
//       Math.abs(viewMaxX + viewMaxY),
//     ].reduce((previousValue, currentValue, currentIndex) => {
//       if (previousValue <= currentValue) return previousValue;
//       index = currentIndex;
//       return currentValue;
//     }, Infinity);
//     return [index, minSum];
//   }
//
//   function calc(minX: number, maxX: number, minY: number, maxY: number): number[] {
//     const [index, minSum] = findMinimumPair(minX, maxX, minY, maxY);
//     console.log(minSum);
//
//     if (minSum <= 1 / 100) {
//       if (index === 0) return [minX, minY];
//       if (index === 1) return [minX, maxY];
//       if (index === 2) return [maxX, minY];
//       if (index === 3) return [maxX, maxY];
//       return [0, 0];
//     }
//
//     if (index === 0) return calc(minX, (minX + maxX) / 2, minY, (minY + maxY) / 2);
//     if (index === 1) return calc(minX, (minX + maxX) / 2, (minY + maxY) / 2, maxY);
//     if (index === 2) return calc((minX + maxX) / 2, maxX, minY, (minY + maxY) / 2);
//     if (index === 3) return calc((minX + maxX) / 2, maxX, (minY + maxY) / 2, maxY);
//     return [0, 0];
//   }
//
//   const origin = calc(0, window.innerWidth, 0, window.innerHeight);
//   console.info(origin);
//   document.body.insertAdjacentHTML(
//     "beforeend",
//     `<div style="position:fixed; top: ${origin[1]}px; left: ${origin[0]}px; width: 10px; height: 10px; background-color: cyan;"></div>`
//   );
// }

export function initializeViewMatrix(): [a: CubismViewMatrix, b: CubismMatrix44] {
  const viewMatrix = new CubismViewMatrix();
  const { width, height } = CANVAS;
  // const ratio = Math.max(width, height) / Math.min(width, height);

  // デバイスに対応する画面の範囲。
  // 左端のX、右端のX、下端のY、上端のY
  // viewMatrix.setScreenRect(-ratio, ratio, -1, 1);
  // viewMatrix.scale(View.Scale.Default, View.Scale.Default);
  // viewMatrix.scale(0.5, 0.5);
  // viewMatrix.adjustTranslate(10, 0);
  // viewMatrix.translateRelative(innerWidth / width - 1 + 0.5, -1 * (innerHeight / height - 1 + 0.5)); // 300 x 300
  // viewMatrix.translateRelative(2.9, -2.4); // 250 x 250
  // const relative = ((innerWidth - width) / innerWidth) * 2 - 1;

  // const dimension = innerWidth > innerHeight ? ratio : 1 / ratio; // <- ???
  // if (innerHeight < innerWidth) {
  //   deviceToScreenMatrix.scale(dimension / innerWidth, -dimension / innerWidth);
  // } else {
  //   deviceToScreenMatrix.scale(dimension / innerHeight, -dimension / innerHeight);
  // }
  const deviceToScreenMatrix = new CubismMatrix44();
  deviceToScreenMatrix.scale(2 / width, -2 / height);
  deviceToScreenMatrix.translateRelative(-width / 2, -height / 2);
  deviceToScreenMatrix.translateRelative(-(innerWidth - width), -(innerHeight - height));
  // deviceToScreenMatrix.translateRelative(0, height / width);
  // const left: number = -ratio;
  // const right: number = ratio;
  // const top = 1;
  // const bottom = -1;
  // deviceToScreenMatrix.loadIdentity();
  // if (width > height) {
  //   const screenW: number = Math.abs(right - left);
  //   deviceToScreenMatrix.scaleRelative(screenW / width, -screenW / width);
  // } else {
  //   const screenH: number = Math.abs(top - bottom);
  //   deviceToScreenMatrix.scaleRelative(screenH / height, -screenH / height);
  // }
  // deviceToScreenMatrix.translateRelative(-width * 0.5, -height * 0.5);

  // // 表示範囲の設定
  // viewMatrix.setMaxScale(View.Scale.Max);
  // viewMatrix.setMinScale(View.Scale.Min);
  //
  // // 表示できる最大範囲
  // viewMatrix.setMaxScreenRect(
  //   View.Logical.Max.left,
  //   View.Logical.Max.right,
  //   View.Logical.Max.bottom,
  //   View.Logical.Max.top
  // );

  return [viewMatrix, deviceToScreenMatrix];
}

export function retranslateViewMatrix(event: PointerEvent): void {
  // const { x, y, top, left, bottom, right, width, height } = elemAppRoot.getBoundingClientRect();
  // const { movementX, movementY } = event;
  // if (
  //   top + movementY < 0 ||
  //   left + movementX < 0 ||
  //   window.innerHeight < bottom + movementY ||
  //   window.innerWidth < right + movementX
  // )
  //   return;
  // viewMatrix.translateRelative(movementX / width, movementY / -height);
  const viewX: number = transformViewX(event.x);
  const viewY: number = transformViewY(event.y);
  viewMatrix.translate(viewX, viewY);
}

// export function findHeadArea(modelManager: ModelManager | undefined): void {
//   if (modelManager == null) return;
//
//   const head: Array<[x: number, y: number]> = [];
//   const body: Array<[x: number, y: number]> = [];
//
//   for (let x = 0; x < innerWidth; x += 6) {
//     for (let y = 0; y < innerHeight; y += 6) {
//       const viewX: number = transformViewX(x);
//       const viewY: number = transformViewY(y);
//       if (modelManager.didHitHead(viewX, viewY)) {
//         head.push([x, y]);
//       }
//       if (modelManager.didHitBody(viewX, viewY)) {
//         body.push([x, y]);
//       }
//     }
//   }
//
//   if (document.body.querySelector("style.headArea") == null) {
//     elemDebug!.insertAdjacentHTML(
//       "beforebegin",
//       `<style class="headArea">
// .headArea span {
// position: fixed;
// width: 2px;
// height: 2px;
// }
// .headArea span.head {
// background-color: cyan;
// }
// .headArea span.body {
// background-color: coral;
// }
// </style>`
//     );
//   }
//
//   const elemHeadArea = elemDebug!.querySelector(".headArea")!;
//   elemHeadArea.innerHTML = "";
//   head.forEach(([x, y]) => {
//     // noinspection CssInvalidPropertyValue
//     elemHeadArea.insertAdjacentHTML("beforeend", `<span class="head" style="top: ${y}px; left: ${x}px;"></span>`);
//   });
//   body.forEach(([x, y]) => {
//     // noinspection CssInvalidPropertyValue
//     elemHeadArea.insertAdjacentHTML("beforeend", `<span class="body" style="top: ${y}px; left: ${x}px;"></span>`);
//   });
// }
