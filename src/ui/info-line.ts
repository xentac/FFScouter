import { check_key_status } from "@utils/check_key";
import logger from "@utils/logger";
import {
  format_difficulty_text,
  format_ff_score,
  format_relative_time,
  get_contrast_color,
  get_ff_colour,
} from "@utils/strings";
import type { FFData } from "@utils/types";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";

const PREMIUM_UPGRADE_URL = "https://ffscouter.com/premium";

@customElement("ff-info-line")
export class FFInfoLine extends LitElement {
  protected override createRenderRoot() {
    return this;
  }

  @property({ type: Object }) data: FFData | null = null;

  @state() private is_premium: boolean | null = null;
  @state() private loading = false;

  // 2. Intercept property changes and run the async work
  protected override async willUpdate(
    changedProperties: Map<string | number | symbol, unknown>,
  ) {
    if (changedProperties.has("data") && this.data) {
      this.loading = true;
      try {
        this.is_premium = await check_key_status.isPremium();
      } catch (error) {
        logger.error(error);
      } finally {
        this.loading = false;
      }
    }
  }

  override render() {
    if (this.data === null || this.data.no_data) {
      return html`<span style="font-weight: bold; margin-right: 6px;"
          >FairFight:</span
        ><span
          style="background: #444; color: #fff; font-weight: bold; padding: 2px 6px; border-radius: 4px; display: inline-block;"
          >No data</span
        >`;
    }
    const ff_string = format_ff_score(this.data);
    const difficulty = format_difficulty_text(this.data);

    const fresh = format_relative_time(this.data.last_updated);

    const background_colour = get_ff_colour(this.data);
    const text_colour = get_contrast_color(background_colour);
    let extraDetailsLine = html``;
    if (this.data.distribution?.distribution_human) {
      const ageStr = format_relative_time(this.data.distribution.last_updated);
      extraDetailsLine = html`<span
        style="display:block; margin-top: 2px; font-size: 12px; font-style: normal;"
        ><span style="font-weight: bold; margin-right: 6px;">Top Stats:</span
        ><span style="font-weight: normal;"
          >${this.data.distribution.distribution_human} ${ageStr}</span
        ></span
      >`;
    } else if (this.loading) {
      extraDetailsLine = html``;
    } else if (
      this.is_premium === false &&
      this.data.premium_insights_available
    ) {
      extraDetailsLine = html`<span class="ff-premium-upgrade-line"
        ><a
          href="${PREMIUM_UPGRADE_URL}"
          target="_blank"
          rel="noopener noreferrer"
          style="font-weight: bold; text-decoration: underline;"
          >Premium Data Available - Upgrade To View</a
        ></span
      >`;
    }
    return html`<span style="font-weight: bold; margin-right: 6px;"
        >FairFight:</span
      ><span
        style="background: ${background_colour}; color: ${text_colour}; font-weight: bold; padding: 2px 6px; border-radius: 4px; display: inline-block;"
        >${ff_string} (${difficulty}) ${fresh}</span
      ><span
        style="font-size: 11px; font-weight: normal; margin-left: 6px; vertical-align: middle; font-style: italic;"
        >Est. Stats: <span>${this.data.bs_estimate_human}</span></span
      >${extraDetailsLine}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ff-info-line": FFInfoLine;
  }
}
