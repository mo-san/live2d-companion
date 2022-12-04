import { clsHider, clsLanguage, clsLicense, clsMessageToggle, clsRevealer, clsSwitcher } from "./Constants";

interface UiString {
  [clsSwitcher]: string;
  [clsHider]: string;
  [clsMessageToggle]: { turnOff: string; turnOn: string };
  [clsLanguage]: string;
  [clsLicense]: string;
  [clsRevealer]: string;
}

export function getUiStrings(language: string): UiString {
  const langEn: UiString = {
    [clsSwitcher]: "Switch Model",
    [clsHider]: "Hide Widget",
    [clsMessageToggle]: { turnOff: "Hide Message", turnOn: "Show Message" },
    [clsLanguage]: "Select Language",
    [clsLicense]: "License",
    [clsRevealer]: "Show Widget",
  };

  const langJa: UiString = {
    [clsSwitcher]: "モデル切り替え",
    [clsHider]: "ウィジェットを隠す",
    [clsMessageToggle]: { turnOff: "メッセージ欄を隠す", turnOn: "メッセージ欄を表示する" },
    [clsLanguage]: "言語設定",
    [clsLicense]: "利用規約",
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
