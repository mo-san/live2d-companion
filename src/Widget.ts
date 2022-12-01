import { CubismMatrix44 } from "@framework/math/cubismmatrix44";
import { CubismViewMatrix } from "@framework/math/cubismviewmatrix";
import {
  AppDisappearingDurationSeconds,
  AppRevealingDurationSeconds,
  Config,
  ConfigNotNull,
  DefaultConfig,
  Dimension,
  DraggableType,
  ErrorInvalidPath,
  ErrorNoModel,
  HitAreaName,
  HitTestAreasNotNull,
  LanguageValueUnset,
  MenuRevealingDurationSeconds,
  MessageAppearDelaySeconds,
  MessageCategoryDatetime,
  MessageCategoryGeneral,
  MessageCategoryTouch,
  MessageDurationSeconds,
  MessageLanguageDefault,
  MessageLanguageStorageName,
  MessagePosition,
  MessagePriority,
  MessageSchema,
  MessageSwingingSeconds,
  MessageVersion,
  ModelInfo,
  ModelLocationNotNull,
  ModelPosition,
  MotionGroup,
  ThresholdAppRootMini,
} from "./Constants";
import { getUiStrings } from "./Localization";
import { getFormattedDate, getUserPrefLanguages, isLocalStorageAvailable, loadMessagesFromYaml } from "./Messages";
import {
  clsAppRoot,
  clsAppRootMini,
  clsContent,
  clsCredit,
  clsDragging,
  clsHider,
  clsLanguage,
  clsMenuButton,
  clsMessage,
  clsMessageVisible,
  clsRevealer,
  clsSheet,
  clsSwitcher,
  clsToast,
  clsToastVisible,
  clsToggleMessage,
} from "./Styles";
import { ModelManagerWorker } from "./index";

export function addDomIfNotExists(): void {
  const domString = `<div class="${clsAppRoot}">
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
</div>`;

  if (document.querySelector(`.${clsAppRoot}`) == null) {
    document.body.insertAdjacentHTML("beforeend", domString);
  }
}

// ------------------------------
// ------------------------------
/**
 *
 */
