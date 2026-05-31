import {
  type ChainLinkType,
  type ChainTabType,
  CONFIG_DEFAULTS,
  type FactionsColDisplay,
  type GaugeMarkerType,
} from "@utils/ffconfig";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";

@customElement("ff-settings-panel")
export class FFSettingsPanel extends LitElement {
  protected override createRenderRoot() {
    return this;
  }

  // Inputs
  @property({ type: String }) apiKey = "";
  @property({ type: Number }) lowRange: number = CONFIG_DEFAULTS.low_ff_range;
  @property({ type: Number }) highRange: number = CONFIG_DEFAULTS.high_ff_range;
  @property({ type: Number }) maxRange: number = CONFIG_DEFAULTS.max_ff_range;
  @property({ type: Boolean }) chainButtonEnabled: boolean =
    CONFIG_DEFAULTS.chain_button_enabled;
  @property({ type: String }) chainLinkType: ChainLinkType =
    CONFIG_DEFAULTS.chain_link_type;
  @property({ type: String }) chainTabType: ChainTabType =
    CONFIG_DEFAULTS.chain_tab_type;
  @property({ type: Number }) chainFFTarget: number =
    CONFIG_DEFAULTS.chain_ff_target;
  @property({ type: Number }) chainMinLevel: number | null =
    CONFIG_DEFAULTS.chain_min_level;
  @property({ type: Number }) chainMaxLevel: number | null =
    CONFIG_DEFAULTS.chain_max_level;
  @property({ type: Boolean }) chainInactive: boolean =
    CONFIG_DEFAULTS.chain_inactive;
  @property({ type: Number }) chainMinFF: number | null =
    CONFIG_DEFAULTS.chain_min_ff;
  @property({ type: Number }) chainMaxFF: number = CONFIG_DEFAULTS.chain_max_ff;
  @property({ type: Boolean }) chainFactionless: boolean =
    CONFIG_DEFAULTS.chain_factionless;
  @property({ type: Boolean }) ffHistoryEnabled: boolean =
    CONFIG_DEFAULTS.ff_history_enabled;
  @property({ type: String }) factionsColDisplay: FactionsColDisplay =
    CONFIG_DEFAULTS.factions_col_display;
  @property({ type: String }) warColDisplay: FactionsColDisplay =
    CONFIG_DEFAULTS.war_col_display;
  @property({ type: Boolean }) debugLogs: boolean = CONFIG_DEFAULTS.debug_logs;
  @property({ type: Boolean }) analyticsEnabled: boolean =
    CONFIG_DEFAULTS.analytics_enabled;
  @property({ type: String }) gaugeMarkerType: GaugeMarkerType =
    CONFIG_DEFAULTS.gauge_marker_type;
  @property({ type: Boolean }) isPremium: boolean = false;

  // Draft States
  @state() private draftApiKey = "";
  @state() private draftLowRange: number = CONFIG_DEFAULTS.low_ff_range;
  @state() private draftHighRange: number = CONFIG_DEFAULTS.high_ff_range;
  @state() private draftMaxRange: number = CONFIG_DEFAULTS.max_ff_range;
  @state() private draftChainButtonEnabled: boolean =
    CONFIG_DEFAULTS.chain_button_enabled;
  @state() private draftChainLinkType: ChainLinkType =
    CONFIG_DEFAULTS.chain_link_type;
  @state() private draftChainTabType: ChainTabType =
    CONFIG_DEFAULTS.chain_tab_type;
  @state() private draftChainFFTarget: number = CONFIG_DEFAULTS.chain_ff_target;
  @state() private draftChainMinLevel: number | null =
    CONFIG_DEFAULTS.chain_min_level;
  @state() private draftChainMaxLevel: number | null =
    CONFIG_DEFAULTS.chain_max_level;
  @state() private draftChainInactive: boolean = CONFIG_DEFAULTS.chain_inactive;
  @state() private draftChainMinFF: number | null =
    CONFIG_DEFAULTS.chain_min_ff;
  @state() private draftChainMaxFF: number = CONFIG_DEFAULTS.chain_max_ff;
  @state() private draftChainFactionless: boolean =
    CONFIG_DEFAULTS.chain_factionless;
  @state() private draftFFHistoryEnabled: boolean =
    CONFIG_DEFAULTS.ff_history_enabled;
  @state() private draftFactionsColDisplay: FactionsColDisplay =
    CONFIG_DEFAULTS.factions_col_display;
  @state() private draftWarColDisplay: FactionsColDisplay =
    CONFIG_DEFAULTS.war_col_display;
  @state() private draftDebugLogs: boolean = CONFIG_DEFAULTS.debug_logs;
  @state() private draftAnalyticsEnabled: boolean =
    CONFIG_DEFAULTS.analytics_enabled;
  @state() private draftGaugeMarkerType: GaugeMarkerType =
    CONFIG_DEFAULTS.gauge_marker_type;

