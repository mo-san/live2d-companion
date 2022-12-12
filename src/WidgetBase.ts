import { CubismMatrix44 } from "@framework/math/cubismmatrix44";
import { CubismViewMatrix } from "@framework/math/cubismviewmatrix";
import {
  AppDisappearingDurationSeconds,
  AppRevealingDurationSeconds,
  clsAbout,
  clsAppRoot,
  clsAppRootMini,
  clsContent,
  clsDisabled,
  clsDragging,
  clsHider,
  clsLanguage,
  clsMenuOpen,
  clsMenuToggle,
  clsRevealer,
  clsSwitcher,
  clsToast,
  clsToastVisible,
  clsWords,
  clsWordsToggle,
  clsWordsVisible,
  Config,
  ConfigNotNull,
  DefaultConfig,
  Dimension,
  DimensionBottom,
  DimensionLeft,
  DimensionRight,
  DimensionTop,
  domString,
  DraggableType,
  ErrorNoModel,
  HitAreaName,
  HitTestAreasNotNull,
  LanguageValueUnset,
  ModelInfo,
  ModelInfoNotNull,
  ModelPosition,
  MotionGroup,
  ThresholdAppRootMini,
  WordsAppearDelaySeconds,
  WordsCategoryDatetime,
  WordsCategoryGeneral,
  WordsCategoryTouch,
  WordsDurationSeconds,
  WordsLanguageDefault,
  WordsLanguageStorageName,
  WordsPosition,
  WordsPriority,
  WordsSchema,
  WordsSwingingSeconds,
  WordsVersion,
} from "./Constants";
import { getUiStrings } from "./Localization";
import { getFormattedDate, getUserPrefLanguages, isLocalStorageAvailable, loadWordsFromYaml } from "./Words";

export function addDomIfNotExists(): void {
  if (document.querySelector(`.${clsAppRoot}`) == null) {
    document.body.insertAdjacentHTML("beforeend", domString);
  }
}

/**
 * Converts relative path to absolute path. Because inlined web worker does not recognize relative paths.
 * @param path file path to convert
 */
function toAbsolutePath(path: string | undefined): string {
  if (path == null || path.length === 0) return "";
  const baseURL = document.querySelector("base")?.href ?? window.location.href.replace(/[^/]*$/, "");
  return new URL(path, baseURL).href;
}

/**
 *
 */
function getModelLocation(fileLocation: string | ModelInfo): ModelInfoNotNull {
  const hitTest: HitTestAreasNotNull = {
    head: { name: HitAreaName.Head },
    body: { name: HitAreaName.Body, group: MotionGroup.TapBody },
  };
  const baseObj: ModelInfoNotNull = { path: "", words: [], hitTest };

  if (typeof fileLocation === "string") {
    return Object.assign(baseObj, { path: toAbsolutePath(fileLocation) });
  }

  return Object.assign(baseObj, {
    ...fileLocation,
    path: toAbsolutePath(fileLocation.path),
    hitTest: Object.assign(hitTest, fileLocation.hitTest),
  }) as ModelInfoNotNull;
}

/**
 * Ensures the given number to be within the given numbers.
 * @param target
 * @param min
 * @param max
 */
function clamp(target: number, min: number, max: number): number {
  return Math.min(Math.max(min, target), max);
}

/**
 * Manages widget itself.
 */
export class WidgetBase {
  /** The index of the array of models. */
  currentModelIndex: number;
  /** An array of locations where the widget are located. */
  models: ModelInfoNotNull[];
  /** Whether the widget is visible. */
  modelVisible: boolean;
  /** Which corner the widget is located. */
  modelPosition: ModelPosition;
  /** The initial coordinates of the widget. */
  modelCoordInitial: { x: number; y: number };
  /** From which edge the widget show up. */
  slideInFrom: Dimension;
  /** How far from the edge the widget stands. Numbers can be 0~1 (inclusive) and will be interpreted as a percentage. */
  modelDistance: { x: number; y: number };
  /** Words which is common among all models. */
  wordsCommon?: WordsSchema;
  /** Words that the character says. */
  words?: WordsSchema;
  /** This temporal variable may be messages or a URL to a JSON file containing messages. */
  private readonly _wordsOrUrl: string | string[];
  /** Whether the message window is visible. */
  wordsVisible: boolean;
  /** Whether we can cache the data. */
  useCache: boolean;
  /** Whether the user can drag the widget. */
  draggable: DraggableType;
  /** The version number of the models. Models who have lower versions will be removed from cache. */
  version: string;
  /** The position of a mouse or a finger. */
  private readonly pointerCoord: { x: number; y: number } = { x: 0, y: 0 };
  /** An array of weights for the random word selection. */
  private baseWeightArray: number[] = [];
  /** A matrix which maps the edges of the window to the those of the widget. */
  deviceToScreenMatrix = new CubismMatrix44();
  /** A viewoirt matrix, kind of camera. */
  viewMatrix = new CubismViewMatrix();
  /** A number representing the handler for 'setTimeout' or 'setInterval' */
  wordsTimer: number = 0;

