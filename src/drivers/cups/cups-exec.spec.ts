import { mocked } from "jest-mock";
import execFileAsync from "../../utils/exec-file-async";
import { MissingDependencyError } from "../../errors";
import runCups, { runCupsQuery } from "./cups-exec";

jest.mock("../../utils/exec-file-async");
const mockedExec = mocked(execFileAsync);

const enoent = () =>
  Object.assign(new Error("spawn lp ENOENT"), { code: "ENOENT" });

beforeEach(() => {
  mockedExec.mockResolvedValue({ stdout: "out", stderr: "" });
});

afterEach(() => {
  mockedExec.mockReset();
});

it("pins the C locale so translated output cannot break the parsers", async () => {
  await runCups("lpstat", ["-e"]);

  const env = (mockedExec.mock.calls[0][2] as { env: NodeJS.ProcessEnv }).env;

  expect(env).toMatchObject({ LC_ALL: "C", LANG: "C", LANGUAGE: "C" });
});

it("keeps the rest of the environment intact", async () => {
  process.env.PDF_TO_PRINTER_TEST = "kept";

  await runCups("lpstat", ["-e"]);

  const env = (mockedExec.mock.calls[0][2] as { env: NodeJS.ProcessEnv }).env;

  expect(env.PDF_TO_PRINTER_TEST).toBe("kept");
  delete process.env.PDF_TO_PRINTER_TEST;
});

it("reports a missing binary as a dependency problem", async () => {
  mockedExec.mockRejectedValue(enoent());

  await expect(runCups("lp", [])).rejects.toBeInstanceOf(
    MissingDependencyError,
  );
  await expect(runCups("lp", [])).rejects.toThrow(/not found/);
});

it("names something installable in the hint", async () => {
  mockedExec.mockRejectedValue(enoent());

  await expect(runCups("lp", [])).rejects.toThrow(/cups-client|macOS|WSL/);
});

it("propagates other failures untouched", async () => {
  const failure = Object.assign(new Error("exit 1"), { code: 1 });
  mockedExec.mockRejectedValue(failure);

  await expect(runCups("lp", [])).rejects.toBe(failure);
});

describe("runCupsQuery", () => {
  it("returns stdout on success", async () => {
    await expect(runCupsQuery("lpstat", ["-e"])).resolves.toBe("out");
  });

  it("applies a timeout so a wedged query cannot hang the caller", async () => {
    await runCupsQuery("lpstat", ["-e"]);

    const options = mockedExec.mock.calls[0][2] as { timeout: number };

    expect(options.timeout).toBeGreaterThan(0);
  });

  it("yields empty output when a queue disappears mid-enumeration", async () => {
    mockedExec.mockRejectedValue(
      Object.assign(new Error("unknown"), { code: 1 }),
    );

    await expect(runCupsQuery("lpoptions", ["-p", "gone"])).resolves.toBe("");
  });

  it("still surfaces a missing binary, which is not transient", async () => {
    mockedExec.mockRejectedValue(enoent());

    await expect(runCupsQuery("lpstat", ["-e"])).rejects.toBeInstanceOf(
      MissingDependencyError,
    );
  });
});
