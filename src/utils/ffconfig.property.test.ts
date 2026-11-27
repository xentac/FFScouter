// @vitest-environment jsdom
// Properties for the FFConfig enum getters. Settings live in localStorage,
// which the script does not control, so each getter must return a valid
// member for any stored value.
import { fc } from "@fast-check/vitest";
import { beforeEach, describe, expect } from "vitest";
import { prop_with_known_bugs } from "../tests/known-bugs";
import {
  ChainLinkType,
  ChainTabType,
  ColorScheme,
  FactionsColDisplay,
  FFConfig,
  GaugeMarkerJustify,
  GaugeMarkerType,
  MiniProfileDisplay,
  WarQuickAttackAction,
} from "./ffconfig";
import { Storage } from "./storage";

const PREFIX = "ffconfig-property.";

// Each enum getter and its enum. The storage key is the getter name.
const ENUM_GETTERS: {
  getter: keyof FFConfig;
  members: readonly string[];
}[] = [
  { getter: "chain_link_type", members: Object.values(ChainLinkType) },
  { getter: "chain_tab_type", members: Object.values(ChainTabType) },
  {
    getter: "war_quick_attack_action",
    members: Object.values(WarQuickAttackAction),
  },
  {
    getter: "factions_col_display",
    members: Object.values(FactionsColDisplay),
  },
  { getter: "war_col_display", members: Object.values(FactionsColDisplay) },
  {
    getter: "mini_profile_display",
    members: Object.values(MiniProfileDisplay),
  },
  { getter: "gauge_marker_type", members: Object.values(GaugeMarkerType) },
  {
    getter: "gauge_marker_justify",
    members: Object.values(GaugeMarkerJustify),
  },
  { getter: "color_scheme", members: Object.values(ColorScheme) },
  {
    getter: "bounty_attack_action",
    members: Object.values(WarQuickAttackAction),
  },
];

// A stored setting: mostly a valid member of the getter's own enum, else
// another getter's member, any string, or any JSON value. A beta build, an
// older build, or a hand edit can store any of these.
function stored_value_arb(members: readonly string[]): fc.Arbitrary<unknown> {
  return fc.oneof(
    { weight: 3, arbitrary: fc.constantFrom(...members) },
    fc.constantFrom(...ENUM_GETTERS.flatMap((entry) => entry.members)),
    fc.string(),
    fc.jsonValue(),
  );
}

describe("FFConfig enum getter properties", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  for (const { getter, members } of ENUM_GETTERS) {
    // Rule: the getter returns a member of its enum for any stored value.
    // Source: the FFConfig getter, whose return type is the enum.
    prop_with_known_bugs<[unknown]>(
      [stored_value_arb(members)],
      [
        {
          // The getter returns any stored value but null unchecked.
          issue: "https://github.com/xentac/FFScouter/issues/65",
          example: ["not-a-scheme"],
          applies: (stored) =>
            stored !== null && !members.includes(stored as string),
          // The arbitrary draws a value outside the enum about half of the
          // time on purpose, so the bug owns about that share.
          max_share: 0.6,
        },
      ],
    )(`${getter} returns a valid member for any stored value`, (stored) => {
      // The setter writes through the same Storage, so this is the stored
      // shape that the getter reads.
      new Storage(PREFIX).set(getter, stored);
      const value = new FFConfig(PREFIX)[getter];
      expect(members).toContain(value);
    });
  }
});
