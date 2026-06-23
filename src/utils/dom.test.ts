// @vitest-environment jsdom
import { beforeEach, expect, test, vi } from "vitest";
import regularRowIdle from "../features/faction/__fixtures__/torn-markup/2026-06-22/regular-row-idle.html?raw";
import regularRowOffline from "../features/faction/__fixtures__/torn-markup/2026-06-22/regular-row-offline.html?raw";
import regularRowOnline from "../features/faction/__fixtures__/torn-markup/2026-06-22/regular-row-online.html?raw";
import warRowIdle from "../features/faction/__fixtures__/torn-markup/2026-06-22/war-row-idle.html?raw";
import warRowOffline from "../features/faction/__fixtures__/torn-markup/2026-06-22/war-row-offline.html?raw";
import warRowOnline from "../features/faction/__fixtures__/torn-markup/2026-06-22/war-row-online.html?raw";
import {
  add_ff_arrow,
  apply_ff_gauge,
  create_ff_element,
  create_info_line,
  extract_id_from_url,
  get_activity_status,
  get_attack_url,
  get_player_id_in_element,
  getHashParameters,
  getLocalUserId,
  getRFC,
  MonitorElements,
  open_attack_link,
  torn_page,
  wait_for_body,
  wait_for_element,
  waitForDocumentReady,
} from "./dom";
import { ffconfig, GaugeMarkerType, WarQuickAttackAction } from "./ffconfig";
import { ffscouter } from "./ffscouter";

vi.mock("./ffscouter", () => {
  return {
    ffscouter: {
      get: vi.fn(),
      add_analytics_entry: vi.fn(),
    },
  };
});

