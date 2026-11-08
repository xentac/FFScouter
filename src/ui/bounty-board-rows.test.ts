import {
  FACTION_TARGET,
  PLAYER_TARGET,
} from "@utils/__fixtures__/bounty_board";
import { type BountyBoardTarget, FFApiError } from "@utils/api";
import type { FFData, FFDataComplete, PlayerId } from "@utils/types";
import { expect, test } from "vitest";
import {
  api_error_message,
  build_board_view,
  classify_board_error,
  ff_ids_to_load,
  format_tier_label,
  is_status_available,
  NO_FILTERS,
  resolve_board_status,
} from "./bounty-board-rows";

// Minimal FFDataComplete for filter tests — only fair_fight matters here.
function ff_only(player_id: PlayerId, fair_fight: number): FFDataComplete {
  return {
    player_id,
    no_data: false,
    fair_fight,
    last_updated: 0,
    bs_estimate: 0,
    bs_estimate_human: "0",
    bss_public: 0,
    source: "bss",
    premium_insights_available: false,
    available_estimates: { bss: null, spies: null, premium: null },
    spies: [],
  };
}

const player = (
  overrides: Partial<BountyBoardTarget> = {},
): BountyBoardTarget => ({ ...PLAYER_TARGET, ...overrides });

const faction = (
  overrides: Partial<BountyBoardTarget> = {},
): BountyBoardTarget => ({ ...FACTION_TARGET, ...overrides });

const EMPTY_FF = new Map<PlayerId, FFData>();

const NOW = 1770001400;

test("format_tier_label renders price × quantity", () => {
  expect(
    format_tier_label({ price_per_hit: 700000, quantity_remaining: 3 }),
  ).toEqual("$700k × 3");
  expect(
    format_tier_label({ price_per_hit: 1500000, quantity_remaining: 12 }),
  ).toEqual("$1.5m × 12");
});

test("targets are sorted by max price per hit descending", () => {
  const rows = build_board_view(
    [
      player({ target_player_id: 1, max_price_per_hit: 100000 }),
      faction(), // 300000
      player({ target_player_id: 2, max_price_per_hit: 700000 }),
    ],
    EMPTY_FF,
    NO_FILTERS,
    NOW,
  );
  expect(rows.map((r) => r.max_price_per_hit)).toEqual([
    700000, 300000, 100000,
  ]);
});

test("targets disabled because the user is the target or a member never appear", () => {
  const rows = build_board_view(
    [
      player({ disabled: true, disabled_reason: "target" }),
      faction({ disabled: true, disabled_reason: "member" }),
    ],
    EMPTY_FF,
    NO_FILTERS,
    NOW,
  );
  expect(rows).toHaveLength(0);
});

test("the user's own (buyer-disabled) bounties appear marked, sorted by price", () => {
  const rows = build_board_view(
    [
      player({ target_player_id: 1, max_price_per_hit: 100000 }),
      faction({ disabled: true, disabled_reason: "buyer" }), // 300000
      player({
        target_player_id: 2,
        max_price_per_hit: 700000,
        disabled: true,
        disabled_reason: "buyer",
      }),
    ],
    EMPTY_FF,
    NO_FILTERS,
    NOW,
  );
  expect(rows.map((r) => [r.max_price_per_hit, r.own_bounty])).toEqual([
    [700000, true],
    [300000, true],
    [100000, false],
  ]);
  const card = rows[1];
  if (card?.kind !== "faction") throw new Error("expected faction card");
  expect(card.members.every((m) => m.own_bounty)).toBe(true);
});

test("player targets become player rows with keys, tiers, and names", () => {
  const rows = build_board_view([player()], EMPTY_FF, NO_FILTERS, NOW);
  expect(rows).toEqual([
    expect.objectContaining({
      kind: "player",
      row_key: "p267456763",
      player_id: 267456763,
      name: "Arcanine",
      estimate: 2989885521,
      estimate_available: true,
      max_price_per_hit: 700000,
      tiers: PLAYER_TARGET.tiers,
    }),
  ]);
});

