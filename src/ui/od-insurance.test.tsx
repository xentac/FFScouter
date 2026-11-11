// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  ECSTASY_PLAN,
  PLANS_RESPONSE,
  UNPAYABLE_PLAN,
  WEEKLY_PLAN,
} from "@utils/__fixtures__/od_insurance";
import { OD_INSURANCE_GUIDE_URL } from "@utils/api";
import { copy_text } from "@utils/clipboard";
import type { PlansState } from "@utils/od_insurance";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  OdInsurance,
  OdInsuranceButton,
  OdInsuranceModal,
} from "./od-insurance";

vi.mock("@utils/clipboard", () => ({ copy_text: vi.fn() }));

afterEach(cleanup);

const FRESH: PlansState = { status: "fresh", response: PLANS_RESPONSE };

const modal = (plans: PlansState | null, onRetry = vi.fn()) => {
  const onClose = vi.fn();
  const onHide = vi.fn();
  const onPick = vi.fn();
  render(
    <OdInsuranceModal
      plans={plans}
      onClose={onClose}
      onRetry={onRetry}
      onHide={onHide}
      onPick={onPick}
    />,
  );
  return { onClose, onRetry, onHide, onPick };
};

const card = (name: RegExp) => within(screen.getByRole("group", { name }));

const guide_links = () =>
  screen
    .getAllByRole("link")
    .filter((a) => a.getAttribute("href") === OD_INSURANCE_GUIDE_URL);

describe("OdInsuranceModal", () => {
  test("lists the payable plans with their payouts", () => {
    modal(FRESH);
    expect(
      screen.getByText("Managed by InsuranceManager [700001]"),
    ).toBeTruthy();
    const plan = screen.getByRole("button", { name: /2 Hour Ecstasy/ });
    expect(plan.textContent).toContain("Standard payout 22 Xanax");
    expect(plan.textContent).toContain("Overdose X payout 26 Xanax");
    expect(screen.getByRole("button", { name: /7 Day Xanax/ })).toBeTruthy();
  });

  test("shows how to buy a plan and goes back", () => {
    modal(FRESH);
    fireEvent.click(screen.getByRole("button", { name: /7 Day Xanax/ }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("20x Xanax");
    expect(dialog.textContent).toContain("insurance:7days");
    expect(dialog.textContent).toContain("Up to 10x");
    expect(dialog.textContent).toContain("Standard payout:31 Xanax");
    expect(dialog.textContent).toContain("Overdose X payout:37 Xanax");
    expect(
      screen.getByRole("link", { name: "InsuranceManager [700001]" }),
    ).toHaveProperty("href", "https://www.torn.com/profiles.php?XID=700001");

    fireEvent.click(screen.getByRole("button", { name: "← Back to plans" }));
    expect(screen.getByRole("button", { name: /2 Hour Ecstasy/ })).toBeTruthy();
  });

  test("hides plans without a recipient", () => {
    modal({
      status: "fresh",
      response: { ...PLANS_RESPONSE, plans: [UNPAYABLE_PLAN, ECSTASY_PLAN] },
    });
    expect(screen.getByRole("button", { name: /2 Hour Ecstasy/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /30 Day/ })).toBeNull();
  });

  test("says it is not taking policies when no plan is payable", () => {
    modal({
      status: "fresh",
      response: {
        manager_player_id: null,
        manager_name: null,
        plans: [UNPAYABLE_PLAN],
      },
    });
    expect(
      screen.getByText(/OD Insurance is not taking new policies right now/),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Read the OD Insurance guide" }),
    ).toBeTruthy();
    expect(screen.queryByText(/Managed by/)).toBeNull();
  });

  test("shows a stored list with a note", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-12T12:00:00Z"));
    modal({
      status: "stale",
      response: PLANS_RESPONSE,
      fetched_at: Date.now() - 3 * 60 * 60 * 1000,
    });
    vi.useRealTimers();
    expect(
      screen.getByText(
        /The live list did not load\. Showing plans saved 3 h ago/,
      ),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /2 Hour Ecstasy/ })).toBeTruthy();
  });

  test("offers Retry and a page link when plans did not load", () => {
    const { onRetry } = modal({ status: "failed" });
    expect(screen.getByText("Plans did not load.")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Read the OD Insurance guide" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  test("shows a loading line before the first answer", () => {
    modal(null);
    expect(screen.getByText("Loading plans…")).toBeTruthy();
  });

  test("links the guide and the Settings toggle in the footer", () => {
    modal(FRESH);
    expect(guide_links().length).toBeGreaterThan(0);
    expect(screen.getByRole("dialog").textContent).toContain(
      "You can turn it back on in FF Scouter Settings.",
    );
  });

  test("closes on Escape and the × button", () => {
    const { onClose } = modal(FRESH);
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Close OD Insurance" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  test("removes the Escape listener when it closes", () => {
    const remove = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(
      <OdInsuranceModal
        plans={FRESH}
        onClose={vi.fn()}
        onRetry={vi.fn()}
        onHide={vi.fn()}
        onPick={vi.fn()}
      />,
    );
    unmount();
    expect(remove).toHaveBeenCalledWith("keydown", expect.any(Function));
    remove.mockRestore();
  });

  describe("copy button", () => {
    const copy = () => {
      fireEvent.click(screen.getByRole("button", { name: /7 Day Xanax/ }));
      fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    };

    test("says Copied! when the message was copied", async () => {
      vi.mocked(copy_text).mockResolvedValue(true);
      modal(FRESH);
      copy();
      expect(copy_text).toHaveBeenCalledWith("insurance:7days");
      await waitFor(() =>
        expect(screen.getByRole("status").textContent).toBe("Copied!"),
      );
    });

    test("asks the player to select the text when copying failed", async () => {
      vi.mocked(copy_text).mockResolvedValue(false);
      modal(FRESH);
      copy();
      await waitFor(() =>
        expect(screen.getByRole("status").textContent).toBe(
          "Copy failed, select the text",
        ),
      );
    });
  });
});

