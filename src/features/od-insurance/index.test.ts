// @vitest-environment jsdom

import {
  ECSTASY_PLAN,
  PLANS_RESPONSE,
  UNPAYABLE_PLAN,
} from "@utils/__fixtures__/od_insurance";
import { OD_INSURANCE_GUIDE_URL, query_od_insurance_plans } from "@utils/api";
import { ffconfig } from "@utils/ffconfig";
import storage, { Time } from "@utils/storage";
import { beforeEach, describe, expect, test, vi } from "vitest";
import feature from "./index";

vi.mock("@utils/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@utils/api")>()),
  query_od_insurance_plans: vi.fn(),
}));

vi.mock("@utils/dom", async (importOriginal) => {
  const original = await importOriginal<typeof import("@utils/dom")>();
  return {
    ...original,
    torn_page: (page: string) => page === "item",
  };
});

const ITEMS_HTML = `
<div class="content-wrapper"><ul>
  <li class="item-row"><img src="a.png"><span>x1005 Xanax</span></li>
  <li class="item-row"><img src="b.png"><span>x10 Vicodin</span></li>
  <li class="item-row"><img src="c.png"><span>x3 Ecstasy</span></li>
</ul></div>`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
  document.body.innerHTML = ITEMS_HTML;
  localStorage.clear();
  vi.clearAllMocks();
  ffconfig.reset();
  ffconfig.od_insurance_enabled = true;
  // The feature keeps a module-level modal instance; clear any modal a
  // previous test built (its DOM was wiped by the body reset above) by
  // toggling the setting off, which makes the feature remove itself.
  ffconfig.od_insurance_enabled = false;
  window.dispatchEvent(new CustomEvent("ff-config-updated"));
  ffconfig.od_insurance_enabled = true;
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
    await feature.run();
    const buttons = document.querySelectorAll(".ff-od-row-btn");
    expect(buttons.length).toBe(2);
  });

  test("modal lists plans and a plan shows how to buy it", async () => {
    await feature.run();
    (document.querySelector(".ff-od-row-btn") as HTMLElement).click();
    await sleep(100);
    const overlay = document.getElementById("ffscouter-od-insurance");
    expect(overlay).not.toBeNull();
    expect(overlay?.style.display).not.toBe("none");
    const plans = overlay?.querySelectorAll(".ff-od-plan");
    expect(plans?.length).toBe(2);
    expect(plans?.[0]?.textContent).toContain("Standard payout 22 Xanax");
    expect(plans?.[0]?.textContent).toContain("Overdose X payout 26 Xanax");
    (plans?.[1] as HTMLElement | undefined)?.click();
    const detail = overlay?.querySelectorAll(".ff-od-view")[1] as HTMLElement;
    expect(detail.style.display).toBe("block");
    expect(detail.textContent).toContain("20x Xanax");
    expect(detail.textContent).toContain("insurance:7days");
    expect(detail.textContent).toContain("Up to 10x");
    expect(detail.textContent).toContain("Standard payout:");
    expect(detail.textContent).toContain("Overdose X payout:");
  });

  test("shows Retry and a page link when plans fail with nothing stored", async () => {
    vi.mocked(query_od_insurance_plans).mockRejectedValue(new Error("offline"));
    await feature.run();
    (document.querySelector(".ff-od-row-btn") as HTMLElement).click();
    await sleep(100);
    const modal = document.getElementById("ffscouter-od-insurance");
    expect(modal?.textContent).toContain("Plans did not load");
    expect(
      modal?.querySelector(`a[href="${OD_INSURANCE_GUIDE_URL}"]`),
    ).not.toBeNull();

    vi.mocked(query_od_insurance_plans).mockResolvedValue({
      result: PLANS_RESPONSE,
      blank: false,
    });
    const retry = [...(modal?.querySelectorAll("button") ?? [])].find(
      (b) => b.textContent === "Retry",
    );
    retry?.click();
    await sleep(100);
    expect(
      document.querySelectorAll("#ffscouter-od-insurance .ff-od-plan").length,
    ).toBe(2);
  });

  test("shows a stored list with a note when the refresh fails", async () => {
    storage.set(
      "od-insurance-plans",
      { response: PLANS_RESPONSE, fetched_at: Date.now() - 60 * 60 * 1000 },
      { amount: 23, unit: Time.Hours },
    );
    vi.mocked(query_od_insurance_plans).mockRejectedValue(new Error("offline"));
    await feature.run();
    (document.querySelector(".ff-od-row-btn") as HTMLElement).click();
    await sleep(100);
    const modal = document.getElementById("ffscouter-od-insurance");
    expect(modal?.querySelectorAll(".ff-od-plan").length).toBe(2);
    expect(modal?.textContent).toContain("The live list did not load");
  });

  test("removes the row buttons when no plan is payable", async () => {
    vi.mocked(query_od_insurance_plans).mockResolvedValue({
      result: { ...PLANS_RESPONSE, plans: [UNPAYABLE_PLAN] },
      blank: false,
    });
    await feature.run();
    await sleep(0);
    expect(document.querySelectorAll(".ff-od-row-btn").length).toBe(0);
  });

  test("disabling the setting removes buttons and modal", async () => {
    await feature.run();
    (document.querySelector(".ff-od-row-btn") as HTMLElement).click();
    await sleep(100);
    expect(document.querySelectorAll(".ff-od-row-btn").length).toBe(2);
    ffconfig.od_insurance_enabled = false;
    window.dispatchEvent(new CustomEvent("ff-config-updated"));
    expect(document.querySelectorAll(".ff-od-row-btn").length).toBe(0);
    expect(document.getElementById("ffscouter-od-insurance")).toBeNull();
  });
});

describe("OD Insurance plans without a recipient", () => {
  test("are hidden from the modal", async () => {
    vi.mocked(query_od_insurance_plans).mockResolvedValue({
      result: { ...PLANS_RESPONSE, plans: [UNPAYABLE_PLAN, ECSTASY_PLAN] },
      blank: false,
    });
    await feature.run();
    (document.querySelector(".ff-od-row-btn") as HTMLElement).click();
    await sleep(100);
    const plans = document.querySelectorAll(
      "#ffscouter-od-insurance .ff-od-plan",
    );
    expect(plans.length).toBe(1);
    expect(plans[0]?.textContent).toContain(ECSTASY_PLAN.name);
  });

  test("leave a not-taking-policies message and a guide link", async () => {
    vi.mocked(query_od_insurance_plans).mockResolvedValue({
      result: {
        manager_player_id: null,
        manager_name: null,
        plans: [UNPAYABLE_PLAN],
      },
      blank: false,
    });
    await feature.run();
    (document.querySelector(".ff-od-row-btn") as HTMLElement).click();
    await sleep(100);
    const modal = document.getElementById("ffscouter-od-insurance");
    expect(modal?.querySelectorAll(".ff-od-plan").length).toBe(0);
    expect(modal?.textContent).toContain(
      "OD Insurance is not taking new policies right now",
    );
    const guide = modal?.querySelector<HTMLAnchorElement>(
      `a[href="${OD_INSURANCE_GUIDE_URL}"]`,
    );
    expect(guide).not.toBeNull();
  });
});
