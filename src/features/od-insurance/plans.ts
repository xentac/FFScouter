import type { OdInsurancePlan, OdInsurancePlansResponse } from "@utils/api";

// A plan is payable only when the service names a player to send the Xanax
// to. The API lists a plan with a null recipient while no manager is set,
// and nobody can buy it then.
export type PayablePlan = OdInsurancePlan & {
  payment: OdInsurancePlan["payment"] & { recipient_player_id: number };
};

export function payable_plans(
  response: OdInsurancePlansResponse,
): PayablePlan[] {
  return response.plans.filter(
    (plan): plan is PayablePlan => plan.payment.recipient_player_id !== null,
  );
}