beforeEach(() => {
  document.body.innerHTML = "";
  ffconfig.reset();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("extract_id_from_url extracts user IDs from standard XID and user2ID parameters", () => {
  expect(
    extract_id_from_url("https://www.torn.com/profiles.php?XID=12345"),
  ).toEqual(12345);
  expect(
    extract_id_from_url("https://www.torn.com/profiles.php?user2ID=67890"),
  ).toEqual(67890);
  expect(
    extract_id_from_url("https://www.torn.com/profiles.php?other=123"),
  ).toBeNull();
});

test("get_activity_status parses online/idle/offline from canonical Torn markup fixtures", () => {
  const cases: [string, "online" | "idle" | "offline"][] = [
    [warRowOffline, "offline"],
    [warRowOnline, "online"],
    [warRowIdle, "idle"],
    [regularRowOffline, "offline"],
    [regularRowOnline, "online"],
    [regularRowIdle, "idle"],
  ];

  for (const [html, expected] of cases) {
    document.body.innerHTML = html;
    const row = document.body.firstElementChild;
    expect(row).not.toBeNull();
    expect(get_activity_status(row as Element)).toBe(expected);
  }
});

test("torn_page matches the current URL, step, and sid parameters", () => {
  vi.stubGlobal("location", {
    href: "https://www.torn.com/faction.php?sid=mySession&step=profile",
    search: "?sid=mySession&step=profile",
  });

  expect(torn_page("faction")).toBe(true);
  expect(torn_page("faction", { sid: "mySession" })).toBe(true);
  expect(torn_page("faction", { step: "profile" })).toBe(true);
  expect(torn_page("faction", { sid: "otherSession" })).toBe(false);
  expect(torn_page("profiles")).toBe(false);
});

test("torn_page with match_hash parameter matches specified hash fragments", () => {
  // Case 1: matches empty hash when target has empty hash
  vi.stubGlobal("location", {
    href: "https://www.torn.com/factions.php?step=your",
    search: "?step=your",
    hash: "",
  });
  expect(
    torn_page("factions", { step: "your" }, ["", "#", "#/", "#/tab=info"]),
  ).toBe(true);

  // Case 2: matches #/tab=info hash when target has that hash
  vi.stubGlobal("location", {
    href: "https://www.torn.com/factions.php?step=your#/tab=info",
    search: "?step=your",
    hash: "#/tab=info",
  });
  expect(
    torn_page("factions", { step: "your" }, ["", "#", "#/", "#/tab=info"]),
  ).toBe(true);

  // Case 3: does not match other hashes (e.g. #/tab=crimes)
  vi.stubGlobal("location", {
    href: "https://www.torn.com/factions.php?step=your#/tab=crimes",
    search: "?step=your",
    hash: "#/tab=crimes",
  });
  expect(
    torn_page("factions", { step: "your" }, ["", "#", "#/", "#/tab=info"]),
  ).toBe(false);

  // Case 4: if match_hash is empty array, it matches any hash
  expect(torn_page("factions", { step: "your" })).toBe(true);
  expect(torn_page("factions", { step: "your" }, [])).toBe(true);
});

test("get_player_id_in_element extracts player IDs from child or parent anchors", () => {
  const container = document.createElement("div");

  // Case 1: Parent has href
  const parentAnchor = document.createElement("a");
  parentAnchor.href = "https://www.torn.com/profiles.php?XID=1111";
  const childEl = document.createElement("span");
  parentAnchor.appendChild(childEl);
  expect(get_player_id_in_element(childEl)).toEqual(1111);

  // Case 2: Child anchors have href (XID)
  const childAnchor1 = document.createElement("a");
  childAnchor1.href = "https://www.torn.com/profiles.php?XID=2222";
  container.appendChild(childAnchor1);
  expect(get_player_id_in_element(container)).toEqual(2222);

  // Case 3: Child anchors have href (userId)
  container.innerHTML = "";
  const childAnchor2 = document.createElement("a");
  childAnchor2.href = "https://www.torn.com/profiles.php?userId=3333";
  container.appendChild(childAnchor2);
  expect(get_player_id_in_element(container)).toEqual(3333);

  // Case 4: Element itself has href (XID)
  const elementSelf = document.createElement("a");
  elementSelf.href = "https://www.torn.com/profiles.php?XID=4444";
  expect(get_player_id_in_element(elementSelf)).toEqual(4444);
});

test("add_ff_arrow fetches data and inserts gauge arrow SVG to elements", async () => {
  const mockGet = vi.mocked(ffscouter.get).mockResolvedValue({
    player_id: 123,
    no_data: false,
    fair_fight: 3.5,
    last_updated: Date.now() / 1000,
    bs_estimate: 1000,
    bs_estimate_human: "1k",
    bss_public: 10,
    source: "bss",
    premium_insights_available: false,
  });

  const anchor = document.createElement("a");
  anchor.href = "https://www.torn.com/profiles.php?XID=123";
  document.body.appendChild(anchor);

  add_ff_arrow(anchor);

  // Await microtasks for promise resolution
  await new Promise((resolve) => setTimeout(resolve, 10));

  expect(mockGet).toHaveBeenCalledWith(123);
  expect(anchor.classList.contains("ffscouter-gauge")).toBe(true);
  expect(anchor.style.getPropertyValue("--band-percent")).toEqual("57.75");

  const svg = anchor.querySelector(".ffscouter-arrow");
  expect(svg).not.toBeNull();
  expect(svg?.tagName.toLowerCase()).toEqual("svg");
});

test("add_ff_arrow draws the arrow's stroke-width from gauge_marker_border_width config", async () => {
  ffconfig.gauge_marker_border_width = 3;
  vi.mocked(ffscouter.get).mockResolvedValue({
    player_id: 123,
    no_data: false,
    fair_fight: 3.5,
    last_updated: Date.now() / 1000,
    bs_estimate: 1000,
    bs_estimate_human: "1k",
    bss_public: 10,
    source: "bss",
    premium_insights_available: false,
  });

  const anchor = document.createElement("a");
  anchor.href = "https://www.torn.com/profiles.php?XID=123";
  document.body.appendChild(anchor);

  add_ff_arrow(anchor);
  await new Promise((resolve) => setTimeout(resolve, 10));

  const path = anchor.querySelector(".ffscouter-arrow path");
  expect(path?.getAttribute("style")).toContain("stroke-width:3;");
});

test("add_ff_arrow sizes the bubble's border-width from gauge_marker_border_width scaled by gauge_marker_scale", async () => {
  ffconfig.gauge_marker_type = GaugeMarkerType.BUBBLE_FF;
  ffconfig.gauge_marker_border_width = 2;
  ffconfig.gauge_marker_scale = 150;
  vi.mocked(ffscouter.get).mockResolvedValue({
    player_id: 123,
    no_data: false,
    fair_fight: 3.5,
    last_updated: Date.now() / 1000,
    bs_estimate: 1000,
    bs_estimate_human: "1k",
    bss_public: 10,
    source: "bss",
    premium_insights_available: false,
  });

  const anchor = document.createElement("a");
  anchor.href = "https://www.torn.com/profiles.php?XID=123";
  document.body.appendChild(anchor);

  add_ff_arrow(anchor);
  await new Promise((resolve) => setTimeout(resolve, 10));

  const bubble = anchor.querySelector(".ffscouter-bubble") as HTMLElement;
  expect(bubble.style.borderWidth).toEqual("3px");
});

test("add_ff_arrow sets the shared marker-scale CSS var from config", async () => {
  ffconfig.gauge_marker_scale = 150;
  vi.mocked(ffscouter.get).mockResolvedValue({
    player_id: 123,
    no_data: false,
    fair_fight: 3.5,
    last_updated: Date.now() / 1000,
    bs_estimate: 1000,
    bs_estimate_human: "1k",
    bss_public: 10,
    source: "bss",
    premium_insights_available: false,
  });

  const anchor = document.createElement("a");
  anchor.href = "https://www.torn.com/profiles.php?XID=123";
  document.body.appendChild(anchor);

  add_ff_arrow(anchor);
  await new Promise((resolve) => setTimeout(resolve, 10));

  expect(document.body.style.getPropertyValue("--ffscouter-marker-scale")).toBe(
    "1.5",
  );
});

test("add_ff_arrow renders bubble with FF number when configured", async () => {
  ffconfig.gauge_marker_type = GaugeMarkerType.BUBBLE_FF;
  vi.mocked(ffscouter.get).mockResolvedValue({
    player_id: 123,
    no_data: false,
    fair_fight: 3.52,
    last_updated: Date.now() / 1000,
    bs_estimate: 1000,
    bs_estimate_human: "1k",
    bss_public: 10,
    source: "bss",
    premium_insights_available: false,
  });

  const anchor = document.createElement("a");
  anchor.href = "https://www.torn.com/profiles.php?XID=123";
  document.body.appendChild(anchor);

  add_ff_arrow(anchor);
  await new Promise((resolve) => setTimeout(resolve, 10));

  const bubble = anchor.querySelector(".ffscouter-bubble");
  expect(bubble).not.toBeNull();
  expect(bubble?.textContent).toEqual("3.52");
  expect(bubble?.classList.contains("ffscouter-bubble")).toBe(true);
});

test("add_ff_arrow renders bubble with stat estimate when configured", async () => {
  ffconfig.gauge_marker_type = GaugeMarkerType.BUBBLE_ESTIMATE;
  vi.mocked(ffscouter.get).mockResolvedValue({
    player_id: 123,
    no_data: false,
    fair_fight: 3.52,
    last_updated: Date.now() / 1000,
    bs_estimate: 1000,
    bs_estimate_human: "1.2b",
    bss_public: 10,
    source: "bss",
    premium_insights_available: false,
  });

  const anchor = document.createElement("a");
  anchor.href = "https://www.torn.com/profiles.php?XID=123";
  document.body.appendChild(anchor);

  add_ff_arrow(anchor);
  await new Promise((resolve) => setTimeout(resolve, 10));

  const bubble = anchor.querySelector(".ffscouter-bubble");
  expect(bubble).not.toBeNull();
  expect(bubble?.textContent).toEqual("1.2b");
});

test("apply_ff_gauge invokes add_ff_arrow if element is valid", async () => {
  const mockGet = vi.mocked(ffscouter.get).mockResolvedValue({
    player_id: 456,
    no_data: true,
  });

  const div = document.createElement("div");
  const a = document.createElement("a");
  a.href = "https://www.torn.com/profiles.php?XID=456";
  div.appendChild(a);

  apply_ff_gauge(div);

  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(mockGet).toHaveBeenCalledWith(456);
});

test("wait_for_element resolves element when present or added", async () => {
  // If element already exists
  const existing = document.createElement("div");
  existing.id = "find-me";
  document.body.appendChild(existing);

  const found = await wait_for_element("#find-me", 1000);
  expect(found).toEqual(existing);

  // If element is added after a delay
  const promise = wait_for_element("#delayed", 1000);

  const delayed = document.createElement("div");
  delayed.id = "delayed";

  setTimeout(() => {
    document.body.appendChild(delayed);
  }, 50);

  const foundDelayed = await promise;
  expect(foundDelayed).toEqual(delayed);
});

test("wait_for_element returns null on timeout", async () => {
  const result = await wait_for_element("#never-appears", 50);
  expect(result).toBeNull();
});

test("wait_for_body resolves to true as body always exists in JSDOM", async () => {
  expect(await wait_for_body(1000)).toBe(true);
});

test("MonitorElements observes DOM mutations and triggers handlers", () => {
  const root = document.createElement("div");
  document.body.appendChild(root);

  const handler = vi.fn();
  const matcher = (node: HTMLElement) => node.classList.contains("monitored");

  // Initial element inside root
  const initial = document.createElement("div");
  initial.className = "monitored";
  root.appendChild(initial);

  const monitor = new MonitorElements(
    matcher,
    handler,
    root,
    true,
    { added: true },
    1000,
  );
  monitor.start();

  // Initial scanning triggers handler
  expect(handler).toHaveBeenCalledWith({ added: initial });
  handler.mockClear();

  // Mutate: append element
  const newlyAdded = document.createElement("div");
  newlyAdded.className = "monitored";

  // Use MutationObserver trigger
  root.appendChild(newlyAdded);

  // In JSDOM/Vitest, we can wait for MutationObserver to cycle
  // or we can mock/stub. Let's wait a tiny bit for MutationObserver to flush
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      expect(handler).toHaveBeenCalledWith({ added: newlyAdded });

      monitor.cleanup();
      resolve();
    }, 10);
  });
});

