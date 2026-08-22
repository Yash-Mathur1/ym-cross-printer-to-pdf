import wrapPrintFailure from "./print-failure";
import { FileNotFoundError, PrintError } from "../errors";

it("wraps a spawn failure, keeping the original as the cause", () => {
  const original = Object.assign(new Error("exit 1"), {
    code: 1,
    stderr: "boom",
  });

  const error = catchFrom(original);

  expect(error).toBeInstanceOf(PrintError);
  expect(error.cause).toBe(original);
  expect(error.exitCode).toBe(1);
  expect(error.stderr).toBe("boom");
});

it("prefers the backend's own diagnostics for the message", () => {
  expect(
    catchFrom(
      Object.assign(new Error("exit 1"), { stderr: "  lp: no such queue  " }),
    ).message,
  ).toBe("Printing failed: lp: no such queue");
});

it("falls back to the error message when there is no stderr", () => {
  expect(catchFrom(new Error("spawn failed")).message).toBe(
    "Printing failed: spawn failed",
  );
});

it("falls back again for a thrown non-Error", () => {
  expect(catchFrom("something odd").message).toBe(
    "Printing failed: something odd",
  );
});

it("ignores a blank stderr", () => {
  expect(
    catchFrom(Object.assign(new Error("exit 1"), { stderr: "   " })).message,
  ).toBe("Printing failed: exit 1");
});

it("omits exitCode and stderr when the backend gave neither", () => {
  const error = catchFrom(new Error("plain"));

  expect(error.exitCode).toBeUndefined();
  expect(error.stderr).toBeUndefined();
});

it("does not re-wrap our own errors, which already explain themselves", () => {
  const original = new FileNotFoundError("No such file");

  expect(catchFrom(original)).toBe(original);
});

function catchFrom(error: unknown): PrintError {
  try {
    wrapPrintFailure(error);
  } catch (thrown) {
    return thrown as PrintError;
  }

  throw new Error("wrapPrintFailure did not throw");
}
