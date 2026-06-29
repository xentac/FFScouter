// @vitest-environment jsdom

import * as fs from "node:fs";
import * as path from "node:path";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { ffconfig } from "@utils/ffconfig";
import { createRef } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  type FactionFilterBoxHandle,
  FFFactionFilterBox,
} from "./faction-filter-box";

function setup(
  props: Partial<{
    mode: "faction" | "war";
    onFilterChange: (s: any) => void;
  }> = {},
) {
  const events: any[] = [];
  const ref = createRef<FactionFilterBoxHandle | null>();
  const onFilterChange = props.onFilterChange ?? ((s: any) => events.push(s));
  const result = render(
    <FFFactionFilterBox
      ref={ref}
      mode={props.mode ?? "faction"}
      onFilterChange={onFilterChange}
    />,
  );
  return { ...result, ref, events };
}

beforeEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
  ffconfig.reset();
});

afterEach(() => {
  vi.useRealTimers();
});

test("renders with default state and dispatches filter-change on mount", async () => {
  const { container, events } = setup();
  await waitFor(() => expect(events.length).toBeGreaterThan(0));
  expect(events[0].sortBy).toBe("none");
  expect(events[0].activity.online).toBe(true);
  expect(events[0].status.okay).toBe(true);
  expect(container.querySelector("summary")?.textContent?.trim()).toBe(
    "FFScouter Filter & Sort Controls",
  );
});

test("updates sort and activity state and dispatches filter-change", async () => {
  vi.useFakeTimers();
  const { container, events } = setup();
  await act(async () => {
    vi.advanceTimersByTime(10);
  });

  const button = container.querySelector(
    "#sort-toggle-btn",
  ) as HTMLButtonElement;
  button.click(); // none → ff-desc
  button.click(); // ff-desc → ff-asc
  expect(events.at(-1).sortBy).toBe("ff-asc");

  const [onlineCheckbox] = Array.from(
    container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
  ) as [HTMLInputElement];
  fireEvent.click(onlineCheckbox);
  expect(events.at(-1).activity.online).toBe(false);
});

test("debounces level input changes by 250ms", async () => {
  vi.useFakeTimers();
  const { container, events } = setup();
  await act(async () => {
    vi.advanceTimersByTime(10);
  });
  const initialCount = events.length;

  const minLvl = container.querySelector<HTMLInputElement>(
    'input[placeholder="Min"]',
  )!;
  fireEvent.change(minLvl, { target: { value: "50" } });
  expect(events.length).toBe(initialCount); // not yet

  await act(async () => {
    vi.advanceTimersByTime(250);
  });
  expect(events.at(-1).levelMin).toBe(50);
});

test("debounces stats input and parses suffix numbers", async () => {
  vi.useFakeTimers();
  const { container, events } = setup();
  await act(async () => {
    vi.advanceTimersByTime(10);
  });

  const statsGroup = Array.from(
    container.querySelectorAll(".ff-filter-box__group"),
  ).find((g) => g.querySelector("strong")?.textContent === "Stats Range")!;
  const [minInput, maxInput] = Array.from(
    statsGroup.querySelectorAll<HTMLInputElement>(
      'input[placeholder="Min"], input[placeholder="Max"]',
    ),
  ) as [HTMLInputElement, HTMLInputElement];

  fireEvent.change(minInput, { target: { value: "1.5m" } });
  await act(async () => {
    vi.advanceTimersByTime(250);
  });
  expect(events.at(-1).statsMin).toBe(1500000);

  fireEvent.change(maxInput, { target: { value: "2b" } });
  await act(async () => {
    vi.advanceTimersByTime(250);
  });
  expect(events.at(-1).statsMax).toBe(2000000000);
});

test("supports toggle expand/collapse state saving to localStorage", async () => {
  ffconfig.faction_filter_collapsed = true;
  const { container } = setup();
  await waitFor(() => {
    const d = container.querySelector("details")!;
    expect(d.open).toBe(false);
  });

  const details = container.querySelector("details") as HTMLDetailsElement;
  details.open = true;
  details.dispatchEvent(new Event("toggle"));
  expect(ffconfig.faction_filter_collapsed).toBe(false);

  details.open = false;
  details.dispatchEvent(new Event("toggle"));
  expect(ffconfig.faction_filter_collapsed).toBe(true);
});