test("getRFC extracts token from cookies", () => {
  // Ensure cookie is clean initially
  document.cookie = "rfc_v=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  expect(getRFC()).toEqual("");

  document.cookie = "rfc_v=test-rfc-token-123; path=/";
  expect(getRFC()).toEqual("test-rfc-token-123");

  // Clean cookie
  document.cookie = "rfc_v=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
});

test("getHashParameters parses hash parameters correctly", () => {
  const params1 = getHashParameters("#/id=10&tab=stats");
  expect(params1.get("id")).toEqual("10");
  expect(params1.get("tab")).toEqual("stats");

  const params2 = getHashParameters("id=20");
  expect(params2.get("id")).toEqual("20");
});

test("waitForDocumentReady resolves immediately when readyState is interactive/complete", async () => {
  // state in JSDOM is interactive/complete by default
  await expect(waitForDocumentReady()).resolves.toBeUndefined();
});

test("getLocalUserId extracts user ID from burger dropdown setting menu link", async () => {
  const menuContainer = document.createElement("div");
  menuContainer.className = "settings-menu";
  const linkWrapper = document.createElement("div");
  linkWrapper.className = "link";
  const anchor = document.createElement("a");
  anchor.href = "https://www.torn.com/profiles.php?XID=777777";

  linkWrapper.appendChild(anchor);
  menuContainer.appendChild(linkWrapper);
  document.body.appendChild(menuContainer);

  const userId = await getLocalUserId();
  expect(userId).toEqual("777777");
});

