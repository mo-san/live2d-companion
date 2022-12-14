/* =====================
 * Configurations for CSS Styles
   ===================== */
/** CSS class name of the app's DOM element */
export const clsAppRoot = `live2d-companion` as const;
/** CSS class name of the app's DOM element when width is very small */
export const clsAppRootMini = `${clsAppRoot}--mini` as const;
/** CSS class name of the app when it is being dragged */
export const clsDragging = `${clsAppRoot}__dragging` as const;
export const clsContent = `${clsAppRoot}__content` as const;
export const clsMenuToggle = `${clsContent}__toggle-menu` as const;
/** CSS class name for the message window */
export const clsWords = `${clsContent}__words` as const;
/** CSS class name for the message window when visible */
export const clsWordsVisible = `${clsWords}--visible` as const;
export const clsMenu = `${clsContent}__menu` as const;
export const clsHider = `${clsMenu}__hide` as const;
export const clsSwitcher = `${clsMenu}__switch` as const;
export const clsWordsToggle = `${clsMenu}__toggle-words` as const;
export const clsAbout = `${clsMenu}__about` as const;
export const clsLanguage = `${clsMenu}__language` as const;
export const clsToast = `${clsLanguage}__toast` as const;
export const clsToastVisible = `${clsToast}--visible` as const;
export const clsRevealer = `${clsAppRoot}__reveal` as const;
export const clsDisabled = "disabled" as const;
export const clsMenuOpen = "open" as const;

const urlRepository = "https://github.com/mo-san/live2d-companion";
const urlLicense = "https://github.com/mo-san/live2d-companion/blob/main/LICENSE";
const urlL2dOpen = "https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html";
const urlL2dProp = "https://www.live2d.com/eula/live2d-proprietary-software-license-agreement_en.html";
export const domString = `<div class="${clsAppRoot}">
  <div class="${clsContent}" style="display: none;">
    <canvas></canvas>
    <div class="${clsWords}"></div>
    <button class="${clsMenuToggle}"><div></div></button>
    <div class="${clsMenu}">
      <a class="${clsHider}"><p></p></a>
      <a class="${clsSwitcher}"><p></p></a>
      <a class="${clsWordsToggle}"><p></p></a>
      <div class="${clsLanguage}">
        <p></p>
        <select></select>
        <div class="${clsToast}">Saved!</div>
      </div>
      <div class="${clsAbout}"><p></p><ul>
        <li>Each Live2D model is copy&shy;righted by its respec&shy;tive author.</li>
        <li>This app (<b>Live2D Compa&shy;nion</b>) is under <a href="${urlLicense}">MIT Li&shy;cense</a>.<br>
            The source code is avail&shy;able on <a href="${urlRepository}">Github</a>.</li>
        <li><b>Cubism Web Frame&shy;work</b> is under <a href="${urlL2dOpen}">Live2D Open Software Li&shy;cense Agree&shy;ment</a>.</li>
        <li><b>Live2D Cubism Core</b> is under <a href="${urlL2dProp}">Live2D Pro&shy;prietary Software Li&shy;cense Agree&shy;ment</a>.</li>
      </div>
    </div>
  </div>
  <a class="${clsRevealer}"><p></p></a>
</div>`;

/* =====================
 * Configurations for the widget itself
   ===================== */
export const ErrorIncompatible = `[Live2D-Companion] This browser does not support APIs for the app to run. Please consider using another newer browser.`;
export const ErrorNoModel = `[Live2D-Companion] No models provided.`;

/** The name of the cache storage in the browser's cache API */
export const cacheBucketNameRoot = "live2d-companion";
export const CubismCoreUrl = "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js";

/** Default canvas size. Interpreted as pixels. */
export const DefaultWidth = 300;
export const DefaultHeight = 300;
export const ThresholdAppRootMini = 250;

/**  */
export const DimensionTop = "top";
export const DimensionBottom = "bottom";
export const DimensionLeft = "left";
export const DimensionRight = "right";
export type Dimension = typeof DimensionTop | typeof DimensionBottom | typeof DimensionLeft | typeof DimensionRight;
/** Where in the window to show the widget */
const ModelPositionTopLeft = "topleft";
const ModelPositionTopRight = "topright";
const ModelPositionBottomLeft = "bottomleft";
const ModelPositionBottomRight = "bottomright";
export type ModelPosition =
  | typeof ModelPositionTopLeft
  | typeof ModelPositionTopRight
  | typeof ModelPositionBottomLeft
  | typeof ModelPositionBottomRight;

/**
 * How far the widget is from the edge of the window.
 * If the number > 1, interpreted as pixels.
 * If 0 <= the number <= 1, interpreted as percentage.
 */
export const ModelDistance = {
  x: 0,
  y: 0,
};

/**  */
const WordsPositionTop = "top";
const WordsPositionBottom = "bottom";
export type WordsPosition = typeof WordsPositionTop | typeof WordsPositionBottom;

