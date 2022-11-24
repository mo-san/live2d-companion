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
  HitAreaName,
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
  ModelLocation,
  ModelLocationNotNull,
  ModelPosition,
  ThresholdAppRootMini,
} from "./Constants";
import { getUiStrings } from "./Localization";
import {
  CANVAS,
  elemAppRoot,
  elemContent,
  elemCredit,
  elemHider,
  elemLanguage,
  elemLanguageOptions,
  elemMenuButton,
  elemMessage,
  elemRevealer,
  elemSheet,
  elemSwitcher,
  elemToast,
  elemToggleMessage,
  Time,
} from "./main";
import { getFormattedDate, getUserPrefLanguages, isLocalStorageAvailable, loadMessagesFromYaml } from "./Messages";
import { flushWebglContext, ModelManager, setupWebglFeatures } from "./ModelManager";
import {
  clsAppRootMini,
  clsCredit,
  clsDragging,
  clsHider,
  clsLanguage,
  clsMessage,
  clsMessageVisible,
  clsRevealer,
  clsSwitcher,
  clsToastVisible,
  clsToggleMessage,
} from "./Styles";

/**
 * A number representing the handler for 'setTimeout' or 'setInterval'
 */
let MessageTimer: number = 0;

// ------------------------------
// ------------------------------
export let viewMatrix: CubismViewMatrix;
export let deviceToScreenMatrix: CubismMatrix44;

/** X座標をView座標に変換する。 */
export function transformViewX(deviceX: number): number {
  const screenX = deviceToScreenMatrix.transformX(deviceX); // 論理座標変換した座標を取得。
  return viewMatrix.invertTransformX(screenX); // 拡大、縮小、移動後の値。
}

/** Y座標をView座標に変換する。 */
export function transformViewY(deviceY: number): number {
  const screenY = deviceToScreenMatrix.transformY(deviceY); // 論理座標変換した座標を取得。
  return viewMatrix.invertTransformY(screenY);
}

export function initializeViewMatrix(): [a: CubismViewMatrix, b: CubismMatrix44] {
  const viewMatrix = new CubismViewMatrix();
  const { width, height } = CANVAS;

  const deviceToScreenMatrix = new CubismMatrix44();
  deviceToScreenMatrix.scale(2 / width, -2 / height);
  deviceToScreenMatrix.translateRelative(-width / 2, -height / 2);
  deviceToScreenMatrix.translateRelative(-(innerWidth - width), -(innerHeight - height));

  return [viewMatrix, deviceToScreenMatrix];
}

// ------------------------------
// Language support
// ------------------------------
function fillUiWithUserLanguage(): void {
  const uiStrings = getUiStrings(getUserPrefLanguages()[0]);
  (elemSwitcher.querySelector("p") as HTMLElement).innerText = uiStrings[clsSwitcher];
  (elemHider.querySelector("p") as HTMLElement).innerText = uiStrings[clsHider];
  (elemToggleMessage.querySelector("p") as HTMLElement).innerText = uiStrings[clsToggleMessage].turnOff;
  (elemLanguage.querySelector("p") as HTMLElement).innerText = uiStrings[clsLanguage];
  (elemCredit.querySelector("p") as HTMLElement).innerText = uiStrings[clsCredit];
  (elemRevealer.querySelector("p") as HTMLElement).innerText = uiStrings[clsRevealer];
}

function addEventListenerToLanguageOptions(): void {
  elemToast.addEventListener("animationend", () => elemToast.classList.remove(clsToastVisible));

  elemLanguageOptions.addEventListener("change", (event) => {
    const language = (event.target as HTMLSelectElement).value;

    if (isLocalStorageAvailable()) {
      if (language === LanguageValueUnset) {
        localStorage.removeItem(MessageLanguageStorageName);
      } else {
        localStorage.setItem(MessageLanguageStorageName, language);
      }
      elemToast.classList.add(clsToastVisible);
    }

    fillUiWithUserLanguage();
  });
}

