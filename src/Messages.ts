import { parse as parseYaml } from "yaml";
import {
  cronTimeField,
  LangData,
  MesasgeDatetime,
  MessageCategoryDatetime,
  MessageCategoryGeneral,
  MessageCategoryTouch,
  MessageLanguageDefault,
  MessageLanguageStorageName,
  MessageSchema,
  WordDateTime,
  WordGeneral,
  WordTouch,
  YamlData,
} from "./Constants";

// ------------------------------
// ------------------------------

/** Short names for each time fileds. Used when string formatting. */
const f: { [_ in cronTimeField]: string } = {
  month: "m",
  day: "d",
  hour: "h",
  minute: "n",
  dayWeek: "w",
};

export function getFormattedDate(dt: Date = new Date()): string {
  const month = dt.getMonth() + 1;
  const day = dt.getDate();
  const hour = dt.getHours();
  const minute = dt.getMinutes();
  const dayWeek = dt.getDay();
  return `${f.month}=${month} ${f.day}=${day} ${f.hour}=${hour} ${f.minute}=${minute} ${f.dayWeek}=${dayWeek}`;
}

/**
 | input | output (backslashes are substitued with slashes) |
 |---|---|
 | 1-20 | 1/2/3/4/5/6/7/8/9/10/11/12/13/14/15/16/17/18/19/20 |
 | 1-20/2 | 1/4/7/10/13/16/19 |
 */
function explodeRange(input: string): string {
  const match = input.match(/(?<start>\d+)-(?<end>\d+)(?:\/(?<step>\d+))?/);
  if (match == null) return input;

  const result = [];
  const groups = match.groups as { [_: string]: string };
  const start = parseInt(groups.start);
  const end = parseInt(groups.end);
  const step = parseInt(groups.step ?? 1);
  for (let i = start; i <= end; i += step) {
    result.push(i);
  }
  return result.join("|");
}

function parseCronField(input: string, field: cronTimeField): string {
  const field2range: { [_ in cronTimeField]: string } = {
    month: "1-12",
    day: "1-31",
    hour: "0-23",
    minute: "0-59",
    dayWeek: "0-6",
  };

  const parsed = input.replace("*", field2range[field]).split(",").map(explodeRange);
  return `(?:${parsed.join("|")})`;
}

/**
 | input | output |
 |---|---|
 | 1 | ^1$ |
 | 1-3 | ^[1-3]$ |
 | 1,14 | ^(?:1/14)$ |
 | 1-3,12 | ^(?:[1-3]/12)$ |
 | 1-59/2 | ^(?:1/3...57/59)$ |
 | * | ^[0-59]$ |
 | *\/2 | ^(0/2/...56/58)$ |
 */
function parseCronStrings(mappings: Map<string, string | string[]>): MesasgeDatetime[] {
  const name2num = new Map<string, string>([
    ["sunday", "0"],
    ["monday", "1"],
    ["tuesday", "2"],
    ["wednesday", "3"],
    ["thursday", "4"],
    ["friday", "5"],
    ["saturday", "6"],
    ["sun", "0"],
    ["mon", "1"],
    ["tue", "2"],
    ["wed", "3"],
    ["thu", "4"],
    ["fri", "5"],
    ["sat", "6"],
  ]);

  const result = [];
  for (let [cron, messages] of mappings.entries()) {
    if (typeof messages === "string") messages = [messages];

    // Cron-style datetime accepts only 5 fileds (<=> having 4 spaces).
    if (cron.match(/ /g)?.length !== 4) throw new Error(`Invalid datetime field format: ${cron}`);

    let [minute, hour, day, month, dayWeek] = cron.split(" ");

    minute = parseCronField(minute, "minute");
    hour = parseCronField(hour, "hour");
    day = parseCronField(day, "day");
    month = parseCronField(month, "month");

    if (/[a-zA-Z]/.test(dayWeek)) {
      const _dayWeek = name2num.get(dayWeek.toLowerCase());
      if (_dayWeek == null) throw new Error(`Invalid Day of Week format: ${dayWeek}`);
      dayWeek = _dayWeek;
    }
    dayWeek = dayWeek.replace("7", "0"); // 0 and 7 both mean sunday
    dayWeek = parseCronField(dayWeek, "dayWeek");

    const str = `${f.month}=${month} ${f.day}=${day} ${f.hour}=${hour} ${f.minute}=${minute} ${f.dayWeek}=${dayWeek}`;
    result.push({
      messages: messages.map((word: string) => word.trim()),
      pattern: new RegExp(str),
    });
  }
  return result;
}

