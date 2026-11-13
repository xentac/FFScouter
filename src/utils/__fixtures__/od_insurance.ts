// Fixtures for the OD Insurance plans endpoint, shaped by the FFScouter
// OpenAPI spec 1.22.0 (OdInsurancePlansResponse). The IDs and names are
// placeholders, like the spec's own example (700001 / InsuranceManager).
import type { OdInsurancePlan, OdInsurancePlansResponse } from "../api";

export const ECSTASY_PLAN: OdInsurancePlan = {
  name: "2 Hour Ecstasy Insurance",
  plan_key: "ecstasy",
  xanax_quantity: 1,
  max_multiplier: 50,
  duration_seconds: 7200,
  duration_label: "2 hours",
  standard_payout_xanax: 22,
  overdose_payout_xanax: 26,
  covered_item: { item_id: 197, name: "Ecstasy" },
  payment: {
    recipient_player_id: 700001,
    recipient_name: "InsuranceManager",
    xanax_quantity: 1,
    message: "insurance:ecstasy",
  },
};

export const WEEKLY_PLAN: OdInsurancePlan = {
  name: "7 Day Xanax Insurance",
  plan_key: "7days",
  xanax_quantity: 20,
  max_multiplier: 10,
  duration_seconds: 604800,
  duration_label: "7 days",
  standard_payout_xanax: 31,
  overdose_payout_xanax: 37,
  covered_item: { item_id: 206, name: "Xanax" },
  payment: {
    recipient_player_id: 700001,
    recipient_name: "InsuranceManager",
    xanax_quantity: 20,
    message: "insurance:7days",
  },
};

// A plan the service lists but cannot take payment for (no manager set).
export const UNPAYABLE_PLAN: OdInsurancePlan = {
  ...WEEKLY_PLAN,
  name: "30 Day Xanax Insurance",
  plan_key: "30days",
  payment: {
    recipient_player_id: null,
    recipient_name: null,
    xanax_quantity: 80,
    message: "insurance:30days",
  },
};

export const PLANS_RESPONSE: OdInsurancePlansResponse = {
  manager_player_id: 700001,
  manager_name: "InsuranceManager",
  plans: [ECSTASY_PLAN, WEEKLY_PLAN],
};
