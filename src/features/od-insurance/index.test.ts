// @vitest-environment jsdom

import { gmRequest } from "@utils/api";
import { ffconfig } from "@utils/ffconfig";
import { beforeEach, describe, expect, test, vi } from "vitest";
import feature from "./index";

vi.mock("@utils/api", () => {
  return {
    gmRequest: vi.fn(),
  };
});

vi.mock("@utils/dom", async (importOriginal) => {
  const original = await importOriginal<typeof import("@utils/dom")>();
  return {
    ...original,
    torn_page: (page: string) => page === "item",
  };
});

const PLANS_RESPONSE = {
  manager_player_id: 3281931,
  manager_name: "WTV1",
  plans: [
    { name: "2 Hour Ecstasy Insurance", xanax_quantity: 1, max_multiplier: 50, duration_label: "2 hours", standard_payout_xanax: 22, overdose_payout_xanax: 26, payment: { recipient_player_id: 3281931, recipient_name: "WTV1", xanax_quantity: 1, message: "insurance:ecstasy" } },
    { name: "2 Hour Xanax Insurance", xanax_quantity: 1, max_multiplier: 50, duration_label: "2 hours", standard_payout_xanax: 33, overdose_payout_xanax: 39, payment: { recipient_player_id: 3281931, recipient_name: "WTV1", xanax_quantity: 1, message: "insurance:xanax" } },
    { name: "7 Day Xanax Insurance / Multiple Xanax OD's Payout", xanax_quantity: 20, max_multiplier: 10, duration_label: "7 days", standard_payout_xanax: 31, overdose_payout_xanax: 37, payment: { recipient_player_id: 3281931, recipient_name: "WTV1", xanax_quantity: 20, message: "insurance:7days" } },
    { name: "30 Day Xanax Insurance / Multiple Xanax OD's Payout", xanax_quantity: 80, max_multiplier: 5, duration_label: "30 days", standard_payout_xanax: 31, overdose_payout_xanax: 37, payment: { recipient_player_id: 3281931, recipient_name: "WTV1", xanax_quantity: 80, message: "insurance:30days" } },
  ],
};

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
  vi.mocked(gmRequest).mockResolvedValue({
    status: 200,
    responseText: JSON.stringify(PLANS_RESPONSE),
  } as any);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new Error("offline")),
  );
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
    expect(plans?.length).toBe(4);
    expect(plans?.[0]?.textContent).toContain("Standard payout 22 Xanax");
    expect(plans?.[0]?.textContent).toContain("Overdose X payout 26 Xanax");
    (plans?.[2] as HTMLElement).click();
    const detail = overlay?.querySelectorAll(".ff-od-view")[1] as HTMLElement;
    expect(detail.style.display).toBe("block");
    expect(detail.textContent).toContain("20x Xanax");
    expect(detail.textContent).toContain("insurance:7days");
    expect(detail.textContent).toContain("Up to 10x");
    expect(detail.textContent).toContain("Standard payout:");
    expect(detail.textContent).toContain("Overdose X payout:");
  });

  test("falls back to the built-in plans when the API is unreachable", async () => {
    vi.mocked(gmRequest).mockRejectedValue(new Error("offline"));
    await feature.run();
    (document.querySelector(".ff-od-row-btn") as HTMLElement).click();
    await sleep(100);
    const plans = document.querySelectorAll(
      "#ffscouter-od-insurance .ff-od-plan",
    );
    expect(plans.length).toBe(4);
    expect(plans[0]?.textContent).toContain("2 Hour Ecstasy Insurance");
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
