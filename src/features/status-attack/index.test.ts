// @vitest-environment jsdom

import {
  get_player_id_in_element,
  getLocalUserId,
  torn_page,
} from "@utils/dom";
import { ffconfig, WarQuickAttackAction } from "@utils/ffconfig";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import itemMarketHonorOff from "./__fixtures__/torn-markup/2026-07-24/item-market-userinfobox-honor-off.html?raw";
import itemMarketHonorOn from "./__fixtures__/torn-markup/2026-07-24/item-market-userinfobox-honor-on.html?raw";
import warListEnemyRows from "./__fixtures__/torn-markup/2026-07-26/war-list-enemy-rows.html?raw";
import travelPeopleList from "./__fixtures__/torn-markup/2026-08-16/travel-people-list.html?raw";
import advancedSearchUserList from "./__fixtures__/torn-markup/2026-09-07/advanced-search-user-list.html?raw";
import eliminationsTeamListDesktop from "./__fixtures__/torn-markup/2026-09-07/eliminations-team-list-desktop.html?raw";
import eliminationsTeamListMobile from "./__fixtures__/torn-markup/2026-09-07/eliminations-team-list-mobile.html?raw";
import statusAttack from "./index";

vi.mock("@utils/dom", async (importOriginal) => {
  const original = await importOriginal<typeof import("@utils/dom")>();
  return {
    ...original,
    torn_page: vi.fn(),
    get_player_id_in_element: vi.fn(),
    getLocalUserId: vi.fn().mockResolvedValue("999"), // Default mock local user
  };
});