test("faction targets become cards with per-member player rows", () => {
  const rows = build_board_view([faction()], EMPTY_FF, NO_FILTERS, NOW);
  const card = rows[0];
  if (card?.kind !== "faction") throw new Error("expected faction card");
  expect(card.row_key).toEqual("f6731");
  expect(card.faction_id).toEqual(6731);
  expect(card.faction_name).toEqual("Kanto Starters");
  expect(card.faction_tag).toEqual("KNTO");
  expect(card.total_remaining).toEqual(10);
  expect(card.max_price_per_hit).toEqual(300000);
  expect(card.members.map((m) => m.row_key)).toEqual([
    "f6731:m400001",
    "f6731:m400002",
    "f6731:m400003",
  ]);
  // Member rows share the faction bounty's tier ladder.
  expect(card.members[0]?.tiers).toEqual(FACTION_TARGET.tiers);
});

test("stats filter hides rows at/above the limit but never unknown estimates", () => {
  const rows = build_board_view(
    [
      player({ target_player_id: 1, estimate: 2000000000 }),
      player({
        target_player_id: 2,
        target_name: "Unknown",
        estimate: null,
        estimate_available: false,
      }),
      player({ target_player_id: 3, estimate: 999999 }),
    ],
    EMPTY_FF,
    { stats_less_than: 1000000, ff_less_than: null, hide_unavailable: false },
    NOW,
  );
  expect(rows.map((r) => (r.kind === "player" ? r.player_id : null))).toEqual([
    2, 3,
  ]);
});

test("ff filter hides rows with known FF at/above the limit, unknown stays", () => {
  const ff = new Map<PlayerId, FFData>([
    [1, ff_only(1, 4.5)],
    [2, { no_data: true, player_id: 2 }],
  ]);
  const rows = build_board_view(
    [
      player({ target_player_id: 1 }),
      player({ target_player_id: 2 }),
      player({ target_player_id: 3 }),
    ],
    ff,
    { stats_less_than: null, ff_less_than: 3, hide_unavailable: false },
    NOW,
  );
  // 1 has FF 4.5 (hidden); 2 is no_data (kept); 3 has no lookup yet (kept).
  expect(rows.map((r) => (r.kind === "player" ? r.player_id : null))).toEqual([
    2, 3,
  ]);
});

test("faction members filter individually; card survives while any member passes", () => {
  const rows = build_board_view(
    [faction()],
    EMPTY_FF,
    {
      stats_less_than: 500000000,
      ff_less_than: null,
      hide_unavailable: false,
    },
    NOW,
  );
  const card = rows[0];
  if (card?.kind !== "faction") throw new Error("expected faction card");
  // Blastoise (950m) filtered out; Wartortle (unknown) and Squirtle (120m) stay.
  expect(card.members.map((m) => m.name)).toEqual(["Wartortle", "Squirtle"]);
});

test("a faction card disappears only when every member is filtered out", () => {
  const rows = build_board_view(
    [
      faction({
        members: [
          {
            player_id: 400001,
            name: "Blastoise",
            estimate: 950000000,
            estimate_available: true,
          },
        ],
      }),
    ],
    EMPTY_FF,
    { stats_less_than: 500000000, ff_less_than: null, hide_unavailable: false },
    NOW,
  );
  expect(rows).toHaveLength(0);
});

test("rows carry the claim target hint: player id for players, faction id for members", () => {
  const rows = build_board_view(
    [player(), faction()],
    EMPTY_FF,
    NO_FILTERS,
    NOW,
  );
  const [p, f] = rows;
  if (p?.kind !== "player" || f?.kind !== "faction") {
    throw new Error("unexpected row kinds");
  }
  expect(p.claim_target).toEqual({ target_player_id: 267456763 });
  expect(f.members[0]?.claim_target).toEqual({ target_faction_id: 6731 });
});

test("tiers are ordered by price descending so the first tier is the top tier", () => {
  const rows = build_board_view(
    [
      player({
        tiers: [
          { price_per_hit: 500000, quantity_remaining: 6 },
          { price_per_hit: 700000, quantity_remaining: 3 },
        ],
      }),
    ],
    EMPTY_FF,
    NO_FILTERS,
    NOW,
  );
  expect(rows[0]?.tiers.map((t) => t.price_per_hit)).toEqual([700000, 500000]);
});