describe("OdInsuranceModal helper pick", () => {
  test("each plan card has a multiplier, the Xanax total, and a pick", () => {
    modal(FRESH);
    const weekly = card(/7 Day Xanax/);
    const multiplier = weekly.getByRole("spinbutton", { name: "Multiplier" });
    expect(multiplier).toHaveProperty("value", "1");
    expect(multiplier.getAttribute("max")).toBe("10");
    expect(weekly.getByText("20 Xanax total")).toBeTruthy();

    fireEvent.change(multiplier, { target: { value: "3" } });
    expect(weekly.getByText("60 Xanax total")).toBeTruthy();
  });

  test("a pick passes the plan and the multiplier", () => {
    const { onPick } = modal(FRESH);
    const weekly = card(/7 Day Xanax/);
    fireEvent.change(weekly.getByRole("spinbutton", { name: "Multiplier" }), {
      target: { value: "3" },
    });
    fireEvent.click(weekly.getByRole("button", { name: "Buy with helper" }));
    expect(onPick).toHaveBeenCalledWith(WEEKLY_PLAN, 3);
  });

  test.each(["0", "11", "2.5", ""])(
    "a multiplier of %j cannot be picked",
    (value) => {
      const { onPick } = modal(FRESH);
      const weekly = card(/7 Day Xanax/);
      fireEvent.change(weekly.getByRole("spinbutton", { name: "Multiplier" }), {
        target: { value },
      });
      const pick = weekly.getByRole("button", { name: "Buy with helper" });
      expect(pick).toHaveProperty("disabled", true);
      fireEvent.click(pick);
      expect(onPick).not.toHaveBeenCalled();
    },
  );

  test("the plan detail keeps the Copy button", () => {
    modal(FRESH);
    fireEvent.click(screen.getByRole("button", { name: /7 Day Xanax/ }));
    expect(screen.getByRole("button", { name: "Copy" })).toBeTruthy();
  });
});