/** https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API */
export function isLocalStorageAvailable(): boolean {
  if (!Object.prototype.hasOwnProperty.call(window, "localStorage")) return false;

  const storage: Storage = window.localStorage;
  try {
    const x = "__storage_test__";
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (e) {
    return (
      e instanceof DOMException &&
      (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED") &&
      // acknowledge QuotaExceededError only if there's something already stored
      storage != null &&
      storage.length !== 0
    );
  }
}

/**
 * Returns the user's preferred language from the local storage (if any) or the browser settings.
 */
export function getUserPrefLanguages(): string[] {
  const lng = navigator.languages ?? [navigator.language];
  // わざわざ配列を作り直しているのは、 "readonly" によるエラーを取り除くため
  if (!isLocalStorageAvailable()) return [...lng];

  const langPref = localStorage.getItem(MessageLanguageStorageName);
  if (langPref != null) return [langPref];
  return [...lng];
}

/**
 * 言語タグ = localStorage 言語設定 || navigator.languages
 * その言語タグをyamlから以下の順番で探す
 *   1. [-_]を含まない場合:
 *     完全一致 (ja)
 *     前方一致 (ja-JP)
 *   2. [-_]を含む場合:
 *     完全一致 (zh-CH)
 *     前方一致 (zh)
 * あればそれを return, 見つからなければ次の言語タグに continue
 */
function getSuitableLanguage(parsed: YamlData): string {
  const yamlKeys = Array.from(parsed.keys());

  for (const language of getUserPrefLanguages()) {
    if (yamlKeys.includes(language)) return language;

    // [-_] の有無でもう一度探す
    const match = language.match(/(?<lang>[a-zA-Z]+)[-_]\w+/);
    if (match == null) {
      // e.g. if language is "ja" or "zh", then "ja-JP" or "zh_CN"
      const lang = yamlKeys.find((key) => new RegExp(`^${language}[-_].+`).test(key));
      if (lang != null) return lang;
    } else {
      // e.g. if language is "ja-JP" or "zh_CN", then "ja" or "zh"
      const lang = (match.groups as { [_: string]: string }).lang;
      if (yamlKeys.includes(lang)) return lang;
    }
  }

  if (yamlKeys.includes(MessageLanguageDefault)) return MessageLanguageDefault;
  return "";
}

/**
 * 見つかった言語タグを用いて、 datetime, touch, general のそれぞれを探す。
 * あればそれを返し、なければ、 default, 最上層 へとフォールバックする。
 * それもなければ空を返す。
 */
function getCategoryContent(parsed: YamlData, langName: string, result?: LangData): LangData {
  result = result ?? (new Map() as LangData);
  const allowedKeys = [MessageCategoryGeneral, MessageCategoryDatetime, MessageCategoryTouch];

  const langContent = langName === "" ? (parsed as LangData) : ((parsed.get(langName) ?? new Map()) as LangData);
  const insufficientCategories = Array.from(langContent.keys()).filter((key) => !(result as LangData).has(key));
  const foundKkeys = allowedKeys.filter((key) => insufficientCategories.includes(key));
  for (const key of foundKkeys) {
    result.set(key, langContent.get(key));
  }

  if (langName === "") return result;
  if (langName === MessageLanguageDefault) return getCategoryContent(parsed, "", result);
  return getCategoryContent(parsed, MessageLanguageDefault, result);
}

export async function loadMessagesFromYaml(fileUrl: string): Promise<{ keys: string[]; messages: MessageSchema }> {
  const defaults = { general: [], datetime: [], touch: new Map() };
  if (fileUrl === "") return { keys: [], messages: defaults };

  const text = await (await fetch(fileUrl)).text();
  const parsed: YamlData = parseYaml(text, { mapAsMap: true, merge: true });

  const langName = getSuitableLanguage(parsed);
  const messages = getCategoryContent(parsed, langName);

  const _general = (messages.get(MessageCategoryGeneral) as WordGeneral) ?? [];
  const general = typeof _general === "string" ? [_general.trim()] : _general.map((word) => word.trim());

  const _touch = (messages.get(MessageCategoryTouch) as WordTouch) ?? new Map<string, string | string[]>();
  const touch = Array.from(_touch.entries()).reduce((prev, [region, words]) => {
    if (typeof words === "string") words = [words];
    return prev.set(
      region,
      words.map((word) => word.trim())
    );
  }, new Map<string, string[]>());

  const _datetime = (messages.get(MessageCategoryDatetime) as WordDateTime) ?? new Map();
  const datetime = parseCronStrings(_datetime);

  const from: MessageSchema = { general, datetime, touch };
  return { keys: Array.from(parsed.keys()), messages: Object.assign(defaults, from) };
}