test("handles display mode dropdown and dynamic config updates", async () => {
  const { container, ref } = setup();
  await waitFor(() => expect(ref.current).not.toBeNull());

  const select = container.querySelector<HTMLSelectElement>(
    "#factions-col-display-filter",
  )!;
  expect(select).not.toBeNull();

  let configEventFired = false;
  const onConfig = () => {
    configEventFired = true;
  };
  window.addEventListener("ff-config-updated", onConfig);

  try {
    select.value = "fair_fight";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    expect(ffconfig.factions_col_display).toBe("fair_fight");
    expect(configEventFired).toBe(true);

    // Sort button now says "FF" not "Stats"
    const sortBtn =
      container.querySelector<HTMLButtonElement>("#sort-toggle-btn")!;
    sortBtn.click(); // none → ff-desc
    await waitFor(() => expect(sortBtn.textContent?.trim()).toContain("FF ▼"));

    // External config update reloads colDisplay
    ffconfig.factions_col_display = "battle_stats" as any;
    window.dispatchEvent(new CustomEvent("ff-config-updated"));
    await waitFor(() => expect(select.value).toBe("battle_stats"));
    await waitFor(() =>
      expect(sortBtn.textContent?.trim()).toContain("Stats ▼"),
    );
  } finally {
    window.removeEventListener("ff-config-updated", onConfig);
  }
});

test("supports mode='war' styling and independent configs", async () => {
  const { container, ref } = setup({ mode: "war" });
  await waitFor(() => expect(ref.current).not.toBeNull());

  const details = container.querySelector("details")!;
  expect(details.classList.contains("ff-filter-box--no-borders")).toBe(true);

  const select = container.querySelector<HTMLSelectElement>(
    "#war-col-display-filter",
  )!;
  expect(select).not.toBeNull();
  select.value = "fair_fight";
  select.dispatchEvent(new Event("change", { bubbles: true }));
  expect(ffconfig.war_col_display).toBe("fair_fight");
  expect(ffconfig.factions_col_display).toBe("battle_stats");
});

test("supports column visibility toggles and reactive container attributes in war mode", async () => {
  const warWrapper = document.createElement("div");
  warWrapper.className = "faction-war";
  document.body.appendChild(warWrapper);

  const ref = createRef<FactionFilterBoxHandle | null>();
  const events: any[] = [];
  const { container } = render(
    <FFFactionFilterBox
      ref={ref}
      mode="war"
      onFilterChange={(s) => events.push(s)}
    />,
    { container: warWrapper },
  );
  await waitFor(() => expect(ref.current).not.toBeNull());

  const grpColumns = container.querySelector(".ff-filter-box__group--columns")!;
  expect(grpColumns).not.toBeNull();
  expect(grpColumns.querySelector("strong")?.textContent).toBe(
    "Visible Columns",
  );

  const [lvlCheckbox, statusCheckbox, scoreCheckbox] = Array.from(
    grpColumns.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
  ) as [HTMLInputElement, HTMLInputElement, HTMLInputElement];
  expect(lvlCheckbox.checked).toBe(true);
  expect(statusCheckbox.checked).toBe(true);
  expect(scoreCheckbox.checked).toBe(true);

  expect(warWrapper.hasAttribute("data-ffscouter-hide-level")).toBe(false);

  fireEvent.click(lvlCheckbox);
  await waitFor(() =>
    expect(warWrapper.getAttribute("data-ffscouter-hide-level")).toBe("true"),
  );
  expect(ffconfig.war_filter_state?.hiddenColumns?.level).toBe(true);

  fireEvent.click(lvlCheckbox);
  await waitFor(() =>
    expect(warWrapper.hasAttribute("data-ffscouter-hide-level")).toBe(false),
  );
  expect(ffconfig.war_filter_state?.hiddenColumns?.level).toBe(false);

  // Columns section absent in faction mode — rerender with new props
  render(
    <FFFactionFilterBox
      ref={ref}
      mode="faction"
      onFilterChange={(s) => events.push(s)}
    />,
    { container: warWrapper },
  );
  await waitFor(() =>
    expect(
      container.querySelector(".ff-filter-box__group--columns"),
    ).toBeNull(),
  );

  document.body.removeChild(warWrapper);
});

test("renders compare activity button only in war mode", async () => {
  const { container, rerender, ref } = setup();
  await waitFor(() => expect(ref.current).not.toBeNull());

  expect(container.querySelector("#compare-faction-activity-btn")).toBeNull();

  rerender(
    <FFFactionFilterBox ref={ref} mode="war" onFilterChange={() => {}} />,
  );
  await waitFor(() =>
    expect(
      container.querySelector("#compare-faction-activity-btn"),
    ).not.toBeNull(),
  );
});

