// @vitest-environment jsdom
import { act, waitFor } from "@testing-library/react";
import {
  PLANS_RESPONSE,
  UNPAYABLE_PLAN,
} from "@utils/__fixtures__/od_insurance";
import { query_od_insurance_plans } from "@utils/api";
import { torn_page } from "@utils/dom";
import { ffconfig } from "@utils/ffconfig";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import skeleton from "./__fixtures__/torn-markup/2026-11-12/item-category-wrap-skeleton.html?raw";
import drugsPlain from "./__fixtures__/torn-markup/2026-11-12/item-drugs-plain.html?raw";
import drugsTornTools from "./__fixtures__/torn-markup/2026-11-12/item-drugs-torntools.html?raw";
import searchXanaxTornTools from "./__fixtures__/torn-markup/2026-11-12/item-search-xanax-torntools.html?raw";
import feature, { stop_od_insurance } from "./index";

vi.mock("@utils/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@utils/api")>()),
  query_od_insurance_plans: vi.fn(),
}));

vi.mock("@utils/dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@utils/dom")>()),
  torn_page: vi.fn(),
}));

// Replaces one panel of the #category-wrap skeleton with a captured panel,
// the way Torn fills a tab or the search results.
const fill_panel = (html: string) => {
  const panel = document.createElement("div");
  panel.innerHTML = html;
  const ul = panel.querySelector("ul.items-cont") as HTMLElement;
  document.getElementById(ul.id)?.replaceWith(ul);
};

const row_buttons = () =>
  [...document.querySelectorAll("[data-ff-od-slot] button")] as HTMLElement[];

const row_items = () =>
  row_buttons().map((b) => b.closest("li")?.getAttribute("data-item"));

const set_enabled = (enabled: boolean) => {
  ffconfig.od_insurance_enabled = enabled;
  act(() => {
    window.dispatchEvent(new CustomEvent("ff-config-updated"));
  });
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  ffconfig.reset();
  vi.mocked(torn_page).mockImplementation((page) => page === "item");
  vi.mocked(query_od_insurance_plans).mockResolvedValue({
    result: PLANS_RESPONSE,
    blank: false,
  });
  document.body.innerHTML = skeleton;
});

afterEach(() => {
  act(() => stop_od_insurance());
  document.body.innerHTML = "";
});

describe("shouldRun", () => {
  test("runs on item.php whatever the toggle says", async () => {
    await expect(feature.shouldRun()).resolves.toBe(true);
    ffconfig.od_insurance_enabled = false;
    await expect(feature.shouldRun()).resolves.toBe(true);
  });

  test("does not run on other pages", async () => {
    vi.mocked(torn_page).mockReturnValue(false);
    await expect(feature.shouldRun()).resolves.toBe(false);
  });
});

describe("rows", () => {
  test("adds buttons to the Xanax and Ecstasy rows only", async () => {
    fill_panel(drugsTornTools);
    await act(() => feature.run());
    await waitFor(() => expect(row_items()).toEqual(["197", "206"]));
  });

  test("a row button opens the plans modal", async () => {
    fill_panel(drugsPlain);
    await act(() => feature.run());
    await waitFor(() => expect(row_buttons()).toHaveLength(2));
    await act(async () => row_buttons()[0]?.click());
    expect(document.querySelector("dialog")?.textContent).toContain(
      "2 Hour Ecstasy Insurance",
    );
  });

  test("finds rows that Torn renders later, in search", async () => {
    await act(() => feature.run());
    expect(row_buttons()).toHaveLength(0);
    await act(async () => fill_panel(searchXanaxTornTools));
    await waitFor(() => expect(row_items()).toEqual(["206"]));
  });

  test("drops buttons whose row Torn replaced", async () => {
    fill_panel(drugsPlain);
    await act(() => feature.run());
    await waitFor(() => expect(row_buttons()).toHaveLength(2));
    await act(async () => fill_panel(searchXanaxTornTools));
    await act(async () => {
      document.getElementById("drugs-items")?.remove();
    });
    await waitFor(() => expect(row_items()).toEqual(["206"]));
  });

  test("waits for #category-wrap when it is not there yet", async () => {
    document.body.innerHTML = "";
    await act(() => feature.run());
    await act(async () => {
      document.body.innerHTML = skeleton;
      fill_panel(drugsPlain);
    });
    await waitFor(() => expect(row_buttons()).toHaveLength(2));
  });

  test("removes the buttons when no plan is payable", async () => {
    vi.mocked(query_od_insurance_plans).mockResolvedValue({
      result: { ...PLANS_RESPONSE, plans: [UNPAYABLE_PLAN] },
      blank: false,
    });
    fill_panel(drugsPlain);
    await act(() => feature.run());
    await waitFor(() =>
      expect(query_od_insurance_plans).toHaveBeenCalledOnce(),
    );
    await waitFor(() => expect(row_buttons()).toHaveLength(0));
  });
});

describe("toggle", () => {
  test("off at load: nothing is added and nothing is fetched", async () => {
    ffconfig.od_insurance_enabled = false;
    fill_panel(drugsPlain);
    await act(() => feature.run());
    expect(row_buttons()).toHaveLength(0);
    expect(document.getElementById("ffscouter-od-insurance")).toBeNull();
    expect(query_od_insurance_plans).not.toHaveBeenCalled();
  });

  test("turning it on adds the buttons without a reload", async () => {
    ffconfig.od_insurance_enabled = false;
    fill_panel(drugsPlain);
    await act(() => feature.run());
    set_enabled(true);
    await waitFor(() => expect(row_buttons()).toHaveLength(2));
  });

  test("turning it off removes buttons, marks and modal, and stops watching", async () => {
    fill_panel(drugsPlain);
    await act(() => feature.run());
    await waitFor(() => expect(row_buttons()).toHaveLength(2));
    await act(async () => row_buttons()[0]?.click());
    expect(document.querySelector("dialog")).not.toBeNull();

    set_enabled(false);
    expect(row_buttons()).toHaveLength(0);
    expect(document.querySelector("[data-ff-od]")).toBeNull();
    expect(document.querySelector("dialog")).toBeNull();
    expect(document.getElementById("ffscouter-od-insurance")).toBeNull();

    await act(async () => fill_panel(searchXanaxTornTools));
    expect(document.querySelector("[data-ff-od-slot]")).toBeNull();
  });

  test("toggling back and forth leaves one button per row", async () => {
    fill_panel(drugsPlain);
    await act(() => feature.run());
    await act(() => feature.run());
    for (const enabled of [false, true, false, true]) set_enabled(enabled);
    await waitFor(() => expect(row_buttons()).toHaveLength(2));
    expect(document.querySelectorAll("[data-ff-od-slot]")).toHaveLength(2);
    expect(document.querySelectorAll("#ffscouter-od-insurance")).toHaveLength(
      1,
    );
  });
});
