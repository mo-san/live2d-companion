/* =====================
 * Configurations for the widget itself
   ===================== */
export const ErrorIncompatible = `[Live2D-Companion] This browser does not support APIs for the app to run. Please consider using another newer browser.`;
export const ErrorInvalidPath = `[Live2D-Companion] File path does not end with .model3.json nor .zip! If you want to load the model from online storage, use object notation instead.`;
export const ErrorNoModel = `[Live2D-Companion] No models provided.`;

/** The name of the cache storage in the browser's cache API */
export const cacheBucketNameRoot = "live2d-companion";

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
const MessagePositionTop = "top";
const MessagePositionBottom = "bottom";
export type MessagePosition = typeof MessagePositionTop | typeof MessagePositionBottom;

/** The interval how long the next message will appear */
export const MessageDurationSeconds = 10;
export const MessageSwingingSeconds = 40;
export const MessageAppearDelaySeconds = 3;
export const AppDisappearingDurationSeconds = 1;
export const AppRevealingDurationSeconds = 2;
export const MenuRevealingDurationSeconds = 0.3;

export const LanguageValueUnset = "unset";

/** Which axis the user can move the widget along. */
export type DraggableType = boolean | "x" | "y";

/**  */
// type ViewScale = { [_ in "Default" | "Max" | "Min"]: number };
/**  */
// type ViewLogicalMax = { [_ in keyof typeof Dimension]: number };
/**  */
// type ViewLogical = { [_ in keyof typeof Dimension]: number } & { Max: ViewLogicalMax };

/**  */
// export const View: { Scale: ViewScale; Logical: ViewLogical } = {
//   Scale: {
//     Default: 1.0,
//     Max: 1.0,
//     Min: 1.0,
//   },
//   Logical: {
//     top: 1.0,
//     bottom: -1.0,
//     left: -1.0,
//     right: 1.0,
//     Max: {
//       top: 2.0,
//       bottom: -2.0,
//       left: -2.0,
//       right: 2.0,
//     },
//   },
// };

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
 * Configurations for the message file
   ===================== */
export type YamlVersion = number | undefined;
export type WordGeneral = string | string[] | undefined;
export type WordTouch = Map<string, string | string[]> | undefined;
export type WordDateTime = Map<string, string | string[]> | undefined;
export type LangData = Map<string, WordGeneral | WordTouch | WordDateTime>;
export type YamlData = Map<string, YamlVersion | LangData | Map<string, LangData> | undefined>;

export type cronTimeField = "minute" | "hour" | "day" | "month" | "dayWeek";

/** How frequent date-time specific messages are told. */
export const MessagePriority = 2;
export const MessageVersion = "version";
export const MessageCategoryGeneral = "general";
export const MessageCategoryDatetime = "datetime";
export const MessageCategoryTouch = "touch";
export const MessageLanguageDefault = "default";
export const MessageLanguageStorageName = "language";

export interface MesasgeDatetime {
  pattern: RegExp;
  messages: string[];
}

export interface MessageSchema {
  general: string[];
  datetime: MesasgeDatetime[];
  touch: Map<string, string[]>;
}

/* =====================
 * Schema definition for user-defined configs
   ===================== */
/**  */
export type MessagesOrUrl =
  | string // when specifying JSON or YAML URL
  | string[];

interface HitTestAreas {
  head?: { name: string };
  body?: { name?: string; group?: string };
}
export interface HitTestAreasNotNull {
  head: { name: string };
  body: { name: string; group: string };
}

/**
 * Indicates where the model is stored and how we should render it.
 */
export interface ModelInfo {
  /** The file path or URL of the config JSON file of the model. */
  jsonPath: string;
  /** The file path or URL of the archive file which contains the model and its data. */
  zipPath?: string;
  /** The messages the model speaks. */
  messages?: MessagesOrUrl;
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
export interface ModelLocationNotNull {
  jsonPath: string;
  zipPath: string;
  messages: MessagesOrUrl;
  hitTest: HitTestAreasNotNull;
}

/**  */
export interface Config {
  models: Array<string | ModelInfo>;
  useCache?: boolean;
  modelVisible?: boolean;
  messageVisible?: boolean;
  modelPosition?: ModelPosition;
  slideInFrom?: Dimension;
  modelDistance?: typeof ModelDistance;
  width?: number;
  height?: number;
  draggable?: DraggableType;
  messagePosition?: MessagePosition;
  messages?: MessagesOrUrl;
  version?: string | number;
}

export interface ConfigNotNull {
  models: Array<string | ModelInfo>;
  useCache: boolean;
  modelVisible: boolean;
  messageVisible: boolean;
  modelPosition: ModelPosition;
  slideInFrom: Dimension;
  modelDistance: typeof ModelDistance;
  width: number;
  height: number;
  draggable: DraggableType;
  messagePosition: MessagePosition;
  messages: MessagesOrUrl;
  version: string | number;
}

export const DefaultConfig: ConfigNotNull = {
  version: "1",
  models: [],
  useCache: true,
  modelVisible: true,
  modelPosition: ModelPositionBottomRight,
  slideInFrom: DimensionBottom,
  modelDistance: ModelDistance,
  width: DefaultWidth,
  height: DefaultHeight,
  draggable: true,
  messageVisible: true,
  messagePosition: MessagePositionTop,
  messages: [],
};
