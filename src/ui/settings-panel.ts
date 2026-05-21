import {
  type ChainLinkType,
  type ChainTabType,
  CONFIG_DEFAULTS,
  type FactionsColDisplay,
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
  @property({ type: Boolean }) ffHistoryEnabled: boolean =
    CONFIG_DEFAULTS.ff_history_enabled;
  @property({ type: String }) factionsColDisplay: FactionsColDisplay =
    CONFIG_DEFAULTS.factions_col_display;
  @property({ type: Boolean }) debugLogs: boolean = CONFIG_DEFAULTS.debug_logs;
  @property({ type: Boolean }) analyticsEnabled: boolean =
    CONFIG_DEFAULTS.analytics_enabled;
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
  @state() private draftFFHistoryEnabled: boolean =
    CONFIG_DEFAULTS.ff_history_enabled;
  @state() private draftFactionsColDisplay: FactionsColDisplay =
    CONFIG_DEFAULTS.factions_col_display;
  @state() private draftDebugLogs: boolean = CONFIG_DEFAULTS.debug_logs;
  @state() private draftAnalyticsEnabled: boolean =
    CONFIG_DEFAULTS.analytics_enabled;

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
      changedProperties.has("ffHistoryEnabled") ||
      changedProperties.has("factionsColDisplay") ||
      changedProperties.has("debugLogs") ||
      changedProperties.has("analyticsEnabled")
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
    this.draftFFHistoryEnabled = this.ffHistoryEnabled;
    this.draftFactionsColDisplay = this.factionsColDisplay;
    this.draftDebugLogs = this.debugLogs;
    this.draftAnalyticsEnabled = this.analyticsEnabled;
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
          ffHistoryEnabled: this.draftFFHistoryEnabled,
          factionsColDisplay: this.draftFactionsColDisplay,
          debugLogs: this.draftDebugLogs,
          analyticsEnabled: this.draftAnalyticsEnabled,
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

  private onChainFFTargetInput(e: Event) {
    this.draftChainFFTarget = Number((e.target as HTMLInputElement).value);
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

  private onDebugLogsChange(e: Event) {
    this.draftDebugLogs = (e.target as HTMLInputElement).checked;
    this.showSavedMessage = false;
  }

  private onAnalyticsEnabledChange(e: Event) {
    this.draftAnalyticsEnabled = (e.target as HTMLInputElement).checked;
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
                <div style="margin-left: 20px;">
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
                    <label for="chain-ff-target"
                      >FF target (Maximum FF the chain button should
                      open):</label
                    >
                    <input
                      id="chain-ff-target"
                      type="number"
                      step="0.1"
                      class="ff-number"
                      .value=${this.draftChainFFTarget.toString()}
                      @input=${this.onChainFFTargetInput}
                    />
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