test("compare activity button opens correct URL when links are inside the container", async () => {
  const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
  const warWrapper = document.createElement("div");
  warWrapper.className = "faction-war";
  document.body.appendChild(warWrapper);

  const link1 = document.createElement("a");
  link1.href = "https://www.torn.com/factions.php?step=profile&ID=9524";
  warWrapper.appendChild(link1);
  const link2 = document.createElement("a");
  link2.href = "https://www.torn.com/factions.php?step=profile&ID=22295";
  warWrapper.appendChild(link2);

  // Render into a child mount node (not warWrapper itself) so React doesn't
  // reconcile away the pre-existing link siblings.
  const mount = document.createElement("div");
  warWrapper.appendChild(mount);
  const ref = createRef<FactionFilterBoxHandle | null>();
  render(
    <FFFactionFilterBox ref={ref} mode="war" onFilterChange={() => {}} />,
    {
      container: mount,
    },
  );
  await waitFor(() => expect(ref.current).not.toBeNull());

  const btn = mount.querySelector<HTMLButtonElement>(
    "#compare-faction-activity-btn",
  )!;
  fireEvent.click(btn);

  expect(openSpy).toHaveBeenCalled();
  const url = new URL(openSpy.mock.calls[0]![0] as string);
  expect(url.origin).toBe("https://ffscouter.com");
  expect(url.pathname).toBe("/faction-activity-comparison");
  expect(url.searchParams.get("faction_id_1")).toBe("9524");
  expect(url.searchParams.get("faction_id_2")).toBe("22295");
  expect(url.searchParams.get("bucket_minutes")).toBe("5");
  const startAt = url.searchParams.get("start_at")!;
  const endAt = url.searchParams.get("end_at")!;
  expect(
    new Date(`${endAt}Z`).getTime() - new Date(`${startAt}Z`).getTime(),
  ).toBe(7 * 24 * 60 * 60 * 1000);

  openSpy.mockRestore();
  document.body.removeChild(warWrapper);
});

test("compare activity button falls back to document links if not inside container", async () => {
  const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
  const link1 = document.createElement("a");
  link1.href = "https://www.torn.com/factions.php?step=profile&ID=9524";
  document.body.appendChild(link1);
  const link2 = document.createElement("a");
  link2.href = "https://www.torn.com/factions.php?step=profile&ID=22295";
  document.body.appendChild(link2);

  const { container, ref } = setup({ mode: "war" });
  await waitFor(() => expect(ref.current).not.toBeNull());

  const btn = container.querySelector<HTMLButtonElement>(
    "#compare-faction-activity-btn",
  )!;
  fireEvent.click(btn);
  expect(openSpy).toHaveBeenCalled();
  const url = new URL(openSpy.mock.calls[0]![0] as string);
  expect(url.searchParams.get("faction_id_1")).toBe("9524");

  openSpy.mockRestore();
});

test("compare activity button warns when faction IDs are missing", async () => {
  const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  const { container, ref } = setup({ mode: "war" });
  await waitFor(() => expect(ref.current).not.toBeNull());

  const btn = container.querySelector<HTMLButtonElement>(
    "#compare-faction-activity-btn",
  )!;
  fireEvent.click(btn);
  expect(openSpy).not.toHaveBeenCalled();
  expect(warnSpy).toHaveBeenCalledWith(
    "Could not find faction IDs to compare activity.",
  );

  openSpy.mockRestore();
  warnSpy.mockRestore();
});

test("defaults to level column hidden on mobile viewport", async () => {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: 375,
  });
  const warWrapper = document.createElement("div");
  warWrapper.className = "faction-war";
  document.body.appendChild(warWrapper);

  const ref = createRef<FactionFilterBoxHandle | null>();
  const { container } = render(
    <FFFactionFilterBox ref={ref} mode="war" onFilterChange={() => {}} />,
    { container: warWrapper },
  );
  await waitFor(() => expect(ref.current).not.toBeNull());

  const grpColumns = container.querySelector(".ff-filter-box__group--columns")!;
  const [lvlCheckbox] = Array.from(
    grpColumns.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
  ) as [HTMLInputElement];
  expect(lvlCheckbox.checked).toBe(false);
  await waitFor(() =>
    expect(warWrapper.getAttribute("data-ffscouter-hide-level")).toBe("true"),
  );

  document.body.removeChild(warWrapper);
});