test("classify_board_error maps consent, key, and other failures to body phases", () => {
  const coded = (code: number, status: number) =>
    new FFApiError(`API request failed. Code: ${code}`, {
      ff_api_error: { code, error: `error ${code}` },
      ff_http_status: status,
    });
  expect(classify_board_error(coded(86, 403))).toEqual({ phase: "consent" });
  expect(classify_board_error(coded(6, 403))).toEqual({
    phase: "key_unregistered",
  });
  expect(classify_board_error(new Error("No API key configured"))).toEqual({
    phase: "key_missing",
  });
  // The API's own error text is surfaced when there is one.
  expect(classify_board_error(coded(21, 429))).toEqual({
    phase: "error",
    message: "error 21",
  });
  expect(classify_board_error(new Error("boom"))).toEqual({
    phase: "error",
    message: "boom",
  });
});

test("api_error_message prefers the API's error text over the wrapper message", () => {
  expect(
    api_error_message(
      new FFApiError("API request failed. Error: nope; Code: 91", {
        ff_api_error: { code: 91, error: "nope" },
        ff_http_status: 409,
      }),
    ),
  ).toEqual("nope");
  expect(api_error_message(new Error("plain"))).toEqual("plain");
  expect(api_error_message("weird")).toEqual("weird");
});

test("ff_ids_to_load covers player targets and only expanded factions' members", () => {
  const targets = [
    player(),
    faction(),
    player({ disabled: true, target_player_id: 9 }),
    player({ disabled: true, disabled_reason: "buyer", target_player_id: 10 }),
  ];
  expect(ff_ids_to_load(targets, [])).toEqual([267456763]);
  expect(ff_ids_to_load(targets, [6731])).toEqual([
    267456763, 400001, 400002, 400003,
  ]);
});

const status = (
  state: string | null,
  until: number | null = null,
  description: string | null = null,
) => ({ state, description, until });

test("resolve_board_status: missing or null state is unknown and available", () => {
  for (const s of [undefined, null, status(null), status("")]) {
    const view = resolve_board_status(s, NOW);
    expect(view).toEqual({ kind: "unknown" });
    expect(is_status_available(view)).toBe(true);
  }
});

test("resolve_board_status: Okay is available", () => {
  const view = resolve_board_status(status("Okay", 0), NOW);
  expect(view).toEqual({ kind: "okay" });
  expect(is_status_available(view)).toBe(true);
});

test("resolve_board_status: Hospital and Jail with a future until count down", () => {
  for (const state of ["Hospital", "Jail"]) {
    const view = resolve_board_status(status(state, NOW + 600), NOW);
    expect(view).toEqual({ kind: "timed", state, remaining: 600 });
    expect(is_status_available(view)).toBe(false);
  }
});

test("resolve_board_status: Hospital and Jail past until become Okay? and available", () => {
  for (const state of ["Hospital", "Jail"]) {
    for (const until of [NOW, NOW - 30]) {
      const view = resolve_board_status(status(state, until), NOW);
      expect(view).toEqual({ kind: "okay_guess" });
      expect(is_status_available(view)).toBe(true);
    }
  }
});

test("resolve_board_status: Hospital and Jail without an until stay static and unavailable", () => {
  // Torn sends 0 rather than null when there is no timer.
  for (const state of ["Hospital", "Jail"]) {
    for (const until of [null, 0]) {
      const view = resolve_board_status(status(state, until), NOW);
      expect(view).toEqual({ kind: "static", state, unavailable: true });
      expect(is_status_available(view)).toBe(false);
    }
  }
});

test("resolve_board_status: Traveling ignores until, even an expired one", () => {
  for (const until of [null, 0, NOW - 30, NOW + 600]) {
    const view = resolve_board_status(
      status("Traveling", until, "Returning to Torn from Japan"),
      NOW,
    );
    expect(view).toEqual({
      kind: "static",
      state: "Traveling",
      unavailable: true,
    });
    expect(is_status_available(view)).toBe(false);
  }
});

test("resolve_board_status: Abroad and Fallen are unavailable", () => {
  for (const state of ["Abroad", "Fallen"]) {
    const view = resolve_board_status(status(state, 0), NOW);
    expect(view).toEqual({ kind: "static", state, unavailable: true });
    expect(is_status_available(view)).toBe(false);
  }
});

