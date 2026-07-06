// @vitest-environment jsdom

import {
  create_ff_element,
  extract_id_from_url,
  getLocalUserId,
  torn_page,
} from "@utils/dom";
import { ffconfig } from "@utils/ffconfig";
import { beforeEach, describe, expect, test, vi } from "vitest";
import settings from "./index";

vi.mock("@utils/dom", async (importOriginal) => {
  const original = await importOriginal<typeof import("@utils/dom")>();
  return {
    ...original,
    torn_page: vi.fn(),
    extract_id_from_url: vi.fn(),
    getLocalUserId: vi.fn(),
    create_ff_element: vi.fn(),
  };
});

describe("FF Scouter settings panel feature", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = "";
    vi.clearAllMocks();
    vi.mocked(torn_page).mockImplementation((page) => page === "profiles");
    // Resolving null short-circuits run() at the "create_ff_element failed"
    // branch, which is enough to observe whether mounting was attempted
    // without needing to satisfy the rest of run()'s DOM/event wiring.
    vi.mocked(create_ff_element).mockResolvedValue(null);
  });

  test("shouldRun() is true on any profiles page, regardless of the own-profile-only toggle", async () => {
    ffconfig.settings_panel_own_profile_only = true;
    await expect(settings.shouldRun()).resolves.toBe(true);
  });

  test("shouldRun() is false off the profiles page", async () => {
    vi.mocked(torn_page).mockReturnValue(false);
    await expect(settings.shouldRun()).resolves.toBe(false);
  });

  test("mounts on any profile when the own-profile-only toggle is off", async () => {
    ffconfig.settings_panel_own_profile_only = false;
    vi.mocked(extract_id_from_url).mockReturnValue(999);
    vi.mocked(getLocalUserId).mockResolvedValue("111");

    await settings.run();

    expect(create_ff_element).toHaveBeenCalled();
  });

  test("mounts when the toggle is on and the viewed profile is the logged-in user's own", async () => {
    ffconfig.settings_panel_own_profile_only = true;
    vi.mocked(extract_id_from_url).mockReturnValue(111);
    vi.mocked(getLocalUserId).mockResolvedValue("111");

    await settings.run();

    expect(create_ff_element).toHaveBeenCalled();
  });

  test("does not mount when the toggle is on and the viewed profile is someone else's", async () => {
    ffconfig.settings_panel_own_profile_only = true;
    vi.mocked(extract_id_from_url).mockReturnValue(999);
    vi.mocked(getLocalUserId).mockResolvedValue("111");

    await settings.run();

    expect(create_ff_element).not.toHaveBeenCalled();
  });

  test("fails open (mounts) when the toggle is on but the logged-in user's own id can't be determined", async () => {
    ffconfig.settings_panel_own_profile_only = true;
    vi.mocked(extract_id_from_url).mockReturnValue(999);
    vi.mocked(getLocalUserId).mockResolvedValue(null);

    await settings.run();

    expect(create_ff_element).toHaveBeenCalled();
  });

  test("fails closed (does not mount) when the toggle is on but the current page has no XID at all", async () => {
    ffconfig.settings_panel_own_profile_only = true;
    vi.mocked(extract_id_from_url).mockReturnValue(null);

    await settings.run();

    expect(create_ff_element).not.toHaveBeenCalled();
    expect(getLocalUserId).not.toHaveBeenCalled();
  });
});
