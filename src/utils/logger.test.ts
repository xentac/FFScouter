import { beforeEach, expect, test, vi } from "vitest";
import logger, { LogLevel } from "./logger";

beforeEach(() => {
  vi.restoreAllMocks();
  // Reset level to DEBUG for tests
  logger.setLevel(LogLevel.DEBUG);
});

test("LogLevel enum holds correct priority values", () => {
  expect(LogLevel.DEBUG).toEqual(0);
  expect(LogLevel.INFO).toEqual(1);
  expect(LogLevel.WARN).toEqual(2);
  expect(LogLevel.ERROR).toEqual(3);
  expect(LogLevel.NONE).toEqual(4);
});

test("Logger forwards to console functions when severity is high enough", () => {
  const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
  const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  logger.debug("debug msg");
  logger.info("info msg");
  logger.warn("warn msg");
  logger.error("error msg");

  expect(debugSpy).toHaveBeenCalledWith(
    expect.stringContaining("[FFSV3] - [DEBUG]: "),
    expect.any(String),
    "debug msg",
  );
  expect(infoSpy).toHaveBeenCalledWith(
    expect.stringContaining("[FFSV3] - [INFO]: "),
    expect.any(String),
    "info msg",
  );
  expect(warnSpy).toHaveBeenCalledWith(
    expect.stringContaining("[FFSV3] - [WARN]: "),
    expect.any(String),
    "warn msg",
  );
  expect(errorSpy).toHaveBeenCalledWith(
    expect.stringContaining("[FFSV3] - [ERROR]: "),
    expect.any(String),
    "error msg",
  );
});

test("Logger filters out low-severity messages based on active LogLevel", () => {
  logger.setLevel(LogLevel.WARN);

  const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
  const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  logger.debug("no show debug");
  logger.info("no show info");
  logger.warn("show warn");
  logger.error("show error");

  expect(debugSpy).not.toHaveBeenCalled();
  expect(infoSpy).not.toHaveBeenCalled();
  expect(warnSpy).toHaveBeenCalled();
  expect(errorSpy).toHaveBeenCalled();
});

test("Logger handles groups correctly and filters them at NONE level", () => {
  const groupSpy = vi.spyOn(console, "group").mockImplementation(() => {});
  const groupCollapsedSpy = vi
    .spyOn(console, "groupCollapsed")
    .mockImplementation(() => {});
  const groupEndSpy = vi
    .spyOn(console, "groupEnd")
    .mockImplementation(() => {});

  logger.group("my group", false);
  expect(groupSpy).toHaveBeenCalledWith("[FFSV3]: ", "my group");

  logger.group("my collapsed group", true);
  expect(groupCollapsedSpy).toHaveBeenCalledWith(
    "[FFSV3]: ",
    "my collapsed group",
  );

  logger.groupEnd();
  expect(groupEndSpy).toHaveBeenCalled();

  // At NONE level, no groups should be output
  logger.setLevel(LogLevel.NONE);
  groupSpy.mockClear();
  groupCollapsedSpy.mockClear();
  groupEndSpy.mockClear();

  logger.group("silent group", false);
  logger.group("silent collapsed group", true);
  logger.groupEnd();

  expect(groupSpy).not.toHaveBeenCalled();
  expect(groupCollapsedSpy).not.toHaveBeenCalled();
  expect(groupEndSpy).not.toHaveBeenCalled();
});

test("Logger child creates a child logger with combined prefixes", () => {
  const childLogger = logger.child("sub");

  const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

  childLogger.debug("child msg");

  expect(debugSpy).toHaveBeenCalledWith(
    expect.stringContaining("[FFSV3:sub] - [DEBUG]: "),
    expect.any(String),
    "child msg",
  );
});
