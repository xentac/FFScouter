// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { copy_text } from "./clipboard";

let execCommand: ReturnType<typeof vi.fn>;

beforeEach(() => {
  execCommand = vi.fn().mockReturnValue(true);
  // jsdom has no execCommand
  document.execCommand = execCommand as unknown as typeof document.execCommand;
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

const stub_clipboard = (writeText: unknown) => {
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
};

test("copies through the Clipboard API", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  stub_clipboard(writeText);

  await expect(copy_text("insurance:ecstasy")).resolves.toBe(true);
  expect(writeText).toHaveBeenCalledWith("insurance:ecstasy");
  expect(execCommand).not.toHaveBeenCalled();
});

test("falls back to execCommand when the Clipboard API rejects", async () => {
  stub_clipboard(vi.fn().mockRejectedValue(new Error("not allowed")));
  let selected = "";
  execCommand.mockImplementation(() => {
    selected = (document.activeElement as HTMLTextAreaElement).value;
    return true;
  });

  await expect(copy_text("insurance:7days")).resolves.toBe(true);
  expect(execCommand).toHaveBeenCalledWith("copy");
  expect(selected).toBe("insurance:7days");
  expect(document.querySelector("textarea")).toBeNull();
});

test("falls back to execCommand when there is no Clipboard API", async () => {
  stub_clipboard(undefined);

  await expect(copy_text("insurance:xanax")).resolves.toBe(true);
  expect(execCommand).toHaveBeenCalledWith("copy");
});

test("reports failure when both ways fail", async () => {
  stub_clipboard(vi.fn().mockRejectedValue(new Error("not allowed")));
  execCommand.mockReturnValue(false);

  await expect(copy_text("insurance:xanax")).resolves.toBe(false);
});

test("reports failure when execCommand throws", async () => {
  stub_clipboard(undefined);
  execCommand.mockImplementation(() => {
    throw new Error("unsupported");
  });

  await expect(copy_text("insurance:xanax")).resolves.toBe(false);
  expect(document.querySelector("textarea")).toBeNull();
});