describe("OdInsuranceModal hide", () => {
  test("Hide OD Insurance calls onHide", () => {
    const { onHide } = modal(FRESH);
    fireEvent.click(screen.getByRole("button", { name: "Hide OD Insurance" }));
    expect(onHide).toHaveBeenCalledOnce();
  });

  test("offers Hide even when the plans did not load", () => {
    modal({ status: "failed" });
    expect(
      screen.getByRole("button", { name: "Hide OD Insurance" }),
    ).toBeTruthy();
  });
});

describe("OdInsuranceButton", () => {
  test("has a full and a short label, and the full accessible name", () => {
    render(<OdInsuranceButton onOpen={vi.fn()} />);
    const button = screen.getByRole("button", { name: "OD Insurance" });
    expect(
      [...button.querySelectorAll("span")].map((s) => s.textContent),
    ).toEqual(["OD Insurance", "OD Ins"]);
  });
});

describe("OdInsurance", () => {
  let slots: HTMLElement[];

  beforeEach(() => {
    slots = [document.createElement("span"), document.createElement("span")];
    for (const slot of slots) document.body.appendChild(slot);
  });

  afterEach(() => {
    cleanup();
    for (const slot of slots) slot.remove();
  });

  test("puts a button in each slot and opens the modal", async () => {
    const load = vi.fn().mockResolvedValue(FRESH);
    render(<OdInsurance slots={slots} load={load} onHide={vi.fn()} />);
    await waitFor(() => expect(load).toHaveBeenCalledOnce());
    for (const slot of slots) {
      const button = slot.querySelector("button");
      expect(button?.getAttribute("aria-label")).toBe("OD Insurance");
    }

    await act(async () => {
      slots[0]?.querySelector("button")?.click();
    });
    expect(load).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("button", { name: /2 Hour Ecstasy/ })).toBeTruthy();
  });

  test("a pick closes the modal and shows the helper it is given", async () => {
    const load = vi.fn().mockResolvedValue(FRESH);
    const onPick = vi.fn();
    const { rerender } = render(
      <OdInsurance
        slots={slots}
        load={load}
        onHide={vi.fn()}
        onPick={onPick}
      />,
    );
    await act(async () => {
      slots[0]?.querySelector("button")?.click();
    });
    fireEvent.click(
      card(/2 Hour Ecstasy/).getByRole("button", { name: "Buy with helper" }),
    );
    expect(onPick).toHaveBeenCalledWith(ECSTASY_PLAN, 1);
    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(
      <OdInsurance
        slots={slots}
        load={load}
        onHide={vi.fn()}
        onPick={onPick}
        helper={<p>helper here</p>}
      />,
    );
    expect(screen.getByText("helper here")).toBeTruthy();
  });

  test("removes the buttons when no plan is payable", async () => {
    const load = vi.fn().mockResolvedValue({
      status: "fresh",
      response: { ...PLANS_RESPONSE, plans: [UNPAYABLE_PLAN] },
    } satisfies PlansState);
    render(<OdInsurance slots={slots} load={load} onHide={vi.fn()} />);
    await waitFor(() => expect(load).toHaveBeenCalledOnce());
    await waitFor(() => expect(slots[0]?.querySelector("button")).toBeNull());
  });

  test("keeps the buttons when plans fail, and Retry loads again", async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce({ status: "failed" })
      .mockResolvedValueOnce({ status: "failed" })
      .mockResolvedValue(FRESH);
    render(<OdInsurance slots={slots} load={load} onHide={vi.fn()} />);
    await waitFor(() => expect(load).toHaveBeenCalledOnce());
    await act(async () => {
      slots[0]?.querySelector("button")?.click();
    });
    expect(screen.getByText("Plans did not load.")).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    });
    expect(screen.getByRole("button", { name: /2 Hour Ecstasy/ })).toBeTruthy();
  });
});