test("create_info_line creates a styled div container", () => {
  const div = create_info_line();
  expect(div.className).toEqual("ffscouter-info-line");
  expect(div.style.display).toEqual("block");
  expect(div.style.clear).toEqual("both");
});

test("get_attack_url returns the correct attack URL format", () => {
  expect(get_attack_url(12345)).toEqual(
    "https://www.torn.com/page.php?sid=attack&user2ID=12345",
  );
  expect(get_attack_url("67890")).toEqual(
    "https://www.torn.com/page.php?sid=attack&user2ID=67890",
  );
});

test("open_attack_link redirects in same tab when openInNewTab is false", () => {
  const mockLocation = { href: "" };
  vi.stubGlobal("location", mockLocation);
  const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

  open_attack_link(12345, { openInNewTab: false });

  expect(openSpy).not.toHaveBeenCalled();
  expect(mockLocation.href).toEqual(
    "https://www.torn.com/page.php?sid=attack&user2ID=12345",
  );
});

test("open_attack_link opens new tab when openInNewTab is true", () => {
  const mockLocation = { href: "" };
  vi.stubGlobal("location", mockLocation);
  const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

  open_attack_link(12345, { openInNewTab: true });

  expect(openSpy).toHaveBeenCalledWith(
    "https://www.torn.com/page.php?sid=attack&user2ID=12345",
    "_blank",
  );
  expect(mockLocation.href).toEqual("");
});

