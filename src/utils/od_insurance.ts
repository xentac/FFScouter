import {
  type OdInsurancePlan,
  type OdInsurancePlansResponse,
  query_od_insurance_plans,
} from "./api";
import logger from "./logger";
import default_storage, { type Storage, Time } from "./storage";
import type { PlayerId } from "./types";

const log = logger.child("od-insurance");

// A plan is payable only when the service names a player to send the Xanax
// to. The API lists a plan with a null recipient while no manager is set,
// and nobody can buy it then.
export type PayablePlan = OdInsurancePlan & {
  payment: OdInsurancePlan["payment"] & { recipient_player_id: PlayerId };
};

export function payable_plans(
  response: OdInsurancePlansResponse,
): PayablePlan[] {
  return response.plans.filter(
    (plan): plan is PayablePlan => plan.payment.recipient_player_id !== null,
  );
}

// The plans endpoint allows 30 requests a minute per IP, and plans change
// rarely, so a fetched list is served for 10 minutes without a request.
export const OD_PLANS_FRESH_MS = 10 * 60 * 1000;
// Past freshness, a stored list is still shown (with a note) when a refresh
// fails, but only up to this age. Older than that it is not trusted.
export const OD_PLANS_STALE_LIMIT_HOURS = 24;

const PLANS_KEY = "od-insurance-plans";

type StoredPlans = {
  response: OdInsurancePlansResponse;
  // Date.now() when the response arrived
  fetched_at: number;
};

export type PlansState =
  | { status: "fresh"; response: OdInsurancePlansResponse }
  | {
      status: "stale";
      response: OdInsurancePlansResponse;
      fetched_at: number;
    }
  | { status: "failed" };

/**
 * The stored OD Insurance plans list, shared by the row buttons and the
 * modal. The record lives for 24 hours in storage; freshness (10 minutes) is
 * computed from fetched_at, so a failed refresh can still fall back to it.
 */
export class OdInsurancePlansCache {
  private storage: Storage;
  private query: typeof query_od_insurance_plans;
  private inflight: Promise<PlansState> | null = null;

  constructor(
    options: {
      storage?: Storage;
      query?: typeof query_od_insurance_plans;
    } = {},
  ) {
    this.storage = options.storage ?? default_storage;
    this.query = options.query ?? query_od_insurance_plans;
  }

  private read(): StoredPlans | null {
    return this.storage.get<StoredPlans>(PLANS_KEY);
  }

  /**
   * The plans to show. A fresh stored list returns without a request.
   * Otherwise one request is made, and every caller waiting meanwhile shares
   * it.
   */
  get(): Promise<PlansState> {
    const stored = this.read();
    if (stored && Date.now() - stored.fetched_at < OD_PLANS_FRESH_MS) {
      return Promise.resolve({ status: "fresh", response: stored.response });
    }
    this.inflight ??= this.refresh().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async refresh(): Promise<PlansState> {
    try {
      const resp = await this.query();
      if (resp.blank) throw new Error("OD Insurance plans response was blank");
      this.storage.set<StoredPlans>(
        PLANS_KEY,
        { response: resp.result, fetched_at: Date.now() },
        { amount: OD_PLANS_STALE_LIMIT_HOURS, unit: Time.Hours },
      );
      return { status: "fresh", response: resp.result };
    } catch (err) {
      log.warn("OD Insurance plans did not load", err);
    }
    // Storage drops the record after 24 hours, so anything still here is
    // young enough to show as stale.
    const stored = this.read();
    if (stored) {
      return {
        status: "stale",
        response: stored.response,
        fetched_at: stored.fetched_at,
      };
    }
    return { status: "failed" };
  }
}

export const od_insurance_plans = new OdInsurancePlansCache();