/** The interval how long the next words will appear */
export const WordsDurationSeconds = 10;
export const WordsSwingingSeconds = 60;
export const WordsAppearDelaySeconds = 3;
export const AppDisappearingDurationSeconds = 1;
export const AppRevealingDurationSeconds = 2;

export const LanguageValueUnset = "unset";

/** Which axis the user can move the widget along. */
export type DraggableType = boolean | "x" | "y";

/* =====================
 * Configurations for the models
   ===================== */
/**
 * The names of the motion groups the model has.
 * Make sure these values keep consistency with external config json file.
 */
export const MotionGroup = {
  Idle: "Idle",
  TapBody: "TapBody",
} as const;

/**
 * The names of the collision areas the model has.
 * Make sure these values keep consistency with external config json file.
 */
export const HitAreaName = {
  Head: "Head", // when head touched
  Body: "Body", // when body touched
} as const;

/** Priorities for the motions */
export const Priority = {
  None: 0,
  Idle: 1,
  Normal: 2,
  Force: 3,
} as const;

/* =====================
 * Configurations for the words file
   ===================== */
export type TypeYamlVersion = number | undefined;
export type TypeWordGeneral = string | string[] | undefined;
export type TypeWordTouch = Map<string, string | string[]> | undefined;
export type TypeWordDateTime = Map<string, string | string[]> | undefined;
export type TypeLangData = Map<string, TypeWordGeneral | TypeWordTouch | TypeWordDateTime>;
export type TypeYamlData = Map<string, TypeYamlVersion | TypeLangData | Map<string, TypeLangData> | undefined>;

export type cronTimeField = "minute" | "hour" | "day" | "month" | "dayWeek";

/** How frequent date-time specific words are told. */
export const WordsPriority = 2;
export const WordsVersion = "version";
export const WordsCategoryGeneral = "general";
export const WordsCategoryDatetime = "datetime";
export const WordsCategoryTouch = "touch";
export const WordsLanguageDefault = "default";
export const WordsLanguageStorageName = `${clsAppRoot}-language`;

export interface WordsDatetime {
  pattern: RegExp;
  words: string[];
}

export interface WordsSchema {
  general: string[];
  datetime: WordsDatetime[];
  touch: Map<string, string[]>;
}

/* =====================
 * Schema definition for user-defined configs
   ===================== */
/**  */
export type WordsOrUrl =
  | string // when specifying JSON or YAML URL
  | string[];

interface HitTestAreas {
  head?: { name: string };
  body?: { name?: string; group?: string };
}
export interface HitTestAreasNotNull extends HitTestAreas {
  head: { name: string };
  body: { name: string; group: string };
}

/**
 * Indicates where the model is stored and how we should render it.
 */
export interface ModelInfo {
  /** The file path or URL of the config JSON file or the archive file containing the model. */
  path?: string;
  /** The messages the model speaks. */
  words?: WordsOrUrl;
  /** Used for hit testing, or collision testing.
   * @example [{ name: "HeadArea"; as: "Head" }, {...}]
   * @example [{ name: "HitAreaBody"; group: "BodyTouched"; as: "Body" }, {...}]
   */
  hitTest?: HitTestAreas;
}

/**
 * Indicates where the model is stored and how we should render it.
 * Basically same as 'ModelLocation' but this doesn't allow null or undefined values.
 */
export interface ModelInfoNotNull extends ModelInfo {
  path: string;
  words: WordsOrUrl;
  hitTest: HitTestAreasNotNull;
}

/**  */
export interface Config {
  models: Array<string | ModelInfo>;
  useCache?: boolean;
  modelVisible?: boolean;
  modelPosition?: ModelPosition;
  slideInFrom?: Dimension;
  modelDistance?: typeof ModelDistance;
  width?: number;
  height?: number;
  draggable?: DraggableType;
  words?: WordsOrUrl;
  wordsVisible?: boolean;
  wordsPosition?: WordsPosition;
  version?: string | number;
}

export interface ConfigNotNull extends Config {
  models: Array<string | ModelInfo>;
  useCache: boolean;
  modelVisible: boolean;
  modelPosition: ModelPosition;
  slideInFrom: Dimension;
  modelDistance: typeof ModelDistance;
  width: number;
  height: number;
  draggable: DraggableType;
  words: WordsOrUrl;
  wordsVisible: boolean;
  wordsPosition: WordsPosition;
  version: string | number;
}

export const DefaultConfig: ConfigNotNull = {
  version: 1,
  models: [],
  useCache: true,
  modelVisible: true,
  modelPosition: ModelPositionBottomRight,
  slideInFrom: DimensionBottom,
  modelDistance: ModelDistance,
  width: DefaultWidth,
  height: DefaultHeight,
  draggable: true,
  wordsVisible: true,
  wordsPosition: WordsPositionTop,
  words: [],
};
