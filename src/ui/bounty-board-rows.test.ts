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
  NO_FILTERS,
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
  );
  expect(rows.map((r) => r.max_price_per_hit)).toEqual([
    700000, 300000, 100000,
  ]);
});

test("disabled targets never appear", () => {
  const rows = build_board_view(
    [player({ disabled: true, disabled_reason: "target" }), faction()],
    EMPTY_FF,
    NO_FILTERS,
  );
  expect(rows).toHaveLength(1);
  expect(rows[0]?.kind).toEqual("faction");
});

test("player targets become player rows with keys, tiers, and names", () => {
  const rows = build_board_view([player()], EMPTY_FF, NO_FILTERS);
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
  const rows = build_board_view([faction()], EMPTY_FF, NO_FILTERS);
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
    { stats_less_than: 1000000, ff_less_than: null },
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
    { stats_less_than: null, ff_less_than: 3 },
  );
  // 1 has FF 4.5 (hidden); 2 is no_data (kept); 3 has no lookup yet (kept).
  expect(rows.map((r) => (r.kind === "player" ? r.player_id : null))).toEqual([
    2, 3,
  ]);
});

test("faction members filter individually; card survives while any member passes", () => {
  const rows = build_board_view([faction()], EMPTY_FF, {
    stats_less_than: 500000000,
    ff_less_than: null,
  });
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
    { stats_less_than: 500000000, ff_less_than: null },
  );
  expect(rows).toHaveLength(0);
});

test("rows carry the claim target hint: player id for players, faction id for members", () => {
  const rows = build_board_view([player(), faction()], EMPTY_FF, NO_FILTERS);
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
  ];
  expect(ff_ids_to_load(targets, [])).toEqual([267456763]);
  expect(ff_ids_to_load(targets, [6731])).toEqual([
    267456763, 400001, 400002, 400003,
  ]);
});