  @state() private rangeError = "";
  @state() private showSavedMessage = false;

  override connectedCallback() {
    super.connectedCallback();
    this.resetDrafts();
  }

  override willUpdate(changedProperties: Map<PropertyKey, unknown>) {
    if (
      changedProperties.has("apiKey") ||
      changedProperties.has("lowRange") ||
      changedProperties.has("highRange") ||
      changedProperties.has("maxRange") ||
      changedProperties.has("chainButtonEnabled") ||
      changedProperties.has("chainLinkType") ||
      changedProperties.has("chainTabType") ||
      changedProperties.has("chainFFTarget") ||
      changedProperties.has("chainMinLevel") ||
      changedProperties.has("chainMaxLevel") ||
      changedProperties.has("chainInactive") ||
      changedProperties.has("chainMinFF") ||
      changedProperties.has("chainMaxFF") ||
      changedProperties.has("chainFactionless") ||
      changedProperties.has("ffHistoryEnabled") ||
      changedProperties.has("factionsColDisplay") ||
      changedProperties.has("warColDisplay") ||
      changedProperties.has("debugLogs") ||
      changedProperties.has("analyticsEnabled") ||
      changedProperties.has("gaugeMarkerType")
    ) {
      this.resetDrafts();
    }
  }

  private resetDrafts() {
    this.draftApiKey = this.apiKey;
    this.draftLowRange = this.lowRange;
    this.draftHighRange = this.highRange;
    this.draftMaxRange = this.maxRange;
    this.draftChainButtonEnabled = this.chainButtonEnabled;
    this.draftChainLinkType = this.chainLinkType;
    this.draftChainTabType = this.chainTabType;
    this.draftChainFFTarget = this.chainFFTarget;
    this.draftChainMinLevel = this.chainMinLevel;
    this.draftChainMaxLevel = this.chainMaxLevel;
    this.draftChainInactive = this.chainInactive;
    this.draftChainMinFF = this.chainMinFF;
    this.draftChainMaxFF = this.chainMaxFF;
    this.draftChainFactionless = this.chainFactionless;
    this.draftFFHistoryEnabled = this.ffHistoryEnabled;
    this.draftFactionsColDisplay = this.factionsColDisplay;
    this.draftWarColDisplay = this.warColDisplay;
    this.draftDebugLogs = this.debugLogs;
    this.draftAnalyticsEnabled = this.analyticsEnabled;
    this.draftGaugeMarkerType = this.gaugeMarkerType;
  }