test("separates desktop and mobile visible column settings", async () => {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: 1024,
  });
  const warWrapper = document.createElement("div");
  warWrapper.className = "faction-war";
  document.body.appendChild(warWrapper);

  const ref = createRef<FactionFilterBoxHandle | null>();
  render(
    <FFFactionFilterBox ref={ref} mode="war" onFilterChange={() => {}} />,
    { container: warWrapper },
  );
  await waitFor(() => expect(ref.current).not.toBeNull());

  const getCheckbox = () =>
    warWrapper.querySelector<HTMLInputElement>(
      ".ff-filter-box__group--columns input[type='checkbox']",
    )!;

  expect(getCheckbox().checked).toBe(true);
  getCheckbox().click();
  await waitFor(() =>
    expect(ffconfig.war_filter_state?.hiddenColumns?.level).toBe(true),
  );
  expect(ffconfig.war_filter_state?.hiddenColumnsMobile?.level).toBe(true);

  getCheckbox().click();
  await waitFor(() =>
    expect(ffconfig.war_filter_state?.hiddenColumns?.level).toBe(false),
  );
  expect(ffconfig.war_filter_state?.hiddenColumnsMobile?.level).toBe(true);

  // Switch to mobile
  Object.defineProperty(window, "innerWidth", { value: 375 });
  window.dispatchEvent(new Event("resize"));
  await waitFor(() => expect(getCheckbox().checked).toBe(false));

  getCheckbox().click();
  await waitFor(() =>
    expect(ffconfig.war_filter_state?.hiddenColumnsMobile?.level).toBe(false),
  );
  expect(ffconfig.war_filter_state?.hiddenColumns?.level).toBe(false);

  document.body.removeChild(warWrapper);
});

test("has correct mobile order for filter groups", async () => {
  const cssPath = path.resolve(__dirname, "./faction-filter-box.module.css");
  const cssContent = fs.readFileSync(cssPath, "utf-8");
  const styleEl = document.createElement("style");
  styleEl.textContent = cssContent;
  document.head.appendChild(styleEl);

  try {
    const ref = createRef<FactionFilterBoxHandle | null>();
    const { container } = render(
      <FFFactionFilterBox ref={ref} mode="war" onFilterChange={() => {}} />,
    );
    // hasLastActionData needs to be set via handle after mount
    await waitFor(() => expect(ref.current).not.toBeNull());
    ref.current!.setHasLastActionData(true);
    await waitFor(() =>
      expect(
        container.querySelector(".ff-filter-box__group--last-action"),
      ).not.toBeNull(),
    );

    const getOrder = (selector: string) => {
      const target = container.querySelector(selector);
      if (!target) return "";
      return window.getComputedStyle(target).order;
    };

    expect(getOrder(".ff-filter-box__group--sort")).toBe("1");
    expect(getOrder(".ff-filter-box__group--level")).toBe("2");
    expect(getOrder(".ff-filter-box__group--activity")).toBe("3");
    expect(getOrder(".ff-filter-box__group--status")).toBe("4");
    expect(getOrder(".ff-filter-box__group--ff")).toBe("5");
    expect(getOrder(".ff-filter-box__group--stats")).toBe("6");
    expect(getOrder(".ff-filter-box__group--last-action")).toBe("7");
    expect(getOrder(".ff-filter-box__group--columns")).toBe("8");
  } finally {
    document.head.removeChild(styleEl);
  }
});

test("setSortBy via ref updates sortBy and dispatches filter-change", async () => {
  const { ref, events } = setup();
  await waitFor(() => expect(ref.current).not.toBeNull());
  const initialCount = events.length;

  ref.current!.setSortBy("ff-desc");
  expect(ref.current!.sortBy).toBe("ff-desc");
  expect(events[initialCount].sortBy).toBe("ff-desc");

  ref.current!.setSortBy("ff-asc");
  expect(ref.current!.sortBy).toBe("ff-asc");
  expect(events.at(-1).sortBy).toBe("ff-asc");

  ref.current!.setSortBy("none");
  expect(ref.current!.sortBy).toBe("none");
  expect(events.at(-1).sortBy).toBe("none");
});