test("open_attack_link respects ffconfig quick attack action when openInNewTab is undefined", () => {
  const mockLocation = { href: "" };
  vi.stubGlobal("location", mockLocation);
  const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

  // Case 1: config set to current (same tab)
  ffconfig.war_quick_attack_action = WarQuickAttackAction.CURRENT;
  open_attack_link(12345);
  expect(openSpy).not.toHaveBeenCalled();
  expect(mockLocation.href).toEqual(
    "https://www.torn.com/page.php?sid=attack&user2ID=12345",
  );

  // Reset
  mockLocation.href = "";
  openSpy.mockClear();

  // Case 2: config set to new_tab
  ffconfig.war_quick_attack_action = WarQuickAttackAction.NEW_TAB;
  open_attack_link(12345);
  expect(openSpy).toHaveBeenCalledWith(
    "https://www.torn.com/page.php?sid=attack&user2ID=12345",
    "_blank",
  );
  expect(mockLocation.href).toEqual("");
});

// Per the HTML spec, a throwing custom element constructor doesn't make
// document.createElement throw — it makes it silently return a generic
// fallback element instead, which is the failure mode create_ff_element
// actually has to detect. A real registered class is needed here so we can
// assert on `instanceof` the way the implementation does.
class TestFFElement extends HTMLElement {}
if (!customElements.get("ff-test-element")) {
  customElements.define("ff-test-element", TestFFElement);
}

test("create_ff_element returns a real instance on the first successful attempt", async () => {
  const createSpy = vi.spyOn(document, "createElement");

  const element = await create_ff_element("ff-test-element" as any);

  expect(element).toBeInstanceOf(TestFFElement);
  expect(createSpy).toHaveBeenCalledTimes(1);
});

test("create_ff_element retries when createElement returns a fallback element and returns the real instance", async () => {
  const real = document.createElement.bind(document);
  const createSpy = vi
    .spyOn(document, "createElement")
    .mockImplementationOnce(() => real("div"))
    .mockImplementationOnce((tag: string) => real(tag));

  const element = await create_ff_element("ff-test-element" as any);

  expect(element).toBeInstanceOf(TestFFElement);
  expect(createSpy).toHaveBeenCalledTimes(2);
});

test("create_ff_element returns null if every attempt produces a fallback element", async () => {
  const real = document.createElement.bind(document);
  const createSpy = vi
    .spyOn(document, "createElement")
    .mockImplementation(() => real("div"));

  const element = await create_ff_element("ff-test-element" as any);

  expect(element).toBeNull();
  expect(createSpy).toHaveBeenCalledTimes(3);
});

test("create_ff_element accepts any element for tags that aren't registered custom elements", async () => {
  const element = await create_ff_element("span" as any);

  expect(element?.tagName.toLowerCase()).toBe("span");
});
