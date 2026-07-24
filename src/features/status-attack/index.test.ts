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
