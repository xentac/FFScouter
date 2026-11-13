// @vitest-environment jsdom
import { act, waitFor } from "@testing-library/react";
import {
  PLANS_RESPONSE,
  UNPAYABLE_PLAN,
} from "@utils/__fixtures__/od_insurance";
import { query_od_insurance_plans } from "@utils/api";
import { ffconfig } from "@utils/ffconfig";
import { beforeEach, describe, expect, test, vi } from "vitest";
import feature from "./index";

vi.mock("@utils/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@utils/api")>()),
  query_od_insurance_plans: vi.fn(),
}));

vi.mock("@utils/dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@utils/dom")>()),
  torn_page: (page: string) => page === "item",
}));

const ITEMS_HTML = `
<div class="content-wrapper"><ul>
  <li class="item-row"><img src="a.png"><span>x1005 Xanax</span></li>
  <li class="item-row"><img src="b.png"><span>x10 Vicodin</span></li>
  <li class="item-row"><img src="c.png"><span>x3 Ecstasy</span></li>
</ul></div>`;

const row_buttons = () =>
  [...document.querySelectorAll("[data-ff-od-slot] button")] as HTMLElement[];

const turn_off = () => {
  ffconfig.od_insurance_enabled = false;
  window.dispatchEvent(new CustomEvent("ff-config-updated"));
};

beforeEach(() => {
  // Turning the feature off unmounts what a previous test left behind.
  turn_off();
  document.body.innerHTML = ITEMS_HTML;
  localStorage.clear();
  vi.clearAllMocks();
  ffconfig.reset();
  vi.mocked(query_od_insurance_plans).mockResolvedValue({
    result: PLANS_RESPONSE,
    blank: false,
  });
});

describe("OD Insurance feature", () => {
  test("shouldRun only when the setting is enabled", async () => {
    await expect(feature.shouldRun()).resolves.toBe(true);
    ffconfig.od_insurance_enabled = false;
    await expect(feature.shouldRun()).resolves.toBe(false);
  });

  test("adds OD Insurance buttons to the Xanax and Ecstasy rows only", async () => {
    await act(() => feature.run());
    await waitFor(() => expect(row_buttons()).toHaveLength(2));
  });

  test("a row button opens the plans modal", async () => {
    await act(() => feature.run());
    await waitFor(() => expect(row_buttons()).toHaveLength(2));
    await act(async () => row_buttons()[0]?.click());
    const dialog = document.querySelector("dialog");
    expect(dialog?.textContent).toContain("2 Hour Ecstasy Insurance");
  });

  test("removes the row buttons when no plan is payable", async () => {
    vi.mocked(query_od_insurance_plans).mockResolvedValue({
      result: { ...PLANS_RESPONSE, plans: [UNPAYABLE_PLAN] },
      blank: false,
    });
    await act(() => feature.run());
    await waitFor(() =>
      expect(query_od_insurance_plans).toHaveBeenCalledOnce(),
    );
    await waitFor(() => expect(row_buttons()).toHaveLength(0));
  });

  test("disabling the setting removes buttons and modal", async () => {
    await act(() => feature.run());
    await waitFor(() => expect(row_buttons()).toHaveLength(2));
    await act(async () => row_buttons()[0]?.click());
    expect(document.querySelector("dialog")).not.toBeNull();
    act(() => turn_off());
    expect(row_buttons()).toHaveLength(0);
    expect(document.querySelector("dialog")).toBeNull();
    expect(document.getElementById("ffscouter-od-insurance")).toBeNull();
  });
});