  elemAppRoot = document.querySelector(`.${clsAppRoot}`) as HTMLDivElement;
  elemContent = this.elemAppRoot.querySelector(`.${clsContent}`) as HTMLDivElement;
  elemWords = this.elemAppRoot.querySelector(`.${clsWords}`) as HTMLDivElement;
  elemMenuToggle = this.elemAppRoot.querySelector(`.${clsMenuToggle}`) as HTMLButtonElement;
  elemSwitcher = this.elemAppRoot.querySelector(`.${clsSwitcher}`) as HTMLAnchorElement;
  elemHider = this.elemAppRoot.querySelector(`.${clsHider}`) as HTMLAnchorElement;
  elemWordsToggle = this.elemAppRoot.querySelector(`.${clsWordsToggle}`) as HTMLAnchorElement;
  elemAbout = this.elemAppRoot.querySelector(`.${clsAbout}`) as HTMLDivElement;
  elemLanguage = this.elemAppRoot.querySelector(`.${clsLanguage}`) as HTMLDivElement;
  elemLanguageOptions = this.elemAppRoot.querySelector(`.${clsLanguage} select`) as HTMLSelectElement;
  elemToast = this.elemAppRoot.querySelector(`.${clsToast}`) as HTMLDivElement;
  elemRevealer = this.elemAppRoot.querySelector(`.${clsRevealer}`) as HTMLAnchorElement;
  CANVAS = this.elemAppRoot.querySelector("canvas") as HTMLCanvasElement;
  private wordsAnimation: Animation | undefined;
  private eventRegistered: boolean = false;

