// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  ATTACK_BOUNTY_SILENCE_MS,
  clear_attack_bounty_silence,
  is_attack_bounty_silenced,
  silence_attack_bounty,
} from "./bounty_attack_silence";

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("attack bounty silence", () => {
  test("is not silenced by default", () => {
    expect(is_attack_bounty_silenced()).toBe(false);
  });

  test("silencing lasts an hour, then lapses for the re-check", () => {
    silence_attack_bounty();
    expect(is_attack_bounty_silenced()).toBe(true);
    vi.advanceTimersByTime(ATTACK_BOUNTY_SILENCE_MS);
    expect(is_attack_bounty_silenced()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(is_attack_bounty_silenced()).toBe(false);
  });

  test("clearing lifts the silence immediately", () => {
    silence_attack_bounty();
    clear_attack_bounty_silence();
    expect(is_attack_bounty_silenced()).toBe(false);
  });
});