function filePathToJsonPath(filePath: string): string {
  filePath = filePath.replace(/[?#].*$/, "");

  if (filePath.endsWith(".model3.json")) return filePath;

  if (filePath.endsWith(".zip")) {
    const modelName = filePath.replace(/^.*?\/?(?<baseName>[^/]+)\.zip$/, "$1");
    return `${modelName}.model3.json`;
  }
  // folder specified
  // e.g. 'models/Mao' turns into 'models/Mao/Mao.model3.json'
  return filePath.replace(/(?<parentDir>^.*?(?<dirName>[^/]+))\/?$/, "$1/$2.model3.json");
}

/**
 *
 */
function getModelLocation(fileLocation: string | ModelInfo): ModelLocationNotNull {
  const hitTest: HitTestAreasNotNull = {
    head: { name: HitAreaName.Head },
    body: { name: HitAreaName.Body, group: MotionGroup.TapBody },
  };
  const baseObj: ModelLocationNotNull = { jsonPath: "", zipPath: "", messages: [], hitTest };

  if (typeof fileLocation !== "string") {
    fileLocation.hitTest = Object.assign(hitTest, fileLocation.hitTest);
    return Object.assign(baseObj, fileLocation) as ModelLocationNotNull;
  }

  // strip query parameters
  fileLocation = fileLocation.replace(/[?#].*$/, "");

  if (fileLocation.endsWith(".model3.json")) {
    baseObj.jsonPath = fileLocation;
    return baseObj;
  }

  if (fileLocation.endsWith(".zip")) {
    baseObj.jsonPath = filePathToJsonPath(fileLocation);
    baseObj.zipPath = fileLocation;
    return baseObj;
  }

  console.error(ErrorInvalidPath);
  return baseObj;
}

function clamp(target: number, min: number, max: number): number {
  return Math.min(Math.max(min, target), max);
}

/**
 * Manages widget itself.
 */
export class Widget {
  models: ModelLocationNotNull[];
  currentModelIndex: number;
  modelPosition: keyof typeof ModelPosition;
  slideInFrom: keyof typeof Dimension;
  modelVisible: boolean;
  modelCoordInitial: { x: number; y: number };
  modelDistance: { x: number; y: number };
  messages?: MessageSchema;
  private readonly _messages: string | string[];
  messagePosition: keyof typeof MessagePosition;
  messageVisible: boolean;
  useCache: boolean;
  draggable: DraggableType;
  version: string;
  private pointerCoord: { x: number; y: number } = { x: 0, y: 0 };
  private baseWeightArray: number[] = [];
  deviceToScreenMatrix = new CubismMatrix44();
  viewMatrix = new CubismViewMatrix();
  /** A number representing the handler for 'setTimeout' or 'setInterval' */
  MessageTimer: number = 0;

  elemAppRoot = document.querySelector(`.${clsAppRoot}`) as HTMLDivElement;
  elemContent = this.elemAppRoot.querySelector(`.${clsContent}`) as HTMLDivElement;
  elemMessage = this.elemAppRoot.querySelector(`.${clsMessage}`) as HTMLDivElement;
  elemMenuButton = this.elemAppRoot.querySelector(`.${clsMenuButton}`) as HTMLButtonElement;
  elemSheet = this.elemAppRoot.querySelector(`.${clsSheet}`) as HTMLDivElement;
  elemSwitcher = this.elemAppRoot.querySelector(`.${clsSwitcher}`) as HTMLAnchorElement;
  elemHider = this.elemAppRoot.querySelector(`.${clsHider}`) as HTMLAnchorElement;
  elemToggleMessage = this.elemAppRoot.querySelector(`.${clsToggleMessage}`) as HTMLAnchorElement;
  elemCredit = this.elemAppRoot.querySelector(`.${clsCredit}`) as HTMLDivElement;
  elemLanguage = this.elemAppRoot.querySelector(`.${clsLanguage}`) as HTMLDivElement;
  elemLanguageOptions = this.elemAppRoot.querySelector(`.${clsLanguage} select`) as HTMLSelectElement;
  elemToast = this.elemAppRoot.querySelector(`.${clsToast}`) as HTMLDivElement;
  elemRevealer = this.elemAppRoot.querySelector(`.${clsRevealer}`) as HTMLAnchorElement;

  constructor(userConfig: Config) {
    // update default settings with user defined config
    const config: ConfigNotNull = Object.assign(DefaultConfig, userConfig);

    this.resizeApp(config);

    if (config.models.length === 0) console.error(ErrorNoModel);
    this.models = config.models.map(getModelLocation);
    this.currentModelIndex = 0;
    this.modelPosition = config.modelPosition;
    this.version = String(config.version);

    this.modelVisible = config.modelVisible;
    if (this.modelVisible) {
      Object.assign(this.elemContent.style, { display: null });
    } else {
      this.elemRevealer.classList.add(this.modelPosition);
      this.elemRevealer.style.display = "grid";
    }

    this._messages = config.messages;
    this.messagePosition = config.messagePosition.toLowerCase() as keyof typeof MessagePosition;
    this.messageVisible = config.messageVisible;

    this.useCache = config.useCache;
    this.draggable = config.draggable;

    this.fillUiWithUserLanguage();

    this.slideInFrom = config.slideInFrom;
    this.modelDistance = {
      x: Math.max(0, config.modelDistance.x),
      y: Math.max(0, config.modelDistance.y),
    };
    this.modelCoordInitial = this.calcInitialAppCoord();
    Object.assign(this.elemAppRoot.style, this.calcInitialPosition());
  }

  init(releaseInstance: boolean = false) {
    const { clientWidth: width, clientHeight: height } = elemAppRoot;

    ModelManagerWorker.postMessage([
      { task: "resizeCanvas", args: { width, height } },
      releaseInstance && { task: "release" }, // release resources
      { task: "load", args: { model: this.models[this.currentModelIndex], version: this.version } },
    ]);
  }

  async main(): Promise<void> {
    this.messages = await this.loadMesseges(this._messages);
    this.elemMessage.classList.add(`${clsMessage}-${this.messagePosition}`);
    this.baseWeightArray = Array(this.messages.general.length).fill(1);

    if (this.modelVisible) {
      if (this.messageVisible && this._messages.length > 0) {
        setTimeout(() => this.startSpeaking(), MessageAppearDelaySeconds * 1000);
      }
      this.appear();
    }
    this.registerEvents();

    ModelManagerWorker.postMessage([{ task: "loop", args: {} }]);
  }

  registerEvents(): void {
    window.addEventListener("resize", (_event) => this.onWindowResize());
    document.addEventListener("pointermove", (event) => this.onPointerMove(event));
    document.addEventListener("pointerleave", (event) => this.onPointerLeave(event));
    document.addEventListener("pointerup", (event) => this.onPointerUp(event));
    this.elemAppRoot.addEventListener("pointerup", (event) => this.onPointerUp(event));

    this.elemMenuButton.addEventListener("pointerup", (event) => this.toggleMenu(event));
    this.elemSwitcher.addEventListener("pointerup", (event) => this.switchModel(event));
    this.elemHider.addEventListener("pointerup", (event) => this.disappear(event));
    this.elemRevealer.addEventListener("pointerup", (event) => this.appear(event));
    this.elemToggleMessage.addEventListener("pointerup", (event) => this.toggleMessage(event));

    if (this.draggable !== false) {
      this.elemAppRoot.addEventListener("pointerdown", (event) => this.onPointerDown(event));
    }
  }

  resizeApp({ width, height }: { width: number; height: number }): void {
    if (width < ThresholdAppRootMini || height < ThresholdAppRootMini) {
      this.elemAppRoot.classList.add(clsAppRootMini);
    }
    width = clamp(width, 0, window.innerWidth);
    height = clamp(height, 0, window.innerHeight);
    this.elemAppRoot.style.width = `${width}px`;
    this.elemAppRoot.style.height = `${height}px`;
  }

  switchModel(event: PointerEvent): void {
    // ignore clicks or touches except for the left button click or the primary touch
    if (event.button !== 0) return;

    this.toggleMenu(event);
    this.currentModelIndex = (this.currentModelIndex + 1) % this.models.length;

    this.init(true);
  }

  appear(event?: PointerEvent): void {
    // ignore clicks or touches except for the left button click or the primary touch
    if (event != null && event.button !== 0) return;

    // Coding like "element.style.display = null" can cause a type error. So this is a workaround.
    Object.assign(this.elemContent.style, { display: null });
    Object.assign(this.elemRevealer.style, { display: null });

    const keyframes = this.calcAppearingKeyframes();
    const options: KeyframeAnimationOptions = {
      duration: AppRevealingDurationSeconds * 1000,
      easing: "cubic-bezier(.13,1.22,.87,-0.56)", // https://cubic-bezier.com
      // 'fill: "forwards"' can be used to stop movement at the last keyframe, but then the element cannot be moved by mouse.
    };
    const anim = this.elemAppRoot.animate(keyframes, options);

    // When the movement is finished, we stick the element in place.
    const [what, to] = Object.entries(keyframes)[0];
    anim.addEventListener("finish", () => {
      Object.assign(this.elemAppRoot.style, { [what]: to[to.length - 1] });
      this.elemMenuButton.style.display = "initial";
    });
  }

  disappear(event: PointerEvent): void {
    // ignore clicks or touches except for the left button click or the primary touch
    if (event.button !== 0) return;

    this.toggleMenu(event);
    this.stopSpeaking();

    const move = this.calcDisappearingKeyframes();
    const keyframes: Keyframe[] | PropertyIndexedKeyframes = {
      ...move,
      opacity: ["1", "0"],
      transform: ["scale(1)", "scale(0.2)"],
    };
    const options: KeyframeAnimationOptions = {
      duration: AppDisappearingDurationSeconds * 1000,
      // easing: "cubic-bezier(0.12, 1.4, 0.72, -0.28)",
      easing: "ease-out",
    };
    const anim = this.elemAppRoot.animate(keyframes, options);

    // When the movement is finished, we stick the element at the position.
    const goal = Object.entries(move).reduce(
      (prev, [what, [_from, to]]) => Object.assign(prev, { [what]: to }),
      Object.create(null)
    );

    anim.addEventListener("finish", () => {
      Object.assign(this.elemAppRoot.style, goal);
      this.elemContent.style.display = "none";
      this.elemRevealer.classList.add(this.modelPosition);
      this.elemRevealer.style.display = "grid";
    });
  }

  onWindowResize(_event?: UIEvent): void {
    const { clientWidth: width, clientHeight: height } = this.elemAppRoot;

    ModelManagerWorker.postMessage([{ task: "resizeCanvas", args: { width, height } }]);
    this.refreshViewpointMatrix(this.elemAppRoot.getBoundingClientRect());
    this.bringBackAppIntoWindow();
  }

  bringBackAppIntoWindow(): void {
    const { top, left, width, height } = this.elemAppRoot.getBoundingClientRect();
    const { innerWidth, innerHeight } = window;

    if (!(top < 0 || left < 0 || innerHeight < top + height || innerWidth < left + width)) return;

    if (top < 0) this.elemAppRoot.style.top = `0`;
    if (left < 0) this.elemAppRoot.style.left = `0`;
    if (innerHeight < top + height) this.elemAppRoot.style.top = `${innerHeight - height}px`;
    if (innerWidth < left + width) this.elemAppRoot.style.left = `${innerWidth - width}px`;
  }

  onPointerDown(event: PointerEvent): void {
    // ignore when touched with more than one fingers
    if (event instanceof TouchEvent && event.targetTouches.length > 1) return;

    if ((event.target as HTMLElement).tagName === "CANVAS") this.elemAppRoot.classList.add(`${clsDragging}`);

    const clientX = event instanceof TouchEvent ? event.targetTouches[0].clientX : event.clientX;
    const clientY = event instanceof TouchEvent ? event.targetTouches[0].clientY : event.clientY;
    const { top, left } = this.elemAppRoot.getBoundingClientRect();
    this.pointerCoord.x = clientX - left;
    this.pointerCoord.y = clientY - top;
    this.elemAppRoot.style.top = `${top}px`;
    this.elemAppRoot.style.left = `${left}px`;
  }

  onPointerMove(event: PointerEvent): void {
    const viewX: number = this.transformViewX(event.x);
    const viewY: number = this.transformViewY(event.y);

    ModelManagerWorker.postMessage([
      { task: "look", args: { viewX, viewY } },
      { task: "touch", args: { viewX, viewY } },
    ]);

    if (!this.elemAppRoot.classList.contains(clsDragging)) return;

    event.preventDefault();
    if (this.draggable === "x") {
      this.elemAppRoot.style.left = `${event.clientX - this.pointerCoord.x}px`;
    } else if (this.draggable === "y") {
      this.elemAppRoot.style.top = `${event.clientY - this.pointerCoord.y}px`;
    } else if (this.draggable) {
      this.elemAppRoot.style.left = `${event.clientX - this.pointerCoord.x}px`;
      this.elemAppRoot.style.top = `${event.clientY - this.pointerCoord.y}px`;
    }

    this.bringBackAppIntoWindow();
  }

  onPointerLeave(_event: PointerEvent): void {
    ModelManagerWorker.postMessage([{ task: "look", args: { viewX: 0, viewY: 0 } }]);
  }

  onPointerUp(_event: PointerEvent): void {
    if (this.elemAppRoot.classList.contains(clsDragging)) {
      this.elemAppRoot.classList.remove(clsDragging);
      this.refreshViewpointMatrix(this.elemAppRoot.getBoundingClientRect());
    }
  }

  /** Converts X position in device coordinates into the viewport coordinates */
  transformViewX(deviceX: number): number {
    // coordinates are converted into logical ones
    const screenX = this.deviceToScreenMatrix.transformX(deviceX);
    // the value after the scaling and parallel translations are applied
    return this.viewMatrix.invertTransformX(screenX);
  }

  /** Converts Y position in device coordinates into the viewport coordinates */
  transformViewY(deviceY: number): number {
    const screenY = this.deviceToScreenMatrix.transformY(deviceY);
    return this.viewMatrix.invertTransformY(screenY);
  }

  /**
   * Translates the position of the viewport (i.e. a camera) to the current position of the canvas.
   * @param x X position in the device coordinates (e.g. 0 ~ 1920)
   * @param y Y position in the device coordinates (e.g. 0 ~ 1080)
   */
  refreshViewpointMatrix({ x, y }: { x: number; y: number }): void {
    const { width, height } = this.elemAppRoot.getBoundingClientRect();

    const deviceToScreenMatrix = new CubismMatrix44();
    deviceToScreenMatrix.scale(2 / width, -2 / height);
    // Shifts the camera position to the center of the canvas
    deviceToScreenMatrix.translateRelative(-width / 2, -height / 2);
    // Shifts the camera position to the position of the canvas
    deviceToScreenMatrix.translateRelative(-x, -y);

    this.deviceToScreenMatrix = deviceToScreenMatrix;
  }

  async loadMesseges(messagesOrUrl: string | string[]): Promise<MessageSchema> {
    if (messagesOrUrl instanceof Array) {
      return {
        general: messagesOrUrl.map((word: string) => word.trim()),
        datetime: [],
        touch: new Map(),
      };
    }

    const { keys, messages } = await loadMessagesFromYaml(messagesOrUrl);
    this.insertLanguageOptions(keys);
    this.addEventListenerToLanguageOptions();
    return messages;
  }

  startSpeaking(): void {
    this.swingMessage();

    this.sayRandomWord();
    this.MessageTimer = setInterval(() => this.sayRandomWord(), MessageDurationSeconds * 1000);
  }

  stopSpeaking(): void {
    this.elemMessage.innerText = "";
    this.elemMessage.classList.remove(`${clsMessageVisible}`);
    clearInterval(this.MessageTimer);
  }

  toggleMessage(event: PointerEvent): void {
    // ignore clicks or touches except for the left button click or the primary touch
    if (event.button !== 0) return;

    this.messageVisible = !this.messageVisible;
    this.fillUiWithUserLanguage();
    if (this.messageVisible) {
      this.stopSpeaking();
    } else {
      this.startSpeaking();
    }
  }

  sayWhenTouched(part: string): void {
    if (this.messages == null) return;
    if (!this.messageVisible) return;

    const candiddates = this.messages.touch.get(part) ?? [];
    const rand = Math.floor(Math.random() * candiddates.length);
    if (candiddates[rand] != null) {
      this.elemMessage.innerText = candiddates[rand];
      this.elemMessage.classList.add(clsMessageVisible);
    }
  }

  sayRandomWord(): void {
    if (this.messages == null) return;
    if (this.elemMessage.classList.contains(clsMessageVisible)) {
      this.elemMessage.classList.remove(clsMessageVisible);
      return;
    }

    const msgDate = this.messages.datetime
      .filter((item) => item.pattern.test(getFormattedDate()))
      .map((item) => item.messages)
      .flat();
    const messages = this.messages.general.concat(msgDate);
    const weightArray = this.baseWeightArray.concat(Array(msgDate.length).fill(MessagePriority));
    const weightSum = weightArray.reduce((prev, current) => prev + current, 0);
    const rand = this.searchWeightedList(weightArray)(Math.random() * weightSum);
    if (messages[rand] != null) {
      this.elemMessage.innerText = messages[rand];
      this.elemMessage.classList.add(clsMessageVisible);
    }
  }

  /**
   ```typescript
   function test(values: number[]) {
    const sum = values.reduce((prev, current) => prev + current, 0);
    const weighted = searchWeightedList(values);
    const result = Array(values.length).fill(0);
    const N = 10_000;
    const avg = sum / N;

    for (let i = 0; i < N; i++) {
      const index = weighted(Math.random() * sum);
      result[index] += avg;
    }
    console.log(result.map((value) => Math.round(value)));
  }

   test([1, 6, 3, 4]); // output: [1, 6, 3, 4]
   ```
   */
  searchWeightedList(weightList: number[]): (weight: number) => number {
    const cumlativeSum: number[] = weightList.reduce(
      (prev, current) => [...prev, current + prev[prev.length - 1]],
      [0]
    );

    // operate binary search on weight array
    return (weight: number): number => {
      let imin = 0; // integer
      let imax = cumlativeSum.length; // integer
      let index = Math.round((imin + imax) / 2); // integer

      while (imax !== index && imin !== imax) {
        cumlativeSum[index] < weight ? (imin = index) : (imax = index);
        index = Math.round((imin + imax) / 2);
      }
      return index - 1;
    };
  }

  toggleMenu(event: PointerEvent): void {
    // ignore clicks or touches except for the left button click or the primary touch
    if (event.button !== 0) return;

    const keyframes: Keyframe[] | PropertyIndexedKeyframes = [
      { height: `0`, transform: `translateY(100%) scale(0, 0)` },
      { height: `0`, transform: `translateY(0) scale(1, 0)` },
      { height: `100%`, transform: `translateY(0) scale(1, 1)` },
    ];
    const options: KeyframeAnimationOptions = {
      duration: MenuRevealingDurationSeconds * 1000,
      easing: "ease-in",
      fill: "both",
    };
    const anim = this.elemSheet.animate(keyframes, options);

    if (window.getComputedStyle(this.elemSheet).display === "none") {
      this.elemSheet.style.display = `grid`;
      this.elemMenuButton.classList.add("open");
      anim.play();
    } else {
      this.elemMenuButton.classList.remove("open");
      anim.addEventListener("finish", () => {
        Object.assign(this.elemSheet.style, { display: null });
      });
      anim.reverse();
    }
  }

  calcInitialAppCoord(): { x: number; y: number } {
    const { width, height } = this.elemAppRoot.getBoundingClientRect();
    const { innerWidth, innerHeight } = window;
    let { x: xDistance, y: yDistance } = this.modelDistance;
    xDistance = xDistance > 1 ? xDistance : xDistance * innerWidth;
    yDistance = yDistance > 1 ? yDistance : yDistance * innerHeight;
    const xPos = this.modelPosition.includes("left") ? xDistance : innerWidth - width - xDistance;
    const yPos = this.modelPosition.includes("top") ? yDistance : innerHeight - height - yDistance;
    return { x: clamp(xPos, 0, window.innerWidth), y: clamp(yPos, 0, window.innerHeight) };
  }

  calcInitialPosition(): { top: string; left: string } {
    const { width, height } = this.elemAppRoot.getBoundingClientRect();
    const { innerWidth, innerHeight } = window;
    const { x, y } = this.calcInitialAppCoord();
    switch (this.slideInFrom) {
      case Dimension.top:
        return { top: `${-height}px`, left: `${x}px` };
      case Dimension.bottom:
        return { top: `${innerHeight}px`, left: `${x}px` };
      case Dimension.left:
        return { top: `${y}px`, left: `${-width}px` };
      case Dimension.right:
        return { top: `${y}px`, left: `${innerWidth}px` };
    }
  }

  calcAppearingKeyframes(): { top: string[] } | { left: string[] } {
    const { width, height } = this.elemAppRoot.getBoundingClientRect();
    const { innerWidth, innerHeight } = window;
    const { x, y } = this.calcInitialAppCoord();

    // No need to specify the corresponding parameter (top or left) because it's set in the initialization.
    switch (this.slideInFrom) {
      case Dimension.top:
        return { top: [`${-height}px`, `${height * 0.3}px`, `${y}px`] };
      case Dimension.bottom:
        return { top: [`${innerHeight}px`, `${innerHeight - height * 0.3}px`, `${y}px`] };
      case Dimension.left:
        return { left: [`${-width}px`, `${width * 0.3}px`, `${x}px`] };
      case Dimension.right:
        return { left: [`${innerWidth}px`, `${innerWidth - width * 0.3}px`, `${x}px`] };
    }
  }

  calcDisappearingKeyframes(): { top: string[]; left: string[] } {
    const { top, left, width, height } = this.elemAppRoot.getBoundingClientRect();
    const { innerWidth, innerHeight } = window;
    const { x, y } = this.calcInitialAppCoord();
    switch (this.slideInFrom) {
      case Dimension.top:
        return { top: [`${top}px`, `${-height}px`], left: [`${left}px`, `${x}px`] };
      case Dimension.bottom:
        return { top: [`${top}px`, `${innerHeight}px`], left: [`${left}px`, `${x}px`] };
      case Dimension.left:
        return { top: [`${top}px`, `${y}px`], left: [`${left}px`, `${-width}px`] };
      case Dimension.right:
        return { top: [`${top}px`, `${y}px`], left: [`${left}px`, `${innerWidth}px`] };
    }
  }

  swingMessage(): Animation {
    const keyframes: Keyframe[] | PropertyIndexedKeyframes = {
      transform: [
        "translate(0, 0) rotate(0)",
        "translate(0.5px, -1.5px) rotate(-0.5deg)",
        "translate(0.5px, 1.5px) rotate(1.5deg)",
        "translate(1.5px, 1.5px) rotate(1.5deg)",
        "translate(2.5px, 1.5px) rotate(0.5deg)",
        "translate(0.5px, 2.5px) rotate(0.5deg)",
        "translate(1.5px, 1.5px) rotate(0.5deg)",
        "translate(0.5px, 0.5px) rotate(0.5deg)",
        "translate(-1.5px, -0.5px) rotate(1.5deg)",
        "translate(0.5px, 0.5px) rotate(1.5deg)",
        "translate(2.5px, 2.5px) rotate(1.5deg)",
        "translate(0.5px, -1.5px) rotate(1.5deg)",
        "translate(-1.5px, 1.5px) rotate(-0.5deg)",
        "translate(1.5px, 0.5px) rotate(1.5deg)",
        "translate(-0.5px, -0.5px) rotate(-0.5deg)",
        "translate(1.5px, -0.5px) rotate(-0.5deg)",
        "translate(2.5px, -1.5px) rotate(1.5deg)",
        "translate(2.5px, 2.5px) rotate(-0.5deg)",
        "translate(0.5px, -1.5px) rotate(0.5deg)",
        "translate(2.5px, -0.5px) rotate(-0.5deg)",
        "translate(-0.5px, 2.5px) rotate(0.5deg)",
        "translate(-1.5px, 2.5px) rotate(0.5deg)",
        "translate(-1.5px, 1.5px) rotate(0.5deg)",
        "translate(1.5px, -0.5px) rotate(-0.5deg)",
        "translate(2.5px, -0.5px) rotate(0.5deg)",
        "translate(-1.5px, 1.5px) rotate(0.5deg)",
        "translate(-0.5px, 1.5px) rotate(0.5deg)",
        "translate(-1.5px, 1.5px) rotate(0.5deg)",
        "translate(0.5px, 2.5px) rotate(1.5deg)",
        "translate(2.5px, 2.5px) rotate(0.5deg)",
        "translate(2.5px, -1.5px) rotate(1.5deg)",
        "translate(-1.5px, 0.5px) rotate(1.5deg)",
        "translate(-1.5px, 1.5px) rotate(1.5deg)",
        "translate(0.5px, 2.5px) rotate(1.5deg)",
        "translate(2.5px, -1.5px) rotate(1.5deg)",
        "translate(2.5px, 2.5px) rotate(0.5deg)",
        "translate(-0.5px, -1.5px) rotate(1.5deg)",
        "translate(-1.5px, 2.5px) rotate(1.5deg)",
        "translate(-1.5px, 2.5px) rotate(1.5deg)",
        "translate(-1.5px, 2.5px) rotate(0.5deg)",
        "translate(-1.5px, 0.5px) rotate(-0.5deg)",
        "translate(-1.5px, 0.5px) rotate(-0.5deg)",
        "translate(-0.5px, 0.5px) rotate(1.5deg)",
        "translate(2.5px, 1.5px) rotate(0.5deg)",
        "translate(-1.5px, 0.5px) rotate(1.5deg)",
        "translate(-1.5px, -0.5px) rotate(-0.5deg)",
        "translate(-1.5px, -1.5px) rotate(1.5deg)",
        "translate(0.5px, 0.5px) rotate(-0.5deg)",
        "translate(2.5px, -0.5px) rotate(-0.5deg)",
        "translate(-1.5px, -1.5px) rotate(-0.5deg)",
        "translate(0, 0) rotate(0)",
      ],
    };

    const options: KeyframeAnimationOptions = {
      duration: MessageSwingingSeconds * 1000,
      easing: "ease-in-out",
      iterations: Infinity,
    };

    return this.elemMessage.animate(keyframes, options);
  }

  // ------------------------------
  // Language support
  // ------------------------------
  fillUiWithUserLanguage(): void {
    const uiStrings = getUiStrings(getUserPrefLanguages()[0]);
    (this.elemSwitcher.querySelector("p") as HTMLElement).innerText = uiStrings[clsSwitcher];
    (this.elemHider.querySelector("p") as HTMLElement).innerText = uiStrings[clsHider];
    if (this.messageVisible) {
      (this.elemToggleMessage.querySelector("p") as HTMLElement).innerText = uiStrings[clsToggleMessage].turnOff;
    } else {
      (this.elemToggleMessage.querySelector("p") as HTMLElement).innerText = uiStrings[clsToggleMessage].turnOn;
    }
    (this.elemLanguage.querySelector("p") as HTMLElement).innerText = uiStrings[clsLanguage];
    (this.elemCredit.querySelector("p") as HTMLElement).innerText = uiStrings[clsCredit];
    (this.elemRevealer.querySelector("p") as HTMLElement).innerText = uiStrings[clsRevealer];
  }

  addEventListenerToLanguageOptions(): void {
    this.elemToast.addEventListener("animationend", () => this.elemToast.classList.remove(clsToastVisible));

    this.elemLanguageOptions.addEventListener("change", (event) => {
      const language = (event.target as HTMLSelectElement).value;

      if (isLocalStorageAvailable()) {
        if (language === LanguageValueUnset) {
          localStorage.removeItem(MessageLanguageStorageName);
        } else {
          localStorage.setItem(MessageLanguageStorageName, language);
        }
        this.elemToast.classList.add(clsToastVisible);
      }

      this.fillUiWithUserLanguage();
    });
  }

  insertLanguageOptions(yamlKeys: string[]): void {
    const result: string[] = [];
    const categories = [MessageCategoryGeneral, MessageCategoryDatetime, MessageCategoryTouch];

    yamlKeys = yamlKeys.filter((key) => key !== MessageVersion).sort();
    if (yamlKeys.includes(MessageLanguageDefault)) {
      result.push(MessageLanguageDefault);
      result.push(...yamlKeys.filter((key) => key !== MessageLanguageDefault && !categories.includes(key)));
    } else if (
      yamlKeys.includes(MessageCategoryGeneral) ||
      yamlKeys.includes(MessageCategoryDatetime) ||
      yamlKeys.includes(MessageCategoryTouch)
    ) {
      result.push(MessageLanguageDefault);
      result.push(...yamlKeys.filter((key) => !categories.includes(key)));
    }

    for (let i = 0; i < result.length; i++) {
      if (result[i].includes("-") && result[i].toLowerCase().replace("-", "_") === result[i + 1].toLowerCase()) {
        result.splice(i + 1, 1);
      }
    }

    const selectedKey = localStorage.getItem(MessageLanguageStorageName) ?? "";
    this.elemLanguageOptions.insertAdjacentHTML(
      "beforeend",
      `<option value="${LanguageValueUnset}" ${result.includes(selectedKey) ? "selected" : ""}>(Unset)</option>`
    );
    for (const key of result) {
      const selected = key === selectedKey ? "selected" : "";
      this.elemLanguageOptions.insertAdjacentHTML("beforeend", `<option value="${key}" ${selected}>${key}</option>`);
    }
  }
}