test("supports toggling filtering on and off", async () => {
  const { container, ref, events } = setup();
  await waitFor(() => expect(ref.current).not.toBeNull());

  const toggleBtn = container.querySelector<HTMLButtonElement>(
    ".ff-filter-box__action-btn:not(.ff-filter-box__action-btn--reset)",
  )!;
  toggleBtn.click();
  await waitFor(() => expect(events.at(-1).filterEnabled).toBe(false));
  expect(ffconfig.faction_filter_state?.filterEnabled).toBe(false);

  toggleBtn.click();
  await waitFor(() => expect(events.at(-1).filterEnabled).toBe(true));
});

test("supports resetting filters to defaults while keeping sort", async () => {
  vi.useFakeTimers();
  const { container, ref, events } = setup();
  // render() mounts synchronously, so the imperative handle is already set.
  expect(ref.current).not.toBeNull();

  const [onlineCheckbox] = Array.from(
    container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
  ) as [HTMLInputElement];
  fireEvent.click(onlineCheckbox);

  const sortBtn =
    container.querySelector<HTMLButtonElement>("#sort-toggle-btn")!;
  sortBtn.click(); // none → ff-desc

  const resetBtn = container.querySelector<HTMLButtonElement>(
    ".ff-filter-box__action-btn--reset",
  )!;
  resetBtn.click();

  await act(async () => {
    vi.advanceTimersByTime(10);
  });

  expect(events.at(-1).activity.online).toBe(true);
  expect(events.at(-1).levelMin).toBeNull();
  expect(events.at(-1).sortBy).toBe("ff-desc"); // sort untouched by reset
});

test("only renders Last Action Range group in war mode with hasLastActionData", async () => {
  const { container, ref, rerender } = setup();
  await waitFor(() => expect(ref.current).not.toBeNull());

  const findGroup = () =>
    Array.from(container.querySelectorAll(".ff-filter-box__group")).find(
      (g) => g.querySelector("strong")?.textContent === "Last Action Range",
    );

  expect(findGroup()).toBeUndefined();

  // faction mode, data detected: still absent (war-only feature)
  await act(async () => {
    ref.current!.setHasLastActionData(true);
  });
  expect(findGroup()).toBeUndefined();

  // war mode, no data: absent (reset the carried-over flag first)
  rerender(
    <FFFactionFilterBox ref={ref} mode="war" onFilterChange={() => {}} />,
  );
  await act(async () => {
    ref.current!.setHasLastActionData(false);
  });
  expect(findGroup()).toBeUndefined();

  // war mode + data detected: present
  await act(async () => {
    ref.current!.setHasLastActionData(true);
  });
  expect(findGroup()).not.toBeUndefined();
});

test("parses Last Action Range duration strings into seconds", async () => {
  vi.useFakeTimers();
  const ref = createRef<FactionFilterBoxHandle | null>();
  const events: any[] = [];
  const { container } = render(
    <FFFactionFilterBox
      ref={ref}
      mode="war"
      onFilterChange={(s) => events.push(s)}
    />,
  );
  expect(ref.current).not.toBeNull();

  act(() => {
    ref.current!.setHasLastActionData(true);
  });
  expect(
    container.querySelector(".ff-filter-box__group--last-action"),
  ).not.toBeNull();

  const lastActionGroup = container.querySelector(
    ".ff-filter-box__group--last-action",
  )!;
  const [minInput, maxInput] = Array.from(
    lastActionGroup.querySelectorAll<HTMLInputElement>(
      'input[placeholder="Min"], input[placeholder="Max"]',
    ),
  ) as [HTMLInputElement, HTMLInputElement];

  fireEvent.change(minInput, { target: { value: "10m" } });
  await act(async () => {
    vi.advanceTimersByTime(250);
  });
  expect(events.at(-1).lastActionMinSec).toBe(600);

  fireEvent.change(maxInput, { target: { value: "4h2m15s" } });
  await act(async () => {
    vi.advanceTimersByTime(250);
  });
  expect(events.at(-1).lastActionMaxSec).toBe(4 * 3600 + 2 * 60 + 15);

  fireEvent.change(minInput, { target: { value: "garbage" } });
  await act(async () => {
    vi.advanceTimersByTime(250);
  });
  expect(events.at(-1).lastActionMinSec).toBeNull();

  const resetBtn = container.querySelector<HTMLButtonElement>(
    ".ff-filter-box__action-btn--reset",
  )!;
  resetBtn.click();
  await act(async () => {
    vi.advanceTimersByTime(10);
  });
  expect(events.at(-1).lastActionMinSec).toBeNull();
  expect(events.at(-1).lastActionMaxSec).toBeNull();
});