function insertLanguageOptions(yamlKeys: string[]): void {
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
  elemLanguageOptions.insertAdjacentHTML(
    "beforeend",
    `<option value="${LanguageValueUnset}" ${result.includes(selectedKey) ? "selected" : ""}>(Unset)</option>`
  );
  for (const key of result) {
    const selected = key === selectedKey ? "selected" : "";
    elemLanguageOptions.insertAdjacentHTML("beforeend", `<option value="${key}" ${selected}>${key}</option>`);
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
export function getModelLocation(fileLocation: string | ModelLocation): ModelLocationNotNull {
  const emptyObj: ModelLocationNotNull = { jsonPath: "", zipPath: "", texturePaths: [], clip: [], messages: [] };

  if (typeof fileLocation !== "string") {
    return Object.assign(emptyObj, fileLocation) as ModelLocationNotNull;
  }

  // strip query parameters
  fileLocation = fileLocation.replace(/[?#].*$/, "");

  if (fileLocation.endsWith(".model3.json")) {
    return {
      jsonPath: fileLocation,
      zipPath: "",
      texturePaths: [],
      clip: [],
      messages: [],
    } as ModelLocationNotNull;
  }

  if (fileLocation.endsWith(".zip")) {
    return {
      jsonPath: filePathToJsonPath(fileLocation),
      zipPath: fileLocation,
      texturePaths: [],
      clip: [],
      messages: [],
    } as ModelLocationNotNull;
  }

  console.error(
    "File path does not end with .model3.json nor .zip!" +
      " If you want to load the model from online storage, use object notation instead."
  );
  return emptyObj;
}

/**
 * Manages widget itself.
 */
export class Widget {
  models: ModelLocationNotNull[];
  currentModelIndex: number;
  modelManager?: ModelManager;
  modelPosition: keyof typeof ModelPosition;
  slideInFrom: keyof typeof Dimension;
  modelVisible: boolean;
  modelCoordInitial: { top: number; left: number };
  messages?: MessageSchema;
  private readonly _messages: string | string[];
  messagePosition: keyof typeof MessagePosition;
  messageVisible: boolean;
  useCache: boolean;
  draggable: DraggableType;
  version: string;
  private pointerCoord: { x: number; y: number } = { x: 0, y: 0 };
  private baseWeightArray: number[] = [];

  constructor(userConfig: Config) {
    // update default settings with user defined config
    const config: ConfigNotNull = Object.assign(DefaultConfig, userConfig);

    this.resizeApp(config.width, config.height);

    if (config.models.length === 0) console.error(`No models provided.`);
    this.models = config.models.map(getModelLocation);
    this.currentModelIndex = 0;
    this.modelPosition = config.modelPosition;
    this.version = String(config.version);

    this.modelVisible = config.modelVisible;
    if (this.modelVisible) {
      Object.assign(elemContent.style, { display: null });
    } else {
      this.showElemRevealer();
    }

    this.slideInFrom = config.slideInFrom;
    const distance = {
      y: Math.max(0, config.modelDistance.y),
      x: Math.max(0, config.modelDistance.x),
    };
    const { width, height } = elemAppRoot.getBoundingClientRect();
    this.modelCoordInitial = this.calcAppCoord({
      top: this.modelPosition.includes("top") ? distance.y : window.innerHeight - distance.y - height,
      left: this.modelPosition.includes("left") ? distance.x : window.innerWidth - distance.x - width,
    });
    Object.assign(elemAppRoot.style, this.calcInitialPosition());

    this._messages = config.messages;
    this.messagePosition = config.messagePosition.toLowerCase() as keyof typeof MessagePosition;
    this.messageVisible = config.messageVisible;

    this.useCache = config.useCache;
    this.draggable = config.draggable;

    fillUiWithUserLanguage();

    [viewMatrix, deviceToScreenMatrix] = initializeViewMatrix();
    setupWebglFeatures();
  }

  async main(): Promise<void> {
    await this.loadModel(this.currentModelIndex);

    this.messages = await this.loadMesseges(this._messages);
    this.baseWeightArray = Array(this.messages.general.length).fill(1);

    if (this.modelVisible) {
      if (this.messageVisible && this._messages.length > 0) {
        setTimeout(() => this.startSpeaking(), MessageAppearDelaySeconds * 1000);
      }
      this.appear();
    }
    this.registerEvents();

    await this.loop(0);
  }

  registerEvents(): void {
    window.addEventListener("resize", (event) => this.onWindowResize(event));
    document.addEventListener("pointermove", (event) => this.onPointerMove(event));
    document.addEventListener("pointerleave", (event) => this.onPointerLeave(event));
    document.addEventListener("pointerup", (event) => this.onPointerUp(event));
    elemAppRoot.addEventListener("pointerup", (event) => this.onPointerUp(event));

    elemMenuButton.addEventListener("pointerup", (event) => this.toggleMenu(event));
    elemSwitcher.addEventListener("pointerup", async (event) => await this.switchModel(event));
    elemHider.addEventListener("pointerup", (event) => this.disappear(event));
    elemRevealer.addEventListener("pointerup", (event) => this.appear(event));
    elemToggleMessage.addEventListener("pointerup", (event) => this.toggleMessage(event));

    if (this.draggable !== false) {
      elemAppRoot.addEventListener("pointerdown", (event) => this.onPointerDown(event));
    }
  }

  resizeApp(width: number, height: number): void {
    if (width < ThresholdAppRootMini || height < ThresholdAppRootMini) {
      elemAppRoot.classList.add(clsAppRootMini);
    }
    width = Math.min(width, window.innerWidth);
    height = Math.min(height, window.innerHeight);
    elemAppRoot.style.width = `${width}px`;
    elemAppRoot.style.height = `${height}px`;

    CANVAS.width = elemAppRoot.clientWidth;
    CANVAS.height = elemAppRoot.clientHeight;
  }

  protected async loadModel(modelIndex: number): Promise<void> {
    const model = this.models[modelIndex];
    if (model == null || model.jsonPath === "") return;

    this.modelManager = await ModelManager.init(model, this.version);
    await this.modelManager.load();
  }

  async switchModel(event: PointerEvent): Promise<void> {
    // ignore clicks or touches except for the left button click or the primary touch
    if (event.button !== 0) return;

    this.toggleMenu(event);
    this.currentModelIndex = (this.currentModelIndex + 1) % this.models.length;

    // release resources
    this.modelManager?.release();
    this.modelManager = undefined;

    await this.loadModel(this.currentModelIndex);
  }

  appear(event?: PointerEvent): void {
    // ignore clicks or touches except for the left button click or the primary touch
    if (event != null && event.button !== 0) return;

    // Coding like "element.style.display = null" can cause a type error. So this is a workaround.
    Object.assign(elemContent.style, { display: null });
    Object.assign(elemRevealer.style, { display: null });

    const keyframes = this.calcAppearingKeyframes();
    const options: KeyframeAnimationOptions = {
      duration: AppRevealingDurationSeconds * 1000,
      easing: "cubic-bezier(.13,1.22,.87,-0.56)", // https://cubic-bezier.com
      // 'fill: "forwards"' can be used to stop movement at the last keyframe, but then the element cannot be moved by mouse.
    };
    const anim = elemAppRoot.animate(keyframes, options);

    // When the movement is finished, we stick the element in place.
    const [what, to] = Object.entries(keyframes)[0];
    anim.addEventListener("finish", () => {
      Object.assign(elemAppRoot.style, { [what]: to[to.length - 1] });
      elemMenuButton.style.display = "initial";
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
    const anim = elemAppRoot.animate(keyframes, options);

    // When the movement is finished, we stick the element at the position.
    const goal = Object.entries(move).reduce(
      (prev, [what, [_from, to]]) => Object.assign(prev, { [what]: to }),
      Object.create(null)
    );

    anim.addEventListener("finish", () => {
      Object.assign(elemAppRoot.style, goal);
      elemContent.style.display = "none";
      this.showElemRevealer();
    });
  }

  showElemRevealer(): void {
    elemRevealer.classList.add(this.modelPosition);
    elemRevealer.style.display = "grid";
  }

  onWindowResize(_event: UIEvent): void {
    const { width, height } = elemAppRoot.getBoundingClientRect();
    this.resizeApp(width, height);
    this.bringBackAppIntoWindow();
  }

  bringBackAppIntoWindow(): void {
    const { top, left, width, height } = elemAppRoot.getBoundingClientRect();
    const { innerWidth, innerHeight } = window;

    if (!(top < 0 || left < 0 || innerHeight < top + height || innerWidth < left + width)) return;

    if (top < 0) elemAppRoot.style.top = `0`;
    if (left < 0) elemAppRoot.style.left = `0`;
    if (innerHeight < top + height) elemAppRoot.style.top = `${innerHeight - height}px`;
    if (innerWidth < left + width) elemAppRoot.style.left = `${innerWidth - width}px`;
  }

  onPointerDown(event: PointerEvent): void {
    // ignore when touched with more than one fingers
    if (event instanceof TouchEvent && event.targetTouches.length > 1) return;

    if ((event.target as HTMLElement).tagName === "CANVAS") elemAppRoot.classList.add(`${clsDragging}`);

    const clientX = event instanceof TouchEvent ? event.targetTouches[0].clientX : event.clientX;
    const clientY = event instanceof TouchEvent ? event.targetTouches[0].clientY : event.clientY;
    const { top, left } = elemAppRoot.getBoundingClientRect();
    this.pointerCoord.x = clientX - left;
    this.pointerCoord.y = clientY - top;
    elemAppRoot.style.top = `${top}px`;
    elemAppRoot.style.left = `${left}px`;
  }

  onPointerMove(event: PointerEvent): void {
    const viewX: number = transformViewX(event.x);
    const viewY: number = transformViewY(event.y);

    this.modelManager?.setDragging(viewX, viewY);
    void this.modelManager?.touchAt(viewX, viewY, (part) => this.sayWhenTouched(part));

    if (!elemAppRoot.classList.contains(clsDragging)) return;

    event.preventDefault();
    if (this.draggable === "x") {
      elemAppRoot.style.left = `${event.clientX - this.pointerCoord.x}px`;
    } else if (this.draggable === "y") {
      elemAppRoot.style.top = `${event.clientY - this.pointerCoord.y}px`;
    } else if (this.draggable) {
      elemAppRoot.style.left = `${event.clientX - this.pointerCoord.x}px`;
      elemAppRoot.style.top = `${event.clientY - this.pointerCoord.y}px`;
    }

    this.bringBackAppIntoWindow();
  }

  onPointerLeave(_event: PointerEvent): void {
    this.modelManager?.setDragging(0, 0);
  }

  onPointerUp(_event: PointerEvent): void {
    elemAppRoot.classList.remove(`${clsDragging}`);
  }

  async loop(time: number): Promise<void> {
    // prepare the next frame
    requestAnimationFrame(async (time) => await this.loop(time));

    // proceed time
    Time.currentFrame = time;
    Time.deltaTime = (Time.currentFrame - Time.lastFrame) / 1000;
    Time.lastFrame = Time.currentFrame;

    flushWebglContext();

    const projection: CubismMatrix44 = new CubismMatrix44();

    const { width, height } = CANVAS;
    if ((this.modelManager?.getModel().getCanvasWidth() ?? 1.0) > 1.0 && width < height) {
      // 横に長いモデルを縦長ウィンドウに表示する際モデルの横サイズでscaleを算出する
      this.modelManager?.getModelMatrix().setWidth(2.0);
      projection.scale(1.0, width / height);
    } else {
      projection.scale(height / width, 1.0);
    }
    this.modelManager?.draw(projection);
    await this.modelManager?.update();
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
    insertLanguageOptions(keys);
    addEventListenerToLanguageOptions();
    return messages;
  }

  startSpeaking(): void {
    this.swingMessage();
    elemMessage.classList.add(`${clsMessage}-${this.messagePosition}`);

    this.sayRandomWord();
    MessageTimer = setInterval(() => this.sayRandomWord(), MessageDurationSeconds * 1000);
  }

  stopSpeaking(): void {
    elemMessage.innerText = "";
    elemMessage.classList.remove(`${clsMessageVisible}`);
    clearInterval(MessageTimer);
  }

  toggleMessage(event: PointerEvent): void {
    // ignore clicks or touches except for the left button click or the primary touch
    if (event.button !== 0) return;

    const uiStrings = getUiStrings(getUserPrefLanguages()[0]);
    if (this.messageVisible) {
      elemToggleMessage.innerText = uiStrings[clsToggleMessage].turnOff;
      this.stopSpeaking();
    } else {
      elemToggleMessage.innerText = uiStrings[clsToggleMessage].turnOn;
      this.startSpeaking();
    }
    this.messageVisible = !this.messageVisible;
  }

  sayWhenTouched(part: keyof typeof HitAreaName): void {
    if (this.messages == null) return;

    const candiddates = this.messages.touch.get(part) ?? [];
    const rand = Math.floor(Math.random() * candiddates.length);
    if (candiddates[rand] != null) {
      elemMessage.innerText = candiddates[rand];
      elemMessage.classList.add(clsMessageVisible);
    }
  }

  sayRandomWord(): void {
    if (this.messages == null) return;
    if (elemMessage.classList.contains(clsMessageVisible)) {
      elemMessage.classList.remove(clsMessageVisible);
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
      elemMessage.innerText = messages[rand];
      elemMessage.classList.add(clsMessageVisible);
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
    const anim = elemSheet.animate(keyframes, options);

    if (window.getComputedStyle(elemSheet).display === "none") {
      elemSheet.style.display = `grid`;
      elemMenuButton.classList.add("open");
      anim.play();
    } else {
      elemMenuButton.classList.remove("open");
      anim.addEventListener("finish", () => {
        Object.assign(elemSheet.style, { display: null });
      });
      anim.reverse();
    }
  }

  calcAppCoord({ top, left }: { top: number; left: number }): { top: number; left: number } {
    function clamp(target: number, min: number, max: number): number {
      return Math.min(Math.max(min, target), max);
    }

    const { width, height } = elemAppRoot.getBoundingClientRect();
    const { innerWidth, innerHeight } = window;
    const formulas = {
      [ModelPosition.bottomright]: {
        top: top > 1 ? innerHeight - top - height : innerHeight - top * innerHeight - height,
        left: left > 1 ? innerWidth - left - width : innerWidth - left * innerWidth - width,
      },
      [ModelPosition.bottomleft]: {
        top: top > 1 ? innerHeight - top - height : innerHeight - top * innerHeight - height,
        left: left > 1 ? left : left * innerWidth,
      },
      [ModelPosition.topright]: {
        top: top > 1 ? top : top * innerHeight,
        left: left > 1 ? innerWidth - left - width : innerWidth - left * innerWidth - width,
      },
      [ModelPosition.topleft]: {
        top: top > 1 ? top : top * innerHeight,
        left: left > 1 ? left : left * innerWidth,
      },
    };

    const result = formulas[this.modelPosition];
    return { top: clamp(result.top, 0, window.innerHeight), left: clamp(result.left, 0, window.innerWidth) };
  }

  calcInitialPosition(): { top: string; left: string } {
    const { width, height } = elemAppRoot.getBoundingClientRect();
    const { innerWidth, innerHeight } = window;
    const { top, left } = this.calcAppCoord(this.modelCoordInitial);
    const moves = {
      [Dimension.top]: { top: `${-height}px`, left: `${left}px` },
      [Dimension.bottom]: { top: `${innerHeight}px`, left: `${left}px` },
      [Dimension.left]: { top: `${top}px`, left: `${-width}px` },
      [Dimension.right]: { top: `${top}px`, left: `${innerWidth}px` },
    };
    return moves[this.slideInFrom];
  }

  calcAppearingKeyframes(): { top: string[] } | { left: string[] } {
    const { width, height } = elemAppRoot.getBoundingClientRect();
    const { innerWidth, innerHeight } = window;
    const { top, left } = this.calcAppCoord(this.modelCoordInitial);

    // No need to specify the corresponding parameter (top or left) because it's set in the initialization.
    const moves = {
      [Dimension.top]: { top: [`${-height}px`, `${height * 0.3}`, `${top}px`] },
      [Dimension.bottom]: { top: [`${innerHeight}px`, `${innerHeight - height * 0.3}`, `${top}px`] },
      [Dimension.left]: { left: [`${-width}px`, `${width * 0.3}`, `${left}px`] },
      [Dimension.right]: { left: [`${innerWidth}px`, `${innerWidth - width * 0.3}`, `${left}px`] },
    };
    return moves[this.slideInFrom];
  }

  calcDisappearingKeyframes(): { top: string[]; left: string[] } {
    const { top, left, width, height } = elemAppRoot.getBoundingClientRect();
    const { innerWidth, innerHeight } = window;
    const { top: topInitial, left: leftInitial } = this.calcAppCoord(this.modelCoordInitial);
    const moves = {
      [Dimension.top]: { top: `${-height}px`, left: `${leftInitial}px` },
      [Dimension.bottom]: { top: `${innerHeight}px`, left: `${leftInitial}px` },
      [Dimension.left]: { top: `${topInitial}px`, left: `${-width}px` },
      [Dimension.right]: { top: `${topInitial}px`, left: `${innerWidth}px` },
    };
    const move = moves[this.slideInFrom];
    return {
      top: [`${top}px`, move.top],
      left: [`${left}px`, move.left],
    };
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

    return elemMessage.animate(keyframes, options);
  }
}
