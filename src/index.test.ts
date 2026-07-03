// @vitest-environment jsdom

import type { Feature } from "@features/feature";
import { StartTime } from "@features/feature";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { infoSpy, errorSpy } = vi.hoisted(() => ({
  infoSpy: vi.fn(),
  errorSpy: vi.fn(),
}));

let mockFeatures: Feature[] = [];

vi.mock("@features/index", () => ({
  get Features() {
    return mockFeatures;
  },
}));

vi.mock("@utils/dom", () => ({
  wait_for_body: vi.fn().mockResolvedValue(true),
}));

vi.mock("@utils/ffscouter", () => ({
  ffscouter: { analytics_enabled: false },
}));

vi.mock("@utils/migrate", () => ({
  run_migration: vi.fn(),
}));

vi.mock("@utils/network", () => ({
  registerHttpInterceptor: vi.fn(),
}));

vi.mock("./ui", () => ({
  init_ui: vi.fn(),
}));

vi.mock("@utils/logger", () => ({
  default: {
    child: () => ({
      debug: vi.fn(),
      info: infoSpy,
      warn: vi.fn(),
      error: errorSpy,
    }),
  },
}));

const INJECTION_KEY = "__FF_SCOUTER_V2_INJECTED__";

function makeFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    name: "test feature",
    description: "",
    executionTime: StartTime.DocumentBody,
    shouldRun: vi.fn().mockResolvedValue(true),
    run: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

async function flush() {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe("main() boot sequence", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute(INJECTION_KEY);
    mockFeatures = [];
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  test("is idempotent across repeated injections into the same document", async () => {
    const feat = makeFeature();
    mockFeatures = [feat];

    await import("./index");
    await flush();
    expect(feat.run).toHaveBeenCalledTimes(1);

    // Simulate a second, independent injection into the same document
    // (e.g. a duplicate script registration or a separate isolated realm).
    vi.resetModules();
    await import("./index");
    await flush();

    expect(feat.run).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledWith("Script already injected");
  });

  test("a feature whose shouldRun() throws does not prevent other features from running", async () => {
    const broken = makeFeature({
      name: "broken",
      shouldRun: vi.fn().mockRejectedValue(new Error("boom")),
    });
    const healthy = makeFeature({ name: "healthy" });
    mockFeatures = [broken, healthy];

    await import("./index");
    await flush();

    expect(healthy.run).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('shouldRun() threw for feature "broken"'),
      expect.any(Error),
    );
  });

  test("a feature whose run() rejects is logged instead of crashing the boot sequence", async () => {
    const broken = makeFeature({
      name: "broken-run",
      run: vi.fn().mockRejectedValue(new Error("kaboom")),
    });
    const healthy = makeFeature({ name: "healthy" });
    mockFeatures = [broken, healthy];

    await import("./index");
    await flush();

    expect(healthy.run).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('run() threw for feature "broken-run"'),
      expect.any(Error),
    );
  });
});