describe("Online Status Attack Links Feature", () => {
  let openSpy: any;
  let mockLocation: { href: string };

  beforeAll(() => {
    openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
  });

  beforeEach(() => {
    document.body.innerHTML = "";
    document.body.className = "";
    vi.clearAllMocks();
    ffconfig.status_attack_links_enabled = true;
    ffconfig.war_quick_attack_action = WarQuickAttackAction.NEW_TAB;

    mockLocation = { href: "" };
    vi.stubGlobal("location", mockLocation);

    vi.mocked(getLocalUserId).mockResolvedValue("999");
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  test("shouldRun always returns true globally to register capture listener", async () => {
    const result = await statusAttack.shouldRun();
    expect(result).toBe(true);
  });

  test("run() sets up body attribute class", async () => {
    await statusAttack.run();
    expect(document.body.getAttribute("data-ff-status-attack-enabled")).toBe(
      "true",
    );
  });

  test("toggles body attribute when settings update", async () => {
    await statusAttack.run();
    expect(document.body.getAttribute("data-ff-status-attack-enabled")).toBe(
      "true",
    );

    ffconfig.status_attack_links_enabled = false;
    window.dispatchEvent(new CustomEvent("ff-config-updated"));
    expect(
      document.body.getAttribute("data-ff-status-attack-enabled"),
    ).toBeNull();
  });

  test("Faction page click triggers attack in a new tab", async () => {
    vi.mocked(torn_page).mockImplementation((page) => page === "factions");

    // Setup Faction row DOM
    const row = document.createElement("div");
    row.className = "table-row";
    row.innerHTML = `
      <div class="table-cell member icons">
        <div class="userStatusWrap___ozmZB flexCenter___k97k4" aria-label="yanchoy is online">
          <img alt="online" src="..." />
        </div>
      </div>
    `;
    document.body.appendChild(row);

    // Mock player ID resolution
    vi.mocked(get_player_id_in_element).mockReturnValue(12345 as any);

    await statusAttack.run();

    const statusDot = row.querySelector(
      '[class*="userStatusWrap__"]',
    ) as HTMLElement;
    expect(statusDot).not.toBeNull();

    // Trigger click on status dot
    statusDot.click();

    expect(openSpy).toHaveBeenCalledWith(
      "https://www.torn.com/page.php?sid=attack&user2ID=12345",
      "_blank",
    );
    expect(mockLocation.href).toBe("");
  });

  test("Faction page click opens in same tab if configured", async () => {
    vi.mocked(torn_page).mockImplementation((page) => page === "factions");
    ffconfig.war_quick_attack_action = WarQuickAttackAction.CURRENT;

    const row = document.createElement("div");
    row.className = "table-row";
    row.innerHTML = `
      <div class="table-cell member icons">
        <div class="userStatusWrap___ozmZB" aria-label="yanchoy is online"></div>
      </div>
    `;
    document.body.appendChild(row);

    vi.mocked(get_player_id_in_element).mockReturnValue(12345 as any);

    await statusAttack.run();

    const statusDot = row.querySelector(
      '[class*="userStatusWrap__"]',
    ) as HTMLElement;
    statusDot.click();

    expect(openSpy).not.toHaveBeenCalled();
    expect(mockLocation.href).toBe(
      "https://www.torn.com/page.php?sid=attack&user2ID=12345",
    );
  });

  test("Faction page click inside iconTray is completely bypassed", async () => {
    vi.mocked(torn_page).mockImplementation((page) => page === "factions");

    const row = document.createElement("div");
    row.className = "table-row";
    row.innerHTML = `
      <div class="table-cell member-icons icons">
        <ul id="iconTray">
          <li id="icon5___feba5be2" class="iconShow" title="Level 100"></li>
        </ul>
      </div>
    `;
    document.body.appendChild(row);

    await statusAttack.run();

    const levelBadge = row.querySelector("#icon5___feba5be2") as HTMLElement;
    levelBadge.click();

    expect(openSpy).not.toHaveBeenCalled();
    expect(mockLocation.href).toBe("");
  });

  test("Profile page status icon click parses ID and attacks", async () => {
    vi.mocked(torn_page).mockImplementation((page) => page === "profiles");

    const profileIcon = document.createElement("li");
    profileIcon.id = "icon62-profile-2625349";
    profileIcon.className = "user-status-16-Away left";
    document.body.appendChild(profileIcon);

    await statusAttack.run();

    profileIcon.click();

    expect(openSpy).toHaveBeenCalledWith(
      "https://www.torn.com/page.php?sid=attack&user2ID=2625349",
      "_blank",
    );
  });

  test("Profile page donator/subscriber/gender/marriage badges are bypassed", async () => {
    vi.mocked(torn_page).mockImplementation((page) => page === "profiles");

    const badges = [
      {
        id: "icon4-profile-2625349",
        className: "user-status-16-Subscriber left",
      },
      {
        id: "icon5-profile-2625349",
        className: "user-status-16-HallOfFame left",
      },
      { id: "icon6-profile-2625349", className: "user-status-16-Male left" },
      {
        id: "icon8-profile-2625349",
        className: "user-status-16-Marriage left",
      },
      {
        id: "icon27-profile-2625349",
        className: "user-status-16-Company left",
      },
      { id: "icon9-profile-2625349", className: "user-status-16-Faction left" },
    ];

    await statusAttack.run();

    for (const badgeData of badges) {
      const badge = document.createElement("li");
      badge.id = badgeData.id;
      badge.className = badgeData.className;
      document.body.appendChild(badge);

      badge.click();
      expect(openSpy).not.toHaveBeenCalled();
      document.body.removeChild(badge);
    }
  });

  test("Mini-profile popup status icon click parses ID and attacks, while non-status badges are bypassed", async () => {
    const miniRoot = document.createElement("div");
    miniRoot.id = "profile-mini-root";
    miniRoot.innerHTML = `
      <ul>
        <li id="icon2-mini-profile-2104769" class="user-status-16-Offline left"></li>
        <li id="icon4-mini-profile-2104769" class="user-status-16-Subscriber left"></li>
        <li id="icon6-mini-profile-2104769" class="user-status-16-Male left"></li>
      </ul>
    `;
    document.body.appendChild(miniRoot);

    await statusAttack.run();

    // Click Subscriber badge (should be bypassed)
    const subIcon = miniRoot.querySelector(
      "#icon4-mini-profile-2104769",
    ) as HTMLElement;
    subIcon.click();
    expect(openSpy).not.toHaveBeenCalled();

    // Click Male badge (should be bypassed)
    const maleIcon = miniRoot.querySelector(
      "#icon6-mini-profile-2104769",
    ) as HTMLElement;
    maleIcon.click();
    expect(openSpy).not.toHaveBeenCalled();

    // Click Offline status (should trigger attack)
    const statusIcon = miniRoot.querySelector(
      "#icon2-mini-profile-2104769",
    ) as HTMLElement;
    statusIcon.click();

    expect(openSpy).toHaveBeenCalledWith(
      "https://www.torn.com/page.php?sid=attack&user2ID=2104769",
      "_blank",
    );
  });

  test("Forums page status icon click extracts ID from poster sidebar and attacks", async () => {
    vi.mocked(torn_page).mockImplementation((page) => page === "forums");

    const post = document.createElement("div");
    post.className = "post";
    post.innerHTML = `
      <div class="poster">
        <li id="icon1___32a461f9" class="iconShow" title="Online">
          <a aria-label="Online"></a>
        </li>
      </div>
    `;
    document.body.appendChild(post);

    vi.mocked(get_player_id_in_element).mockImplementation((el) => {
      const poster = post.querySelector(".poster");
      if (el === poster) return 55555 as any;
      return null;
    });

    await statusAttack.run();

    const statusIcon = post.querySelector("#icon1___32a461f9") as HTMLElement;
    // Simulate forum observer labeling the icon
    statusIcon.classList.add("ffscouter-forum-status");

    statusIcon.click();

    expect(openSpy).toHaveBeenCalledWith(
      "https://www.torn.com/page.php?sid=attack&user2ID=55555",
      "_blank",
    );
  });

  test("Self-clicking is bypassed to prevent self-attacks", async () => {
    vi.mocked(torn_page).mockImplementation((page) => page === "profiles");

    const profileIcon = document.createElement("li");
    profileIcon.id = "icon62-profile-999"; // Suffix matches mock local user 999
    profileIcon.className = "user-status-16-Away left";
    document.body.appendChild(profileIcon);

    await statusAttack.run();

    profileIcon.click();

    expect(openSpy).not.toHaveBeenCalled();
    expect(mockLocation.href).toBe("");
  });

  test("Item Market userInfoBox (honor bar on) status icon click attacks correct player", async () => {
    document.body.innerHTML = itemMarketHonorOn;

    vi.mocked(get_player_id_in_element).mockImplementation((el) => {
      const anchor = el.querySelector('a[href*="XID="]');
      const match = anchor?.getAttribute("href")?.match(/XID=(\d+)/);
      return match ? (Number(match[1]) as any) : null;
    });

    await statusAttack.run();

    const statusEl = document.querySelector(
      '[class*="userStatusWrap__"]',
    ) as HTMLElement;
    statusEl.click();

    expect(openSpy).toHaveBeenCalledWith(
      "https://www.torn.com/page.php?sid=attack&user2ID=3824625",
      "_blank",
    );
  });

  test("Item Market userInfoBox (honor bar off) status icon click attacks correct player", async () => {
    document.body.innerHTML = itemMarketHonorOff;

    vi.mocked(get_player_id_in_element).mockImplementation((el) => {
      const anchor = el.querySelector('a[href*="XID="]');
      const match = anchor?.getAttribute("href")?.match(/XID=(\d+)/);
      return match ? (Number(match[1]) as any) : null;
    });

    await statusAttack.run();

    const statusEl = document.querySelector(
      '[class*="userStatusWrap__"]',
    ) as HTMLElement;
    statusEl.click();

    expect(openSpy).toHaveBeenCalledWith(
      "https://www.torn.com/page.php?sid=attack&user2ID=4403239",
      "_blank",
    );
  });

  test("Item Market userInfoBox extraction is scoped per listing, not leaked across siblings", async () => {
    // Two listings side by side, as rendered in a real market grid
    document.body.innerHTML = itemMarketHonorOn + itemMarketHonorOff;

    vi.mocked(get_player_id_in_element).mockImplementation((el) => {
      const anchor = el.querySelector('a[href*="XID="]');
      const match = anchor?.getAttribute("href")?.match(/XID=(\d+)/);
      return match ? (Number(match[1]) as any) : null;
    });

    await statusAttack.run();

    const statusEls = document.querySelectorAll('[class*="userStatusWrap__"]');
    expect(statusEls).toHaveLength(2);

    (statusEls[0] as HTMLElement).click();
    expect(openSpy).toHaveBeenLastCalledWith(
      "https://www.torn.com/page.php?sid=attack&user2ID=3824625",
      "_blank",
    );

    (statusEls[1] as HTMLElement).click();
    expect(openSpy).toHaveBeenLastCalledWith(
      "https://www.torn.com/page.php?sid=attack&user2ID=4403239",
      "_blank",
    );
  });

  test("Faction/war real markup: extracts the correct player per row, unmocked (regression for ADR 0011)", async () => {
    // Real ~5-row excerpt from a live war member list (2026-07-26 capture), unlike
    // the other faction/war tests above, which mock get_player_id_in_element away
    // entirely and so can't catch a real DOM-scoping regression. Covers Okay
    // (attackable) plus Hospital/Traveling/Abroad (not attackable in Torn's UI,
    // but the click-to-attack path doesn't check attackability, so extraction
    // must still resolve the correct player).
    document.body.innerHTML = warListEnemyRows;
    vi.mocked(torn_page).mockImplementation((page) => page === "factions");

    const actualDom =
      await vi.importActual<typeof import("@utils/dom")>("@utils/dom");
    vi.mocked(get_player_id_in_element).mockImplementation(
      actualDom.get_player_id_in_element,
    );

    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    // attackLinkUserId is null for Hospital/Traveling/Abroad rows: Torn renders
    // a <span>, not an <a>, for the Attack cell when a player isn't attackable.
    const rows: {
      ariaLabel: string;
      playerId: number;
      attackLinkUserId: string | null;
    }[] = [
      {
        ariaLabel: "SyDySTiK is offline",
        playerId: 955461,
        attackLinkUserId: "955461",
      }, // Okay
      {
        ariaLabel: "Shayul is offline",
        playerId: 2339380,
        attackLinkUserId: null,
      }, // Hospital
      {
        ariaLabel: "Cocytos is offline",
        playerId: 3089412,
        attackLinkUserId: null,
      }, // Traveling
      {
        ariaLabel: "Wothers is idle",
        playerId: 2165637,
        attackLinkUserId: "2165637",
      }, // Okay
      {
        ariaLabel: "ThcWhiteMamba is offline",
        playerId: 3742279,
        attackLinkUserId: null,
      }, // Abroad
    ];

    await statusAttack.run();

    for (const { ariaLabel, playerId, attackLinkUserId } of rows) {
      const statusDot = document.querySelector(
        `[aria-label="${ariaLabel}"]`,
      ) as HTMLElement;
      expect(statusDot).not.toBeNull();

      statusDot.click();

      expect(openSpy).toHaveBeenLastCalledWith(
        `https://www.torn.com/page.php?sid=attack&user2ID=${playerId}`,
        "_blank",
      );

      // Confirms the ADR 0011 diagnostic cross-check (item 1) fires with the
      // row's independent ID sources on real markup, not just that a call
      // happened.
      const lastInfoCall = infoSpy.mock.calls.at(-1);
      expect(lastInfoCall?.at(-1)).toEqual({
        resolvedId: playerId,
        dataPlayerId: String(playerId),
        attackLinkUserId,
      });
    }

    infoSpy.mockRestore();
  });

  test("Foreign country/travel people-list real markup: clicking the status text extracts the correct player per row, unmocked", async () => {
    // Real ~4-row excerpt from a live "people" list on a foreign country page
    // (2026-08-16 capture). Rows use the older .left-right-wrapper/.left-side/
    // .right-side layout (not userStatusWrap__/userInfoBox__), so this is a
    // distinct extraction path from the faction/war and item-market tests.
    document.body.innerHTML = travelPeopleList;
    vi.mocked(torn_page).mockImplementation(() => false);

    const actualDom =
      await vi.importActual<typeof import("@utils/dom")>("@utils/dom");
    vi.mocked(get_player_id_in_element).mockImplementation(
      actualDom.get_player_id_in_element,
    );

    const rows: { name: string; playerId: number }[] = [
      { name: "Morgz", playerId: 83384 }, // Hospital
      { name: "soulhunter", playerId: 317898 }, // Okay
      { name: "twat", playerId: 2411466 }, // Hospital
      { name: "22Reflex", playerId: 2595471 }, // Hospital, revive disabled
    ];

    await statusAttack.run();

    for (const { name, playerId } of rows) {
      const userLink = document.querySelector(
        `a.user.name[title^="${name} "]`,
      ) as HTMLElement;
      expect(userLink).not.toBeNull();

      const statusEl = userLink
        .closest(".left-right-wrapper")
        ?.querySelector('.status > [class$="-status"]') as HTMLElement;
      expect(statusEl).not.toBeNull();

      statusEl.click();

      expect(openSpy).toHaveBeenLastCalledWith(
        `https://www.torn.com/page.php?sid=attack&user2ID=${playerId}`,
        "_blank",
      );
    }
  });

  test("Foreign country/travel people-list real markup: clicking the online/idle/offline presence dot extracts the correct player per row, unmocked", async () => {
    // Same fixture, but exercising the .left-side singleicon tray (the
    // presence dot) instead of the .right-side status text, across all
    // three presence states it renders as (icon1/Online, icon2/Offline,
    // icon62/Idle).
    document.body.innerHTML = travelPeopleList;
    vi.mocked(torn_page).mockImplementation(() => false);

    const actualDom =
      await vi.importActual<typeof import("@utils/dom")>("@utils/dom");
    vi.mocked(get_player_id_in_element).mockImplementation(
      actualDom.get_player_id_in_element,
    );

    const rows: { name: string; playerId: number }[] = [
      { name: "Morgz", playerId: 83384 }, // Offline
      { name: "Archimedes", playerId: 2061973 }, // Idle
      { name: "-Ghost-", playerId: 2067532 }, // Online
    ];

    await statusAttack.run();

    for (const { name, playerId } of rows) {
      const userLink = document.querySelector(
        `a.user.name[title^="${name} "]`,
      ) as HTMLElement;
      expect(userLink).not.toBeNull();

      // Split into two 2-part queries rather than one 3-part descendant chain
      // (`.left-side ul.singleicon li.iconShow`): jsdom's nwsapi selector
      // engine returns a false negative for that chain here, apparently
      // because of the many repeated id="iconTray" elements across this
      // fixture's rows. `element.closest()`/`.matches()` aren't affected
      // (verified separately), so this is a test-only workaround, not a
      // production bug.
      const leftSide = userLink
        .closest(".left-right-wrapper")
        ?.querySelector(".left-side");
      const presenceDot = leftSide?.querySelector(
        "ul.singleicon li.iconShow",
      ) as HTMLElement;
      expect(presenceDot).not.toBeNull();

      presenceDot.click();

      expect(openSpy).toHaveBeenLastCalledWith(
        `https://www.torn.com/page.php?sid=attack&user2ID=${playerId}`,
        "_blank",
      );
    }
  });

  test("Advanced Search user-list real markup: clicking the online/idle/offline presence dot extracts the correct player per row, unmocked", async () => {
    // Real ~25-row capture of an Advanced Search results list
    // (page.php?sid=UserList, 2026-09-07). Rows are li.user{ID} with the
    // presence dot in the .expander's singleicon tray next to the faction
    // tag and profile link; a second (non-singleicon) badge tray below the
    // row carries Hospital/Bazaar/Faction/Company icons with userID= links.
    // No .left-right-wrapper / userInfoBox__ here, so this is its own
    // extraction path. The capture has only Offline and Idle rows.
    document.body.innerHTML = advancedSearchUserList;
    vi.mocked(torn_page).mockImplementation(() => false);

    const actualDom =
      await vi.importActual<typeof import("@utils/dom")>("@utils/dom");
    vi.mocked(get_player_id_in_element).mockImplementation(
      actualDom.get_player_id_in_element,
    );

    const rows: number[] = [
      2850901, // --El_Nino: Offline, Bazaar badge
      3134438, // -ACK-: Offline, Hospital badge
      1826446, // -BELL-: Offline, Bazaar + Hospital badges
      201319, // -0_0-: Idle
      633255, // -Blue: Idle
      378702, // -CB-: Idle
    ];

    await statusAttack.run();

    for (const playerId of rows) {
      const row = document.querySelector(`li.user${playerId}`);
      expect(row).not.toBeNull();

      // Two 2-part queries rather than a 3-part descendant chain, for the
      // same jsdom/nwsapi repeated-id="iconTray" false negative documented
      // in the travel presence-dot test above.
      const presenceDot = row
        ?.querySelector("ul.singleicon")
        ?.querySelector("li.iconShow") as HTMLElement;
      expect(presenceDot).not.toBeNull();

      presenceDot.click();

      expect(openSpy).toHaveBeenLastCalledWith(
        `https://www.torn.com/page.php?sid=attack&user2ID=${playerId}`,
        "_blank",
      );
    }
  });

  test("Advanced Search user-list real markup: clicking a lower-tray badge is not intercepted", async () => {
    document.body.innerHTML = advancedSearchUserList;
    vi.mocked(torn_page).mockImplementation(() => false);

    const actualDom =
      await vi.importActual<typeof import("@utils/dom")>("@utils/dom");
    vi.mocked(get_player_id_in_element).mockImplementation(
      actualDom.get_player_id_in_element,
    );

    await statusAttack.run();

    // The Faction badge in the lower "Status:" tray links with userID=,
    // which must stay a plain navigation, not a quick-attack.
    const row = document.querySelector("li.user2850901");
    const factionBadge = row
      ?.querySelector('a[aria-label^="Faction"]')
      ?.closest("li") as HTMLElement;
    expect(factionBadge).not.toBeNull();

    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    factionBadge.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(openSpy).not.toHaveBeenCalled();
    expect(mockLocation.href).toBe("");
  });

  // Eliminations team-list rows (page.php?sid=elimination#/team/N, 2026-09-07
  // capture): a virtualized dataGridRow__ grid whose name__, icons__ (full
  // badge tray) and status__ cells are siblings. Rows are located by exact
  // profile href, then queried inside the row one hop at a time, for the
  // same jsdom/nwsapi repeated-id="iconTray" false negative documented in
  // the travel presence-dot test above.
  const eliminationRows: {
    playerId: number;
    presence: string;
    status: string;
  }[] = [
    { playerId: 166, presence: "Offline", status: "Okay" }, // Married NID=, Bazaar userID=
    { playerId: 35899, presence: "Idle", status: "Okay" }, // CJtheMACK
    { playerId: 39829, presence: "Online", status: "Okay" }, // JonnyD
    { playerId: 84976, presence: "Online", status: "Okay" }, // Jokar
    { playerId: 213936, presence: "Offline", status: "Abroad" }, // Polinux, extra icon71 Abroad badge
    { playerId: 246493, presence: "Offline", status: "Traveling" }, // TarmimiSiregar, extra icon71 Traveling badge
  ];

  function eliminationRow(playerId: number): HTMLElement {
    const row = document
      .querySelector(`a[href="/profiles.php?XID=${playerId}"]`)
      ?.closest('[class*="dataGridRow__"]') as HTMLElement;
    expect(row).not.toBeNull();
    return row;
  }

  async function runUnmockedOnFixture(fixture: string) {
    document.body.innerHTML = fixture;
    vi.mocked(torn_page).mockImplementation(() => false);

    const actualDom =
      await vi.importActual<typeof import("@utils/dom")>("@utils/dom");
    vi.mocked(get_player_id_in_element).mockImplementation(
      actualDom.get_player_id_in_element,
    );

    await statusAttack.run();
  }

  test("Eliminations team-list real markup (desktop): clicking the presence icon in the badge tray extracts the correct player per row, unmocked", async () => {
    await runUnmockedOnFixture(eliminationsTeamListDesktop);

    for (const { playerId, presence } of eliminationRows) {
      const row = eliminationRow(playerId);
      // Dispatch on the <a>, which is what a real click lands on.
      const presenceLink = row.querySelector(
        `a[aria-label="${presence}"]`,
      ) as HTMLElement;
      expect(presenceLink).not.toBeNull();
      expect(presenceLink.parentElement?.id).toMatch(/^icon\d+___/);

      presenceLink.click();

      expect(openSpy).toHaveBeenLastCalledWith(
        `https://www.torn.com/page.php?sid=attack&user2ID=${playerId}`,
        "_blank",
      );
    }
  });

  test("Eliminations team-list real markup (desktop): clicking the status text extracts the correct player per row, unmocked", async () => {
    await runUnmockedOnFixture(eliminationsTeamListDesktop);

    for (const { playerId, status } of eliminationRows) {
      const row = eliminationRow(playerId);
      const statusText = row.querySelector(
        '[class*="status__"] > span',
      ) as HTMLElement;
      expect(statusText).not.toBeNull();
      expect(statusText.textContent).toBe(status);

      statusText.click();

      expect(openSpy).toHaveBeenLastCalledWith(
        `https://www.torn.com/page.php?sid=attack&user2ID=${playerId}`,
        "_blank",
      );
    }
  });

  test("Eliminations team-list real markup (mobile): clicking the status text extracts the correct player per row, unmocked", async () => {
    // Same grid in its narrow layout: identical rows minus the icons__ badge
    // tray cell, so the status text is the only click target.
    await runUnmockedOnFixture(eliminationsTeamListMobile);
    expect(document.querySelector('[class*="icons__"]')).toBeNull();

    for (const { playerId, status } of eliminationRows) {
      const row = eliminationRow(playerId);
      const statusText = row.querySelector(
        '[class*="status__"] > span',
      ) as HTMLElement;
      expect(statusText).not.toBeNull();
      expect(statusText.textContent).toBe(status);

      statusText.click();

      expect(openSpy).toHaveBeenLastCalledWith(
        `https://www.torn.com/page.php?sid=attack&user2ID=${playerId}`,
        "_blank",
      );
    }
  });

  test("Eliminations team-list real markup (desktop): clicking other badge-tray icons is not intercepted", async () => {
    await runUnmockedOnFixture(eliminationsTeamListDesktop);

    // Faction/Bazaar (userID=), Married (NID=) and the Abroad icon71 badge
    // share the presence icon's li shape but must stay plain navigation /
    // no-ops.
    const badges: { playerId: number; label: string }[] = [
      { playerId: 35899, label: "Faction" },
      { playerId: 166, label: "Bazaar" },
      { playerId: 166, label: "Married" },
      { playerId: 213936, label: "Abroad" },
    ];

    for (const { playerId, label } of badges) {
      const row = eliminationRow(playerId);
      // Dispatched on the li (as the Advanced Search badge test does) so
      // jsdom doesn't try to follow the badge's real href.
      const badge = row
        .querySelector(`a[aria-label^="${label}"]`)
        ?.closest("li") as HTMLElement;
      expect(badge).not.toBeNull();

      const event = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      });
      badge.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
    }

    expect(openSpy).not.toHaveBeenCalled();
    expect(mockLocation.href).toBe("");
  });

  test("Click is bypassed when status_attack_links_enabled is false", async () => {
    ffconfig.status_attack_links_enabled = false;
    vi.mocked(torn_page).mockImplementation((page) => page === "profiles");

    const profileIcon = document.createElement("li");
    profileIcon.id = "icon62-profile-2625349";
    profileIcon.className = "user-status-16-Away left";
    document.body.appendChild(profileIcon);

    await statusAttack.run();

    profileIcon.click();

    expect(openSpy).not.toHaveBeenCalled();
    expect(mockLocation.href).toBe("");
  });
});
