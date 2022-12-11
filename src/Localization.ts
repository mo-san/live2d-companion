import { clsHider, clsLanguage, clsAbout, clsWordsToggle, clsRevealer, clsSwitcher } from "./Constants";

interface UiString {
  [clsSwitcher]: string;
  [clsHider]: string;
  [clsWordsToggle]: { turnOff: string; turnOn: string };
  [clsLanguage]: string;
  [clsAbout]: string;
  [clsRevealer]: string;
}

export function getUiStrings(language: string): UiString {
  const langEn: UiString = {
    [clsSwitcher]: "Switch Model",
    [clsHider]: "Hide Widget",
    [clsWordsToggle]: { turnOff: "Hide Words", turnOn: "Show Words" },
    [clsLanguage]: "Select Language",
    [clsAbout]: "About",
    [clsRevealer]: "Show Widget",
  };

  const langJa: UiString = {
    [clsSwitcher]: "モデル切り替え",
    [clsHider]: "ウィジェットを隠す",
    [clsWordsToggle]: { turnOff: "セリフ欄を隠す", turnOn: "セリフ欄を表示する" },
    [clsLanguage]: "言語設定",
    [clsAbout]: "情報",
    [clsRevealer]: "看板娘",
  };

  switch (language.toLowerCase()) {
    case "en":
    case "en-us":
    case "en_us":
      return langEn;
    case "ja":
    case "ja-jp":
    case "ja_jp":
      return langJa;
    default:
      return langEn;
  }
}
