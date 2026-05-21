import { FFApiError } from "@utils/api";
import { check_key_status } from "@utils/check_key";
import { ffscouter } from "@utils/ffscouter";
import logger from "@utils/logger";
import type { PlayerFlightsResponse } from "@utils/types";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";

const PREMIUM_UPGRADE_URL = "https://ffscouter.com/premium";

const premium_action = html`<a
  href="${PREMIUM_UPGRADE_URL}"
  target="_blank"
  rel="noopener noreferrer"
  style="font-weight: bold; text-decoration: underline;"
  >Upgrade to FFScouter Flight Tracking</a
>`;

function get_current_time_seconds(): number {
  if (typeof (window as any).getCurrentTimestamp === "function") {
    return (window as any).getCurrentTimestamp() / 1000;
  }
  return Date.now() / 1000;
}

function format_duration_human(totalSeconds: number): string {
  const clampedSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clampedSeconds / 3600);
  const minutes = Math.floor((clampedSeconds % 3600) / 60);
  const seconds = clampedSeconds % 60;
  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (hours > 0 || minutes > 0) {
    parts.push(`${minutes}m`);
  }
  parts.push(`${seconds}s`);
  return parts.join(" ");
}

function format_tct_time(unixSeconds: number): string | null {
  if (!Number.isFinite(unixSeconds)) return null;
  const d = new Date(unixSeconds * 1000);
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

@customElement("ff-flight-profile-status")
export class FFFlightProfileStatus extends LitElement {
  protected override createRenderRoot() {
    return this;
  }

  @property({ type: Number }) playerId: number | null = null;
  @property({ type: Object }) data: PlayerFlightsResponse | null = null;

  @state() private is_premium: boolean | null = null;
  @state() private loading = false;
  @state() private error: string | null = null;
  @state() private current_time_seconds = get_current_time_seconds();

  private fetch_interval: any = null;
  private tick_interval: any = null;

  override connectedCallback() {
    super.connectedCallback();
    this.start_timers();
  }

  override disconnectedCallback() {
    this.stop_timers();
    super.disconnectedCallback();
  }

  private start_timers() {
    this.stop_timers();

    this.tick_interval = setInterval(() => {
      this.current_time_seconds = get_current_time_seconds();
      if (this.data?.rechecking && this.data.next_retry_at) {
        if (Date.now() >= this.data.next_retry_at) {
          this.fetch_data();
        }
      }
    }, 1000);

    this.fetch_interval = setInterval(() => {
      // Only do normal 15s updates if not rechecking (since rechecking has its own custom retry ticker)
      if (!this.data?.rechecking) {
        this.fetch_data();
      }
    }, 15000);
  }

  private stop_timers() {
    if (this.tick_interval) {
      clearInterval(this.tick_interval);
      this.tick_interval = null;
    }
    if (this.fetch_interval) {
      clearInterval(this.fetch_interval);
      this.fetch_interval = null;
    }
  }

  protected override async willUpdate(
    changedProperties: Map<string | number | symbol, unknown>,
  ) {
    if (changedProperties.has("playerId") && this.playerId) {
      this.data = null;
      this.error = null;
      this.loading = true;
      this.is_premium = null;
      await this.fetch_data();
    }
  }

  private async fetch_data() {
    if (!this.playerId) return;

    try {
      if (this.is_premium === null) {
        this.is_premium = await check_key_status.is_premium();
      }

      if (!this.is_premium) {
        this.loading = false;
        return;
      }

      const result = await ffscouter.get_flights(this.playerId);
      this.data = result;
      this.error = null;
    } catch (err: any) {
      logger.error("Failed to fetch flight data", err);

      if (err instanceof FFApiError) {
        const code = err.ff_api_error?.code;
        if (code === 19) {
          this.is_premium = false;
        } else if (code === 2 || code === 10 || code === 12) {
          this.error = "Invalid API key";
        } else if (code === 20) {
          this.error = "Rate limit exceeded. Retrying...";
        } else {
          this.error =
            err.ff_api_error?.error ||
            err.message ||
            "Flight tracking unavailable";
        }
      } else {
        this.error = err.message || "Flight tracking unavailable";
      }
    } finally {
      this.loading = false;
    }
  }

  override render() {
    if (this.is_premium === false) {
      return html`<div class="ff-scouter-profile-flight-info">
        ${premium_action}
      </div>`;
    }

    let content = html``;

    if (this.error) {
      content = html`<span style="color: #ff6b6b;">Error: ${this.error}</span>`;
    } else if (this.loading && !this.data) {
      content = html`Landing: estimating...`;
    } else {
      const current = this.data?.current;
      if (this.data?.rechecking) {
        const next = this.data.next_retry_at ?? 0;
        const now = Date.now();
        const seconds = Math.max(0, Math.ceil((next - now) / 1000));
        content = html`No data. Rechecking in ${seconds} seconds.`;
      } else if (!current) {
        content = html`Landing: unavailable for current route`;
      } else {
        const earliest = Number(current.earliest_arrival_time);
        const latest = Number(current.latest_arrival_time);
        if (!Number.isFinite(earliest) || !Number.isFinite(latest)) {
          content = html`Landing: unavailable for current route`;
        } else {
          const nowUnix = this.current_time_seconds;
          const earliestRemaining = Math.max(0, earliest - nowUnix);
          const latestRemaining = Math.max(0, latest - nowUnix);
          const earliestTct = format_tct_time(earliest);
          const latestTct = format_tct_time(latest);

          if (latestRemaining <= 0) {
            content = html`Landing: just landed<br />(${latestTct} TCT latest)`;
          } else if (earliestRemaining <= 0) {
            content = html`Landing: imminent -
              ${format_duration_human(latestRemaining)}<br />(Latest:
              ${latestTct} TCT)`;
          } else {
            content = html`Landing: ${format_duration_human(earliestRemaining)}
              - ${format_duration_human(latestRemaining)}<br />(${earliestTct} -
              ${latestTct} TCT)`;
          }
        }
      }
    }

    return html`<div class="ff-scouter-profile-flight-info">${content}</div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ff-flight-profile-status": FFFlightProfileStatus;
  }
}