  private handleSave() {
    // Validate Ranges
    const low = this.draftLowRange;
    const high = this.draftHighRange;
    const max = this.draftMaxRange;
    if (Number.isNaN(low) || Number.isNaN(high) || Number.isNaN(max)) {
      this.rangeError = "FF ranges must be valid numbers";
      return;
    }
    if (low <= 0 || high <= 0 || max <= 0) {
      this.rangeError = "FF ranges must be positive numbers";
      return;
    }
    if (low >= high || high >= max) {
      this.rangeError =
        "FF ranges must be in ascending order: low < high < max";
      return;
    }
    this.rangeError = "";

    this.showSavedMessage = true;
    setTimeout(() => {
      this.showSavedMessage = false;
    }, 3000);

    // Dispatch save event
    this.dispatchEvent(
      new CustomEvent("ff-save", {
        detail: {
          apiKey: this.draftApiKey,
          lowRange: low,
          highRange: high,
          maxRange: max,
          chainButtonEnabled: this.draftChainButtonEnabled,
          chainLinkType: this.draftChainLinkType,
          chainTabType: this.draftChainTabType,
          chainFFTarget: this.draftChainFFTarget,
          chainMinLevel: this.draftChainMinLevel,
          chainMaxLevel: this.draftChainMaxLevel,
          chainInactive: this.draftChainInactive,
          chainMinFF: this.draftChainMinFF,
          chainMaxFF: this.draftChainMaxFF,
          chainFactionless: this.draftChainFactionless,
          ffHistoryEnabled: this.draftFFHistoryEnabled,
          factionsColDisplay: this.draftFactionsColDisplay,
          warColDisplay: this.draftWarColDisplay,
          debugLogs: this.draftDebugLogs,
          analyticsEnabled: this.draftAnalyticsEnabled,
          gaugeMarkerType: this.draftGaugeMarkerType,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleReset() {
    if (confirm("Are you sure you want to reset all settings to defaults?")) {
      this.dispatchEvent(
        new CustomEvent("ff-reset", {
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  private handleClearCache() {
    if (confirm("Are you sure you want to clear all FF Scouter cache?")) {
      this.dispatchEvent(
        new CustomEvent("ff-clear-cache", {
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  private handleVerify() {
    this.dispatchEvent(
      new CustomEvent("ff-verify", {
        detail: {
          apiKey: this.draftApiKey,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onKeyInput(e: Event) {
    this.draftApiKey = (e.target as HTMLInputElement).value;
    this.showSavedMessage = false;
  }

  private onKeyChange(e: Event) {
    const val = (e.target as HTMLInputElement).value.trim();
    this.draftApiKey = val;
    this.dispatchEvent(
      new CustomEvent("ff-save-key", {
        detail: { apiKey: val },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onLowRangeInput(e: Event) {
    this.draftLowRange = Number((e.target as HTMLInputElement).value);
    this.showSavedMessage = false;
  }

  private onHighRangeInput(e: Event) {
    this.draftHighRange = Number((e.target as HTMLInputElement).value);
    this.showSavedMessage = false;
  }

  private onMaxRangeInput(e: Event) {
    this.draftMaxRange = Number((e.target as HTMLInputElement).value);
    this.showSavedMessage = false;
  }

  private onChainButtonChange(e: Event) {
    this.draftChainButtonEnabled = (e.target as HTMLInputElement).checked;
    this.showSavedMessage = false;
  }

  private onChainLinkTypeChange(e: Event) {
    this.draftChainLinkType = (e.target as HTMLSelectElement)
      .value as ChainLinkType;
    this.showSavedMessage = false;
  }

  private onChainTabTypeChange(e: Event) {
    this.draftChainTabType = (e.target as HTMLSelectElement)
      .value as ChainTabType;
    this.showSavedMessage = false;
  }

  private onChainMinLevelInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    this.draftChainMinLevel = val === "" ? null : Number(val);
    this.showSavedMessage = false;
  }

  private onChainMaxLevelInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    this.draftChainMaxLevel = val === "" ? null : Number(val);
    this.showSavedMessage = false;
  }

  private onChainInactiveChange(e: Event) {
    this.draftChainInactive = (e.target as HTMLInputElement).checked;
    this.showSavedMessage = false;
  }

  private onChainMinFFInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    this.draftChainMinFF = val === "" ? null : Number(val);
    this.showSavedMessage = false;
  }

  private onChainMaxFFInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    const num = Number(val);
    this.draftChainMaxFF = num;
    this.draftChainFFTarget = num;
    this.showSavedMessage = false;
  }

  private onChainFactionlessChange(e: Event) {
    this.draftChainFactionless = (e.target as HTMLInputElement).checked;
    this.showSavedMessage = false;
  }

  private onFFHistoryChange(e: Event) {
    this.draftFFHistoryEnabled = (e.target as HTMLInputElement).checked;
    this.showSavedMessage = false;
  }

  private onFactionsColDisplayChange(e: Event) {
    this.draftFactionsColDisplay = (e.target as HTMLSelectElement)
      .value as FactionsColDisplay;
    this.showSavedMessage = false;
  }

  private onWarColDisplayChange(e: Event) {
    this.draftWarColDisplay = (e.target as HTMLSelectElement)
      .value as FactionsColDisplay;
    this.showSavedMessage = false;
  }

  private onDebugLogsChange(e: Event) {
    this.draftDebugLogs = (e.target as HTMLInputElement).checked;
    this.showSavedMessage = false;
  }

  private onAnalyticsEnabledChange(e: Event) {
    this.draftAnalyticsEnabled = (e.target as HTMLInputElement).checked;
    this.showSavedMessage = false;
  }

  private onGaugeMarkerTypeChange(e: Event) {
    this.draftGaugeMarkerType = (e.target as HTMLSelectElement)
      .value as GaugeMarkerType;
    this.showSavedMessage = false;
  }

  override render() {
    return html`
      <details
        class="accordion ${!this.apiKey ? "glow" : ""} cont-gray border-round"
      >
        <summary style="cursor: pointer; font-weight: bold;">
          FF Scouter Settings
        </summary>

        <div style="margin-top: 15px;">
          <div class="ff-api-explanation">
            <strong>Important:</strong> You must use the SAME exact API key that
            you use on
            <a href="https://ffscouter.com/" target="_blank">ffscouter.com</a>.
            <br /><br />
            If you're not sure which API key you used, go to
            <a
              href="https://www.torn.com/preferences.php#tab=api"
              target="_blank"
              >your API preferences</a
            >
            and look for "FFScouter3" in your API key history comments.
          </div>
          <!-- API Key Input -->
          <div class="input-row">
            <label for="api-key">API Key:</label>
            <input
              id="api-key"
              type="text"
              class="${this.apiKey ? "blur-mode" : ""}"
              placeholder="Paste your key here..."
              .value=${this.draftApiKey}
              @input=${this.onKeyInput}
              @change=${this.onKeyChange}
            />
          </div>
          <div class="input-row-inline">
            <label for="ff-premium-badge">FF Scouter Premium:</label>
            <span
              id="ff-premium-badge"
              class="is_premium_${this.isPremium ? "enabled" : "disabled"}"
              >${this.isPremium ? "Enabled" : "Disabled"}</span
            >
          </div>
          <div class="input-row-inline">
            <button class="torn-btn btn-save" @click=${this.handleVerify}>
              Verify
            </button>
          </div>

          <!-- Ranges Input -->
          <div class="input-row">
            <label>FF Ranges (Low, High, Max):</label>
            <div style="display: flex; gap: 10px; align-items: center;">
              <input
                id="ff-range-low"
                type="number"
                step="0.1"
                class="ff-number"
                .value=${this.draftLowRange.toString()}
                @input=${this.onLowRangeInput}
              />
              <span>&lt;</span>
              <input
                id="ff-range-high"
                type="number"
                step="0.1"
                class="ff-number"
                .value=${this.draftHighRange.toString()}
                @input=${this.onHighRangeInput}
              />
              <span>&lt;</span>
              <input
                id="ff-range-max"
                type="number"
                step="0.1"
                class="ff-number"
                .value=${this.draftMaxRange.toString()}
                @input=${this.onMaxRangeInput}
              />
            </div>
            ${
              this.rangeError
                ? html`<div class="error-msg">${this.rangeError}</div>`
                : ""
            }
          </div>

          <!-- Feature Toggles -->
          <h3>Feature Toggles:</h3>

          <!-- Chain Button Toggle -->
          <div class="input-row-inline">
            <input
              id="chain-button-toggle"
              type="checkbox"
              .checked=${this.draftChainButtonEnabled}
              @change=${this.onChainButtonChange}
            />
            <label for="chain-button-toggle"
              >Enable Chain Button (Green FF Button)</label
            >
          </div>

          ${
            this.draftChainButtonEnabled
              ? html`
                  <div class="chain-options-flex-container">
                    <div class="input-row-inline">
                      <label for="chain-link-type">Chain button opens:</label>
                      <select
                        id="chain-link-type"
                        .value=${this.draftChainLinkType}
                        @change=${this.onChainLinkTypeChange}
                      >
                        <option value="attack">Attack page</option>
                        <option value="profile">Profile page</option>
                      </select>
                    </div>

                    <div class="input-row-inline">
                      <label for="chain-tab-type">Open in:</label>
                      <select
                        id="chain-tab-type"
                        .value=${this.draftChainTabType}
                        @change=${this.onChainTabTypeChange}
                      >
                        <option value="newtab">New tab</option>
                        <option value="sametab">Same tab</option>
                      </select>
                    </div>

                    <div class="input-row-inline">
                      <label for="chain-min-level">Min Level:</label>
                      <input
                        id="chain-min-level"
                        type="number"
                        class="ff-number"
                        placeholder="No min"
                        .value=${
                          this.draftChainMinLevel === null
                            ? ""
                            : this.draftChainMinLevel.toString()
                        }
                        @input=${this.onChainMinLevelInput}
                      />
                    </div>

                    <div class="input-row-inline">
                      <label for="chain-max-level">Max Level:</label>
                      <input
                        id="chain-max-level"
                        type="number"
                        class="ff-number"
                        placeholder="No max"
                        .value=${
                          this.draftChainMaxLevel === null
                            ? ""
                            : this.draftChainMaxLevel.toString()
                        }
                        @input=${this.onChainMaxLevelInput}
                      />
                    </div>

                    <div class="input-row-inline">
                      <label for="chain-min-ff">Min FF:</label>
                      <input
                        id="chain-min-ff"
                        type="number"
                        step="0.1"
                        class="ff-number"
                        placeholder="No min"
                        .value=${
                          this.draftChainMinFF === null
                            ? ""
                            : this.draftChainMinFF.toString()
                        }
                        @input=${this.onChainMinFFInput}
                      />
                    </div>

                    <div class="input-row-inline">
                      <label for="chain-max-ff">Max FF:</label>
                      <input
                        id="chain-max-ff"
                        type="number"
                        step="0.1"
                        class="ff-number"
                        placeholder="No max"
                        .value=${this.draftChainMaxFF.toString()}
                        @input=${this.onChainMaxFFInput}
                      />
                    </div>

                    <div class="input-row-inline">
                      <input
                        id="chain-inactive"
                        type="checkbox"
                        .checked=${this.draftChainInactive}
                        @change=${this.onChainInactiveChange}
                      />
                      <label for="chain-inactive"
                        >Inactive Only (14+ days offline)</label
                      >
                    </div>

                    <div class="input-row-inline">
                      <input
                        id="chain-factionless"
                        type="checkbox"
                        .checked=${this.draftChainFactionless}
                        @change=${this.onChainFactionlessChange}
                      />
                      <label for="chain-factionless">Factionless Only</label>
                    </div>
                  </div>
                `
              : ""
          }

          <!-- FF History Toggle -->
          <div class="input-row-inline">
            <input
              id="ff-history-toggle"
              type="checkbox"
              .checked=${this.draftFFHistoryEnabled}
              @change=${this.onFFHistoryChange}
            />
            <label for="ff-history-toggle"
              >Enable FF History button on profile pages</label
            >
          </div>
          <div class="input-row-inline">
            <label>War Monitor is no longer supported. Use <a target="_blank" href="https://greasyfork.org/en/scripts/529238-torn-war-stuff-enhanced">Torn War Stuff Enhanced</a> instead.</a></label
            >
          </div>

          <!-- Gauge Marker Display Style -->
          <div class="input-row-inline">
            <label for="gauge-marker-type">Gauge Marker Style:</label>
            <select
              id="gauge-marker-type"
              .value=${this.draftGaugeMarkerType}
              @change=${this.onGaugeMarkerTypeChange}
            >
              <option value="arrow">Arrow (Default)</option>
              <option value="bubble_ff">Bubble (FF Score)</option>
              <option value="bubble_estimate">Bubble (BS Estimate)</option>
            </select>
          </div>

          <!-- Factions Column Display -->
          <div class="input-row-inline">
            <label for="factions-col-display">Faction Page Shows:</label>
            <select
              id="factions-col-display"
              .value=${this.draftFactionsColDisplay}
              @change=${this.onFactionsColDisplayChange}
            >
              <option value="fair_fight">FF Score</option>
              <option value="battle_stats">BS Estimate</option>
              <option value="none">None (Hide Column)</option>
            </select>
          </div>

          <!-- War Column Display -->
          <div class="input-row-inline">
            <label for="war-col-display">War Page Shows:</label>
            <select
              id="war-col-display"
              .value=${this.draftWarColDisplay}
              @change=${this.onWarColDisplayChange}
            >
              <option value="fair_fight">FF Score</option>
              <option value="battle_stats">BS Estimate</option>
              <option value="none">None (Hide Column)</option>
            </select>
          </div>

          <!-- Debug Settings -->
          <h3>Debug Settings:</h3>
          <div class="input-row-inline">
            <input
              id="debug-logs"
              type="checkbox"
              .checked=${this.draftDebugLogs}
              @change=${this.onDebugLogsChange}
            />
            <label for="debug-logs">Enable debug logging</label>
          </div>

          <!-- Analytics Toggle -->
          <div class="input-row-inline">
            <input
              id="analytics-toggle"
              type="checkbox"
              .checked=${this.draftAnalyticsEnabled}
              @change=${this.onAnalyticsEnabledChange}
            />
            <label for="analytics-toggle"
              >Enable local analytics logging (last 30 days)</label
            >
          </div>

          <!-- Action Buttons Area -->
          <div
            style="display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 10px; margin-top: 20px;"
          >
            <button class="torn-btn btn-save" @click=${this.handleSave}>
              Save Settings
            </button>
            <button class="torn-btn btn-secondary" @click=${this.handleReset}>
              Reset to Defaults
            </button>
            <button
              class="torn-btn btn-secondary"
              @click=${this.handleClearCache}
            >
              Clear FF Cache
            </button>
            ${
              this.showSavedMessage
                ? html`<span style="color: #4CAF50;">✓ Saved!</span>`
                : ""
            }
          </div>
        </div>
      </details>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ff-settings-panel": FFSettingsPanel;
  }
}
