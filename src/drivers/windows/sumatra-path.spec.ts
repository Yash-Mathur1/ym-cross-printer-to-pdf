import { mocked } from "jest-mock";
import fixPathForAsarUnpack from "../../utils/electron-util";
import resolveSumatraPath, { SUMATRA_BINARY } from "./sumatra-path";

jest.mock("../../utils/electron-util");
const mockedFix = mocked(fixPathForAsarUnpack);

beforeEach(() => {
  mockedFix.mockImplementation((p) => p);
});

afterEach(() => {
  mockedFix.mockReset();
});

it("uses the bundled binary by default", () => {
  expect(resolveSumatraPath()).toContain(SUMATRA_BINARY);
});

it("rewrites the bundled path out of an ASAR archive", () => {
  mockedFix.mockImplementation((p) => `unpacked:${p}`);

  expect(resolveSumatraPath()).toMatch(/^unpacked:/);
});

it("trusts an explicit override without rewriting it", () => {
  expect(resolveSumatraPath("C:/tools/SumatraPDF.exe")).toBe(
    "C:/tools/SumatraPDF.exe",
  );
  expect(mockedFix).not.toHaveBeenCalled();
});

it("falls back to the bundled binary for an empty override", () => {
  expect(resolveSumatraPath("")).toContain(SUMATRA_BINARY);
});
