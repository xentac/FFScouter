// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { check_key } from "./api";
import { CheckKeyStatus } from "./check_key";
import { FFConfig } from "./ffconfig";
import { Storage } from "./storage";

vi.mock("./api", () => {
  return {
    check_key: vi.fn(),
  };
});

let mockConfig: FFConfig;
let testStorage: Storage;
let checkKeyStatusHelper: CheckKeyStatus;

const mockCheckSuccess = {
  key: "test-api-key",
  is_registered: true,
  registered_at: 1000,
  last_used: 2000,
  policy_version: 1,
  policy_update_required: false,
  is_premium: true,
  premium_expires_at: 5000,
  faction_id: 123,
  faction_premium_expires_at: 5000,
  premium_entitlement_source: "patreon",
};

beforeEach(() => {
  vi.useFakeTimers();
  const date = new Date("2026-05-20T00:00:00Z");
  vi.setSystemTime(date);

  localStorage.clear();
  vi.clearAllMocks();

  mockConfig = new FFConfig("test-config");
  mockConfig.key = "test-api-key";

  testStorage = new Storage("test-check-status.");
  checkKeyStatusHelper = new CheckKeyStatus(mockConfig, testStorage);
});

afterEach(() => {
  vi.useRealTimers();
});

test("check_key_status calls check_key on cache miss and caches response", async () => {
  vi.mocked(check_key).mockResolvedValue({
    result: mockCheckSuccess,
    blank: false,
  });

  const result = await checkKeyStatusHelper.check_key_status();

  expect(check_key).toHaveBeenCalledWith("test-api-key");
  expect(result).toEqual(mockCheckSuccess);

  // Subsequent call should hit cache and not call check_key again
  vi.clearAllMocks();
  const resultCached = await checkKeyStatusHelper.check_key_status();
  expect(check_key).not.toHaveBeenCalled();
  expect(resultCached).toEqual(mockCheckSuccess);
});

test("check_key_status bypasses cache when force is true", async () => {
  vi.mocked(check_key).mockResolvedValue({
    result: mockCheckSuccess,
    blank: false,
  });

  await checkKeyStatusHelper.check_key_status();
  expect(check_key).toHaveBeenCalledTimes(1);

  // Subsequent call with force = true should query API again
  await checkKeyStatusHelper.check_key_status(true);
  expect(check_key).toHaveBeenCalledTimes(2);
});

test("check_key_status handles blank or API error gracefully", async () => {
  // Mock API throwing an error
  vi.mocked(check_key).mockRejectedValue(new Error("API failure"));

  const result = await checkKeyStatusHelper.check_key_status();
  expect(result).toBeNull();

  // Mock API returning blank
  vi.mocked(check_key).mockResolvedValue({ blank: true });
  const resultBlank = await checkKeyStatusHelper.check_key_status(true);
  expect(resultBlank).toBeNull();
});

test("check_key_status cache expires after 5 minutes", async () => {
  vi.mocked(check_key).mockResolvedValue({
    result: mockCheckSuccess,
    blank: false,
  });

  await checkKeyStatusHelper.check_key_status();
  expect(check_key).toHaveBeenCalledTimes(1);

  // Advance time by 4 minutes 59 seconds (cache still valid)
  vi.advanceTimersByTime(5 * 60 * 1000 - 1000);
  await checkKeyStatusHelper.check_key_status();
  expect(check_key).toHaveBeenCalledTimes(1);

  // Advance time past 5 minutes (cache expired)
  vi.advanceTimersByTime(2000);
  await checkKeyStatusHelper.check_key_status();
  expect(check_key).toHaveBeenCalledTimes(2);
});

test("is_premium returns correct premium state", async () => {
  // Case 1: Premium is true
  vi.mocked(check_key).mockResolvedValue({
    result: mockCheckSuccess,
    blank: false,
  });
  expect(await checkKeyStatusHelper.is_premium()).toBe(true);

  // Case 2: Premium is false
  vi.mocked(check_key).mockResolvedValue({
    result: { ...mockCheckSuccess, is_premium: false },
    blank: false,
  });
  expect(await checkKeyStatusHelper.is_premium(true)).toBe(false);

  // Case 3: API fails (returns null)
  vi.mocked(check_key).mockResolvedValue({ blank: true });
  expect(await checkKeyStatusHelper.is_premium(true)).toBe(false);
});
