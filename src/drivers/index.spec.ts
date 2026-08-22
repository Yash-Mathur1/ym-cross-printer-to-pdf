import resolveDriver, { SUPPORTED_PLATFORMS } from ".";
import { UnsupportedPlatformError } from "../errors";
import cupsDriver from "./cups/cups-driver";
import windowsDriver from "./windows/windows-driver";

it("resolves the Windows backend on win32", () => {
  expect(resolveDriver("win32")).toBe(windowsDriver);
});

it.each([
  "darwin",
  "linux",
  "freebsd",
  "openbsd",
  "sunos",
] as NodeJS.Platform[])("resolves the CUPS backend on %s", (platform) => {
  expect(resolveDriver(platform)).toBe(cupsDriver);
});

it("claims exactly the platforms it implements", () => {
  expect(SUPPORTED_PLATFORMS.sort()).toEqual(
    ["darwin", "freebsd", "linux", "openbsd", "sunos", "win32"].sort(),
  );
});

it.each(["aix", "android", "haiku"] as NodeJS.Platform[])(
  "throws on unsupported platform %s",
  (platform) => {
    expect(() => resolveDriver(platform)).toThrow(UnsupportedPlatformError);
    expect(() => resolveDriver(platform)).toThrow(
      "Operating System not supported",
    );
  },
);

it("reports which platforms would have worked", () => {
  expect(() => resolveDriver("aix")).toThrow(/Supported platforms:.*win32/);
});

it("defaults to the running platform", () => {
  const spy = jest.spyOn(require("os"), "platform").mockReturnValue("win32");

  expect(resolveDriver()).toBe(windowsDriver);
  expect(spy).toHaveBeenCalled();

  spy.mockRestore();
});