test("resolve_board_status: unrecognized states show raw and stay available", () => {
  for (const state of ["Dormant", "Awoken", "Hibernating"]) {
    const view = resolve_board_status(status(state, NOW + 600), NOW);
    expect(view).toEqual({ kind: "static", state, unavailable: false });
    expect(is_status_available(view)).toBe(true);
  }
});

const HIDE_UNAVAILABLE = { ...NO_FILTERS, hide_unavailable: true };

const row_ids = (rows: ReturnType<typeof build_board_view>) =>
  rows.flatMap((r) =>
    r.kind === "player" ? [r.player_id] : r.members.map((m) => m.player_id),
  );

test("hide_unavailable hides unavailable player targets and keeps the rest", () => {
  const targets = [
    player({ target_player_id: 1, status: status("Okay", 0) }),
    player({ target_player_id: 2, status: status("Hospital", NOW + 600) }),
    player({ target_player_id: 3, status: status("Jail", NOW + 600) }),
    player({ target_player_id: 4, status: status("Traveling", 0) }),
    player({ target_player_id: 5, status: status("Abroad", 0) }),
    player({ target_player_id: 6, status: status("Fallen", 0) }),
    player({ target_player_id: 7, status: status("Hospital", NOW - 1) }),
    player({ target_player_id: 8, status: status("Dormant", 0) }),
    player({ target_player_id: 9, status: null }),
    // No status fields at all, as in responses before spec v1.15.0.
    player({ target_player_id: 10 }),
  ];
  expect(
    row_ids(build_board_view(targets, EMPTY_FF, HIDE_UNAVAILABLE, NOW)),
  ).toEqual([1, 7, 8, 9, 10]);
  expect(
    row_ids(build_board_view(targets, EMPTY_FF, NO_FILTERS, NOW)),
  ).toHaveLength(10);
});

test("hide_unavailable shows a Hospital target again once its timer runs out", () => {
  const targets = [player({ status: status("Hospital", NOW + 60) })];
  expect(
    build_board_view(targets, EMPTY_FF, HIDE_UNAVAILABLE, NOW),
  ).toHaveLength(0);
  expect(
    build_board_view(targets, EMPTY_FF, HIDE_UNAVAILABLE, NOW + 60),
  ).toHaveLength(1);
});

test("hide_unavailable also applies to the viewer's own bounties", () => {
  const own = { disabled: true, disabled_reason: "buyer" as const };
  const rows = build_board_view(
    [
      player({ ...own, target_player_id: 1, status: status("Hospital", 0) }),
      player({ ...own, target_player_id: 2, status: status("Okay", 0) }),
    ],
    EMPTY_FF,
    HIDE_UNAVAILABLE,
    NOW,
  );
  expect(row_ids(rows)).toEqual([2]);
});

test("hide_unavailable filters faction members and hides an all-unavailable card", () => {
  const statuses = [
    status("Hospital", NOW + 600),
    status("Okay", 0),
    undefined,
  ];
  const mixed = faction({
    members: FACTION_TARGET.members.map((m, i) => ({
      ...m,
      status: statuses[i],
    })),
  });
  expect(
    row_ids(build_board_view([mixed], EMPTY_FF, HIDE_UNAVAILABLE, NOW)),
  ).toEqual([400002, 400003]);

  const all_out = faction({
    members: FACTION_TARGET.members.map((m) => ({
      ...m,
      status: status("Traveling", 0),
    })),
  });
  expect(
    build_board_view([all_out], EMPTY_FF, HIDE_UNAVAILABLE, NOW),
  ).toHaveLength(0);
});

test("row models carry the status fields, null when absent", () => {
  const [p] = build_board_view(
    [player({ status: status("Okay", 0), status_last_checked: NOW - 45 })],
    EMPTY_FF,
    NO_FILTERS,
    NOW,
  );
  if (p?.kind !== "player") {
    throw new Error("expected a player row");
  }
  expect(p.status).toEqual(status("Okay", 0));
  expect(p.status_last_checked).toEqual(NOW - 45);

  const [card] = build_board_view([faction()], EMPTY_FF, NO_FILTERS, NOW);
  if (card?.kind !== "faction") {
    throw new Error("expected a faction card");
  }
  expect(card.members[0]?.status).toBeNull();
  expect(card.members[0]?.status_last_checked).toBeNull();
});