  constructor(userConfig: Config) {
    // update default settings with user defined config
    const config: ConfigNotNull = Object.assign(DefaultConfig, userConfig);

    this.resizeApp(config);

    if (config.models.length === 0) console.error(ErrorNoModel);
    this.models = config.models.map(getModelLocation);
    if (this.models.length <= 1) {
      this.elemSwitcher.classList.add(clsDisabled);
    }
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

    this._wordsOrUrl = config.words;
    this.elemWords.classList.add(`${clsWords}--${config.wordsPosition.toLowerCase() as WordsPosition}`);
    this.wordsVisible = config.wordsVisible;

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

  init(): void {}

  async main(): Promise<void> {
    this.wordsCommon = await this.loadMesseges(this._wordsOrUrl);
    this.words = await this.updateWordsList();
    this.baseWeightArray = Array(this.words.general.length).fill(1);

    if (this.modelVisible) {
      if (this.wordsVisible && this._wordsOrUrl.length > 0) {
        setTimeout(() => this.startSpeaking(), WordsAppearDelaySeconds * 1000);
      }
      this.appear();
    }
    this.registerEvents();
  }

  registerEvents(): void {
    if (this.eventRegistered) return;

    window.addEventListener("resize", (_event) => this.onWindowResize());
    document.addEventListener("pointerleave", () => this.onPointerLeave());
    document.addEventListener("pointerup", (event) => this.onPointerUp(event));
    document.addEventListener("pointercancel", (event) => this.onPointerUp(event));
    this.elemAppRoot.addEventListener("pointerup", (event) => this.onPointerUp(event));

    this.elemMenuToggle.addEventListener("pointerup", (event) => this.toggleMenu(event));
    this.elemHider.addEventListener("pointerup", (event) => this.disappear(event));
    this.elemRevealer.addEventListener("pointerup", (event) => this.appear(event));
    this.elemWordsToggle.addEventListener("pointerup", (event) => this.toggleWords(event));

    if (this.models.length >= 2) {
      this.elemSwitcher.addEventListener("pointerup", async (event) => await this.switchModel(event));
    }
    if (this.draggable !== false) {
      this.elemAppRoot.addEventListener("pointerdown", (event) => this.onPointerDown(event));
    }

    this.eventRegistered = true;
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

  async switchModel(event: PointerEvent): Promise<void> {
    // ignore clicks or touches except for the left button click or the primary touch
    if (event.button !== 0) return;

    if (this.models.length <= 1) return;

    this.closeMenu();

    this.currentModelIndex = (this.currentModelIndex + 1) % this.models.length;
    this.words = await this.updateWordsList();
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
      this.elemMenuToggle.style.display = "grid";
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

  onWindowResize(): void {
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
    if (event.button !== 0) return;

    if ((event.target as HTMLElement).tagName === "CANVAS") this.elemAppRoot.classList.add(`${clsDragging}`);

    const { top, left } = this.elemAppRoot.getBoundingClientRect();
    this.pointerCoord.x = event.clientX - left;
    this.pointerCoord.y = event.clientY - top;
    this.elemAppRoot.style.top = `${top}px`;
    this.elemAppRoot.style.left = `${left}px`;
  }

  onPointerMove(event: PointerEvent): void {
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

  onPointerLeave(): void {}

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
    /**
     * Yes, 2 is kind of magic number. This is a distance between the edges horizontally and vertically,
     * because the viewport coordinates in WebGl world are between -1 (left or bottom) to +1 (right or top).
     */
    deviceToScreenMatrix.scale(2 / width, -2 / height);
    // Shifts the camera position to the center of the canvas
    deviceToScreenMatrix.translateRelative(-width / 2, -height / 2);
    // Shifts the camera position to the position of the canvas
    deviceToScreenMatrix.translateRelative(-x, -y);

    this.deviceToScreenMatrix = deviceToScreenMatrix;
  }

  async loadMesseges(wordsOrUrl: string | string[] | undefined): Promise<WordsSchema> {
    if (wordsOrUrl == null) {
      return {
        general: [],
        datetime: [],
        touch: new Map(),
      };
    }
    if (wordsOrUrl instanceof Array) {
      return {
        general: wordsOrUrl.map((word: string) => word.trim()),
        datetime: [],
        touch: new Map(),
      };
    }

    const { keys, words } = await loadWordsFromYaml(wordsOrUrl);
    this.insertLanguageOptions(keys);
    this.addEventListenerToLanguageOptions();
    return words;
  }

  async updateWordsList(): Promise<WordsSchema> {
    const wordsPerModel = await this.loadMesseges(this.models[this.currentModelIndex].words);
    return {
      general: [...(this.wordsCommon?.general ?? []), ...(wordsPerModel?.general ?? [])],
      datetime: [...(this.wordsCommon?.datetime ?? []), ...(wordsPerModel.datetime ?? [])],
      touch: new Map([...(this.wordsCommon?.touch ?? []), ...(wordsPerModel.touch ?? [])]),
    };
  }

  startSpeaking(): void {
    if (this.wordsAnimation == null) {
      this.wordsAnimation = this.swingWordsWindow();
    } else if (this.wordsAnimation.playState !== "running") {
      this.wordsAnimation.play();
    }

    this.sayRandomWord();
    this.wordsTimer = setInterval(() => this.sayRandomWord(), WordsDurationSeconds * 1000);
  }

  stopSpeaking(): void {
    this.elemWords.innerText = "";
    this.elemWords.classList.remove(`${clsWordsVisible}`);
    this.wordsAnimation?.cancel();
    clearInterval(this.wordsTimer);
  }

  toggleWords(event: PointerEvent): void {
    // ignore clicks or touches except for the left button click or the primary touch
    if (event.button !== 0) return;

    this.wordsVisible = !this.wordsVisible;
    this.fillUiWithUserLanguage();
    if (this.wordsVisible) {
      this.startSpeaking();
    } else {
      this.stopSpeaking();
    }
  }

  sayWhenTouched(part: string): void {
    if (this.words == null) return;
    if (!this.wordsVisible) return;

    const candiddates = this.words.touch.get(part) ?? [];
    const rand = Math.floor(Math.random() * candiddates.length);
    if (candiddates[rand] != null) {
      this.elemWords.innerText = candiddates[rand];
      this.elemWords.classList.add(clsWordsVisible);
    }
  }

  sayRandomWord(): void {
    if (this.words == null) return;
    if (this.elemWords.classList.contains(clsWordsVisible)) {
      this.elemWords.classList.remove(clsWordsVisible);
      return;
    }

    const msgDate = this.words.datetime
      .filter((item) => item.pattern.test(getFormattedDate()))
      .map((item) => item.words)
      .flat();
    const words = this.words.general.concat(msgDate);
    const weightArray = this.baseWeightArray.concat(Array(msgDate.length).fill(WordsPriority));
    const weightSum = weightArray.reduce((prev, current) => prev + current, 0);
    const rand = this.searchWeightedList(weightArray)(Math.random() * weightSum);
    if (words[rand] != null) {
      this.elemWords.innerText = words[rand];
      this.elemWords.classList.add(clsWordsVisible);
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

  isMenuOpen(): boolean {
    return this.elemMenuToggle.classList.contains(clsMenuOpen);
  }

  closeMenu(): void {
    this.elemMenuToggle.classList.remove(clsMenuOpen);
  }

  toggleMenu(event: PointerEvent): void {
    // ignore clicks or touches except for the left button click or the primary touch
    if (event.button !== 0) return;

    if (this.isMenuOpen()) {
      this.elemMenuToggle.classList.remove(clsMenuOpen);
    } else {
      this.elemMenuToggle.classList.add(clsMenuOpen);
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
      case DimensionTop:
        return { top: `${-height}px`, left: `${x}px` };
      case DimensionBottom:
        return { top: `${innerHeight}px`, left: `${x}px` };
      case DimensionLeft:
        return { top: `${y}px`, left: `${-width}px` };
      case DimensionRight:
        return { top: `${y}px`, left: `${innerWidth}px` };
    }
  }

  calcAppearingKeyframes(): { top: string[] } | { left: string[] } {
    const { width, height } = this.elemAppRoot.getBoundingClientRect();
    const { innerWidth, innerHeight } = window;
    const { x, y } = this.calcInitialAppCoord();

    // No need to specify the corresponding parameter (top or left) because it's set in the initialization.
    switch (this.slideInFrom) {
      case DimensionTop:
        return { top: [`${-height}px`, `${height * 0.3}px`, `${y}px`] };
      case DimensionBottom:
        return { top: [`${innerHeight}px`, `${innerHeight - height * 0.3}px`, `${y}px`] };
      case DimensionLeft:
        return { left: [`${-width}px`, `${width * 0.3}px`, `${x}px`] };
      case DimensionRight:
        return { left: [`${innerWidth}px`, `${innerWidth - width * 0.3}px`, `${x}px`] };
    }
  }

  calcDisappearingKeyframes(): { top: string[]; left: string[] } {
    const { top, left, width, height } = this.elemAppRoot.getBoundingClientRect();
    const { innerWidth, innerHeight } = window;
    const { x, y } = this.calcInitialAppCoord();
    switch (this.slideInFrom) {
      case DimensionTop:
        return { top: [`${top}px`, `${-height}px`], left: [`${left}px`, `${x}px`] };
      case DimensionBottom:
        return { top: [`${top}px`, `${innerHeight}px`], left: [`${left}px`, `${x}px`] };
      case DimensionLeft:
        return { top: [`${top}px`, `${y}px`], left: [`${left}px`, `${-width}px`] };
      case DimensionRight:
        return { top: [`${top}px`, `${y}px`], left: [`${left}px`, `${innerWidth}px`] };
    }
  }

  swingWordsWindow(): Animation {
    const keyframes: Keyframe[] | PropertyIndexedKeyframes = {
      // prettier-ignore
      transform: [
        [0, 0, 0],    [1, -3, -1], [1, 3, 3],   [3, 3, 3],   [4, 3, 1],
        [1, 4, 1],    [3, 3, 1],   [1, 1, 1],   [-3, -1, 3], [1, 1, 3],
        [4, 4, 3],    [1, -3, 3],  [-3, 3, -1], [3, 1, 3],   [-1, -1, -1],
        [3, -1, -1],  [4, -3, 3],  [4, 4, -1],  [1, -3, 1],  [4, -1, -1],
        [-1, 4, 1],   [-3, 4, 1],  [-3, 3, 1],  [3, -1, -1], [4, -1, 1],
        [-3, 3, 1],   [-1, 3, 1],  [-3, 3, 1],  [1, 4, 3],   [4, 4, 1],
        [4, -3, 3],   [-3, 1, 3],  [-3, 3, 3],  [1, 4, 3],   [4, -3, 3],
        [4, 4, 1],    [-1, -3, 3], [-3, 4, 3],  [-3, 4, 3],  [-3, 4, 1],
        [-3, 1, -1],  [-3, 1, -1], [-1, 1, 3],  [4, 3, 1],   [-3, 1, 3],
        [-3, -1, -1], [-3, -3, 3], [1, 1, -1],  [4, -1, -1], [-3, -3, -1],
      ].map(([a, b, c]) => `translate(${a}px, ${b}px) rotate(${c}deg)`),
    };

    const options: KeyframeAnimationOptions = {
      duration: WordsSwingingSeconds * 1000,
      easing: "ease-in-out",
      iterations: Infinity,
    };

    return this.elemWords.animate(keyframes, options);
  }

  // ------------------------------
  // Language support
  // ------------------------------
  fillUiWithUserLanguage(): void {
    const uiStrings = getUiStrings(getUserPrefLanguages()[0]);
    (this.elemSwitcher.querySelector("p") as HTMLElement).innerText = uiStrings[clsSwitcher];
    (this.elemHider.querySelector("p") as HTMLElement).innerText = uiStrings[clsHider];
    if (this.wordsVisible) {
      (this.elemWordsToggle.querySelector("p") as HTMLElement).innerText = uiStrings[clsWordsToggle].turnOff;
    } else {
      (this.elemWordsToggle.querySelector("p") as HTMLElement).innerText = uiStrings[clsWordsToggle].turnOn;
    }
    (this.elemLanguage.querySelector("p") as HTMLElement).innerText = uiStrings[clsLanguage];
    (this.elemAbout.querySelector("p") as HTMLElement).innerText = uiStrings[clsAbout];
    (this.elemRevealer.querySelector("p") as HTMLElement).innerText = uiStrings[clsRevealer];
  }

  addEventListenerToLanguageOptions(): void {
    this.elemToast.addEventListener("animationend", () => this.elemToast.classList.remove(clsToastVisible));

    this.elemLanguageOptions.addEventListener("change", (event) => {
      const language = (event.target as HTMLSelectElement).value;

      if (isLocalStorageAvailable()) {
        if (language === LanguageValueUnset) {
          localStorage.removeItem(WordsLanguageStorageName);
        } else {
          localStorage.setItem(WordsLanguageStorageName, language);
        }
        this.elemToast.classList.add(clsToastVisible);
      }

      this.fillUiWithUserLanguage();
    });
  }

  insertLanguageOptions(yamlKeys: string[]): void {
    const result: string[] = [];
    const categories = [WordsCategoryGeneral, WordsCategoryDatetime, WordsCategoryTouch];

    yamlKeys = yamlKeys.filter((key) => key !== WordsVersion).sort();
    if (yamlKeys.includes(WordsLanguageDefault)) {
      result.push(WordsLanguageDefault);
      result.push(...yamlKeys.filter((key) => key !== WordsLanguageDefault && !categories.includes(key)));
    } else if (
      yamlKeys.includes(WordsCategoryGeneral) ||
      yamlKeys.includes(WordsCategoryDatetime) ||
      yamlKeys.includes(WordsCategoryTouch)
    ) {
      result.push(WordsLanguageDefault);
      result.push(...yamlKeys.filter((key) => !categories.includes(key)));
    }

    for (let i = 0; i < result.length; i++) {
      if (result[i].includes("-") && result[i].toLowerCase().replace("-", "_") === result[i + 1].toLowerCase()) {
        result.splice(i + 1, 1);
      }
    }

    const selectedKey = localStorage.getItem(WordsLanguageStorageName) ?? "";
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
