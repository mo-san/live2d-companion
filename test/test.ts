import { getUiStrings } from "../src/Localization";

describe("some math", () => {
  test("abs(-1) === 1", () => {
    expect(Math.abs(-1)).toBe(1);
  });

  test("localization", () => {
    expect(getUiStrings("ja")).toBeTruthy()
  })
});
