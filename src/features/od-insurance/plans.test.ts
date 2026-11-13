import {
  ECSTASY_PLAN,
  PLANS_RESPONSE,
  UNPAYABLE_PLAN,
  WEEKLY_PLAN,
} from "@utils/__fixtures__/od_insurance";
import { expect, test } from "vitest";
import { payable_plans } from "./plans";

test("payable_plans keeps plans that name a recipient", () => {
  expect(payable_plans(PLANS_RESPONSE)).toEqual([ECSTASY_PLAN, WEEKLY_PLAN]);
});

test("payable_plans hides plans whose recipient is null", () => {
  expect(
    payable_plans({
      ...PLANS_RESPONSE,
      plans: [UNPAYABLE_PLAN, ECSTASY_PLAN],
    }),
  ).toEqual([ECSTASY_PLAN]);
});

test("payable_plans returns nothing when no plan is payable", () => {
  expect(
    payable_plans({
      manager_player_id: null,
      manager_name: null,
      plans: [UNPAYABLE_PLAN],
    }),
  ).toEqual([]);
});
