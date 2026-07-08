import {
  type ChainLinkType,
  type ChainTabType,
  CONFIG_DEFAULTS,
  type ColorScheme,
  type FactionsColDisplay,
  type GaugeMarkerType,
  type WarQuickAttackAction,
} from "@utils/ffconfig";
import {
  FF_ARROW_PATH_D,
  FF_ARROW_VIEWBOX,
  get_contrast_color,
  get_palette_for_scheme,
  get_source_marker,
} from "@utils/strings";
import { createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import styles from "./settings-panel.module.css";
import { SourceMarkerIcon } from "./source-marker-icon";

// Local aliases for the BEM module classes. The keys are hyphenated, so they are
// bracket-accessed once here and referenced by short name in the render below.
const cls = {
  accordion: styles["ff-settings-panel__accordion"],
  accordionGlow: styles["ff-settings-panel__accordion--glow"],
  body: styles["ff-settings-panel__body"],
  group: styles["ff-settings-panel__group"],
  section: styles["ff-settings-panel__section"],
  span: styles["ff-settings-panel__span"],
  cell: styles["ff-settings-panel__cell"],
  cellCheckbox: styles["ff-settings-panel__cell--checkbox"],
  apiExplanation: styles["ff-settings-panel__api-explanation"],
  apiBlock: styles["ff-settings-panel__api-block"],
  apiStatusRow: styles["ff-settings-panel__api-status-row"],
  premiumBadge: styles["ff-settings-panel__premium-badge"],
  premiumBadgeEnabled: styles["ff-settings-panel__premium-badge--enabled"],
  premiumBadgeDisabled: styles["ff-settings-panel__premium-badge--disabled"],
  premiumBadgeUnknown: styles["ff-settings-panel__premium-badge--unknown"],
  blur: styles["ff-settings-panel__blur"],
  number: styles["ff-settings-panel__number"],
  markerSize: styles["ff-settings-panel__marker-size"],
  markerBorderWidth: styles["ff-settings-panel__marker-border-width"],
  markerSizeControls: styles["ff-settings-panel__marker-size-controls"],
  colorScheme: styles["ff-settings-panel__color-scheme"],
  colorSchemeControls: styles["ff-settings-panel__color-scheme-controls"],
  inputRow: styles["ff-settings-panel__input-row"],
  rangeRow: styles["ff-settings-panel__range-row"],
  errorMsg: styles["ff-settings-panel__error-msg"],
  chainSuboptions: styles["ff-settings-panel__chain-suboptions"],
  chainWide: styles["ff-settings-panel__chain-wide"],
  actions: styles["ff-settings-panel__actions"],
  savedMsg: styles["ff-settings-panel__saved-msg"],
};

const DEFAULT_VALUES = {
  apiKey: "",
  lowRange: CONFIG_DEFAULTS.low_ff_range,
  highRange: CONFIG_DEFAULTS.high_ff_range,
  maxRange: CONFIG_DEFAULTS.max_ff_range,
  chainButtonEnabled: CONFIG_DEFAULTS.chain_button_enabled,
  chainLinkType: CONFIG_DEFAULTS.chain_link_type,
  chainTabType: CONFIG_DEFAULTS.chain_tab_type,
  chainFFTarget: CONFIG_DEFAULTS.chain_ff_target,
  chainMinLevel: CONFIG_DEFAULTS.chain_min_level,
  chainMaxLevel: CONFIG_DEFAULTS.chain_max_level,
  chainInactive: CONFIG_DEFAULTS.chain_inactive,
  chainMinFF: CONFIG_DEFAULTS.chain_min_ff,
  chainMaxFF: CONFIG_DEFAULTS.chain_max_ff,
  chainFactionless: CONFIG_DEFAULTS.chain_factionless,
  ffHistoryEnabled: CONFIG_DEFAULTS.ff_history_enabled,
  factionsColDisplay: CONFIG_DEFAULTS.factions_col_display,
  warColDisplay: CONFIG_DEFAULTS.war_col_display,
  debugLogs: CONFIG_DEFAULTS.debug_logs,
  analyticsEnabled: CONFIG_DEFAULTS.analytics_enabled,
  networkInterceptionEnabled: CONFIG_DEFAULTS.network_interception_enabled,
  gaugeMarkerType: CONFIG_DEFAULTS.gauge_marker_type,
  gaugeMarkerScale: CONFIG_DEFAULTS.gauge_marker_scale,
  gaugeMarkerBorderWidth: CONFIG_DEFAULTS.gauge_marker_border_width,
  colorScheme: CONFIG_DEFAULTS.color_scheme,
  warQuickAttackAction: CONFIG_DEFAULTS.war_quick_attack_action,
  statusAttackLinksEnabled: CONFIG_DEFAULTS.status_attack_links_enabled,
  debugDisablePdaHttp: CONFIG_DEFAULTS.debug_disable_pda_http,
  debugForceReactFallback: CONFIG_DEFAULTS.debug_force_react_fallback,
  settingsPanelOwnProfileOnly: CONFIG_DEFAULTS.settings_panel_own_profile_only,
  factionFilterEnabled: CONFIG_DEFAULTS.faction_filter_enabled,
  colorEstimatesEnabled: CONFIG_DEFAULTS.color_estimates_enabled,
  colorEstimatesThreshold: CONFIG_DEFAULTS.color_estimates_threshold,
  warFilterEnabled: CONFIG_DEFAULTS.war_filter_enabled,
  isPremium: null as boolean | null,
};

type SettingsPanelComponentProps = {
  props: any;
  drafts: any;
  isPremium: boolean | null;
  rangeError: string;
  showSavedMessage: boolean;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  onApiKeyBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  onVerify: () => void;
  onSave: () => void;
  onReset: () => void;
  onClearCache: () => void;
  onRendered: () => void;
};

export function SettingsPanelComponent({
  props,
  drafts,
  isPremium,
  rangeError,
  showSavedMessage,
  onChange,
  onApiKeyBlur,
  onVerify,
  onSave,
  onReset,
  onClearCache,
  onRendered,
}: SettingsPanelComponentProps) {
  useEffect(() => {
    onRendered();
  });

  const previewColor =
    get_palette_for_scheme(drafts.colorScheme)[5] ?? "#888888";
  // Always shown as "spy" in the preview purely to demonstrate how the badge
  // scales with Marker Scale — not meant to reflect real per-target data.
  const previewSourceMarker = get_source_marker("spies");

  return (
    <details
      className={`${cls.accordion}${!props.apiKey ? ` ${cls.accordionGlow}` : ""} cont-gray border-round`}
    >
      <summary>FF Scouter Settings</summary>

      <div className={cls.body}>
        {/* API Key & Premium */}
        <div className={cls.group}>
          <h4>API Key &amp; Premium</h4>
          <div className={cls.section}>
            <div className={`${cls.apiExplanation} ${cls.span}`}>
              <strong>Important:</strong> You must use the SAME exact API key
              that you use on{" "}
              <a href="https://ffscouter.com/" target="_blank" rel="noreferrer">
                ffscouter.com
              </a>
              . <br />
              <br />
              If you're not sure which API key you used, go to{" "}
              <a
                href="https://www.torn.com/preferences.php#tab=api"
                target="_blank"
                rel="noreferrer"
              >
                your API preferences
              </a>{" "}
              and look for "FFScouter3" in your API key history comments.
            </div>

            <div className={`${cls.span} ${cls.apiBlock}`}>
              <div className={cls.cell}>
                <label htmlFor="api-key">API Key:</label>
                <input
                  id="api-key"
                  type="text"
                  className={props.apiKey ? cls.blur : ""}
                  placeholder="Paste your key here..."
                  value={drafts.apiKey}
                  onChange={onChange}
                  onBlur={onApiKeyBlur}
                />
              </div>
              <div className={cls.apiStatusRow}>
                <label htmlFor="ff-premium-badge">FF Scouter Premium:</label>
                <span
                  id="ff-premium-badge"
                  className={`${cls.premiumBadge} ${
                    isPremium === null
                      ? cls.premiumBadgeUnknown
                      : isPremium
                        ? cls.premiumBadgeEnabled
                        : cls.premiumBadgeDisabled
                  }`}
                >
                  {isPremium === null
                    ? "Unknown"
                    : isPremium
                      ? "Enabled"
                      : "Disabled"}
                </span>
                <button
                  type="button"
                  className="torn-btn btn-save"
                  onClick={onVerify}
                >
                  Verify
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Gauge Marker Settings */}
        <div className={cls.group}>
          <h4>Gauge Marker Settings</h4>
          <div className={cls.section}>
            <div className={cls.cell}>
              <label htmlFor="gauge-marker-type">Gauge Marker Style:</label>
              <select
                id="gauge-marker-type"
                value={drafts.gaugeMarkerType}
                onChange={onChange}
              >
                <option value="arrow">Arrow (Default)</option>
                <option value="bubble_ff">Bubble (FF Score)</option>
                <option value="bubble_estimate">Bubble (BS Estimate)</option>
              </select>
            </div>

            <div className={`${cls.span} ${cls.markerSize}`}>
              <label htmlFor="gauge-marker-scale">Marker Size:</label>
              <div className={cls.markerSizeControls}>
                <input
                  id="gauge-marker-scale"
                  type="range"
                  min="50"
                  max="200"
                  step="5"
                  value={drafts.gaugeMarkerScale}
                  onChange={onChange}
                />
                <input
                  id="gauge-marker-scale-number"
                  type="number"
                  min="50"
                  max="200"
                  step="5"
                  className={cls.number}
                  value={drafts.gaugeMarkerScale}
                  onChange={onChange}
                />
                <span>%</span>
              </div>
            </div>

            <div className={`${cls.span} ${cls.markerBorderWidth}`}>
              <label htmlFor="gauge-marker-border-width">
                Border Thickness:
              </label>
              <div className={cls.markerSizeControls}>
                <input
                  id="gauge-marker-border-width"
                  type="range"
                  min="0"
                  max="3"
                  step="0.5"
                  value={drafts.gaugeMarkerBorderWidth}
                  onChange={onChange}
                />
                <input
                  id="gauge-marker-border-width-number"
                  type="number"
                  min="0"
                  max="3"
                  step="0.5"
                  className={cls.number}
                  value={drafts.gaugeMarkerBorderWidth}
                  onChange={onChange}
                />
                <span>px</span>
                <div
                  className="ffscouter-marker-preview"
                  style={
                    {
                      "--ffscouter-marker-scale": drafts.gaugeMarkerScale / 100,
                    } as React.CSSProperties
                  }
                >
                  <span className="ffscouter-preview-marker-slot">
                    <svg
                      className="ffscouter-preview-arrow"
                      viewBox={FF_ARROW_VIEWBOX}
                    >
                      <title>Preview Gauge Marker</title>
                      <path
                        fillRule="evenodd"
                        fill={previewColor}
                        stroke="#000000"
                        strokeWidth={drafts.gaugeMarkerBorderWidth}
                        d={FF_ARROW_PATH_D}
                      />
                    </svg>
                    {previewSourceMarker && (
                      <SourceMarkerIcon
                        marker={previewSourceMarker}
                        className="ffscouter-source-marker"
                      />
                    )}
                  </span>
                  <span className="ffscouter-preview-marker-slot">
                    <div
                      className="ffscouter-preview-bubble"
                      style={{
                        backgroundColor: previewColor,
                        color: get_contrast_color(previewColor),
                        borderWidth: `${
                          drafts.gaugeMarkerBorderWidth *
                          (drafts.gaugeMarkerScale / 100)
                        }px`,
                      }}
                    >
                      2.34
                    </div>
                    {previewSourceMarker && (
                      <SourceMarkerIcon
                        marker={previewSourceMarker}
                        className="ffscouter-source-marker"
                      />
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className={`${cls.span} ${cls.colorScheme}`}>
              <label htmlFor="color-scheme">Color Scheme:</label>
              <div className={cls.colorSchemeControls}>
                <select
                  id="color-scheme"
                  value={drafts.colorScheme}
                  onChange={onChange}
                >
                  <option value="classic">Classic (Default)</option>
                  <option value="cool_diverging">Cool Diverging</option>
                  <option value="neon">Neon</option>
                  <option value="colorblind_safe">Colorblind-Safe</option>
                  <option value="grayscale">Grayscale</option>
                  <option value="green_yellow_red">Green-Yellow-Red</option>
                  <option value="blue_yellow_red">Blue-Yellow-Red</option>
                  <option value="plasma">Plasma</option>
                </select>
                <div className="ffscouter-swatch-row">
                  {get_palette_for_scheme(drafts.colorScheme).map((color) => (
                    <svg
                      key={color}
                      className="ffscouter-swatch"
                      viewBox={FF_ARROW_VIEWBOX}
                    >
                      <title>{color} swatch</title>
                      <path
                        fillRule="evenodd"
                        fill={color}
                        stroke="#000000"
                        strokeWidth="1.5"
                        d={FF_ARROW_PATH_D}
                      />
                    </svg>
                  ))}
                </div>
              </div>
            </div>

            <div className={`${cls.inputRow} ${cls.span}`}>
              <label htmlFor="ff-range-low">FF Ranges (Low, High, Max):</label>
              <div className={cls.rangeRow}>
                <input
                  id="ff-range-low"
                  type="number"
                  step="0.1"
                  className={cls.number}
                  value={drafts.lowRange}
                  onChange={onChange}
                />
                <span>&lt;</span>
                <input
                  id="ff-range-high"
                  type="number"
                  step="0.1"
                  className={cls.number}
                  value={drafts.highRange}
                  onChange={onChange}
                />
                <span>&lt;</span>
                <input
                  id="ff-range-max"
                  type="number"
                  step="0.1"
                  className={cls.number}
                  value={drafts.maxRange}
                  onChange={onChange}
                />
              </div>
              {rangeError && <div className={cls.errorMsg}>{rangeError}</div>}
            </div>
          </div>
        </div>

        {/* Feature Toggles */}
        <div className={cls.group}>
          <h4>Feature Toggles</h4>
          <div className={cls.section}>
            <div className={`${cls.span} ff-chain-block`}>
              <div className={`${cls.cell} ${cls.cellCheckbox}`}>
                <input
                  id="chain-button-toggle"
                  type="checkbox"
                  checked={drafts.chainButtonEnabled}
                  onChange={onChange}
                />
                <label htmlFor="chain-button-toggle">
                  Enable Chain Button (Green FF Button)
                </label>
              </div>

              {drafts.chainButtonEnabled && (
                <div className={`${cls.section} ${cls.chainSuboptions}`}>
                  <div className={`${cls.cell} ${cls.chainWide}`}>
                    <label htmlFor="chain-link-type">Chain button opens:</label>
                    <select
                      id="chain-link-type"
                      value={drafts.chainLinkType}
                      onChange={onChange}
                    >
                      <option value="attack">Attack page</option>
                      <option value="profile">Profile page</option>
                    </select>
                  </div>

                  <div className={`${cls.cell} ${cls.chainWide}`}>
                    <label htmlFor="chain-tab-type">Open in:</label>
                    <select
                      id="chain-tab-type"
                      value={drafts.chainTabType}
                      onChange={onChange}
                    >
                      <option value="newtab">New tab</option>
                      <option value="sametab">Same tab</option>
                    </select>
                  </div>

                  <div className={cls.cell}>
                    <label htmlFor="chain-min-level">Min Level:</label>
                    <input
                      id="chain-min-level"
                      type="number"
                      className={cls.number}
                      placeholder="No min"
                      value={
                        drafts.chainMinLevel === null
                          ? ""
                          : drafts.chainMinLevel
                      }
                      onChange={onChange}
                    />
                  </div>

                  <div className={cls.cell}>
                    <label htmlFor="chain-max-level">Max Level:</label>
                    <input
                      id="chain-max-level"
                      type="number"
                      className={cls.number}
                      placeholder="No max"
                      value={
                        drafts.chainMaxLevel === null
                          ? ""
                          : drafts.chainMaxLevel
                      }
                      onChange={onChange}
                    />
                  </div>

                  <div className={cls.cell}>
                    <label htmlFor="chain-min-ff">Min FF:</label>
                    <input
                      id="chain-min-ff"
                      type="number"
                      step="0.1"
                      className={cls.number}
                      placeholder="No min"
                      value={
                        drafts.chainMinFF === null ? "" : drafts.chainMinFF
                      }
                      onChange={onChange}
                    />
                  </div>

                  <div className={cls.cell}>
                    <label htmlFor="chain-max-ff">Max FF:</label>
                    <input
                      id="chain-max-ff"
                      type="number"
                      step="0.1"
                      className={cls.number}
                      placeholder="No max"
                      value={drafts.chainMaxFF}
                      onChange={onChange}
                    />
                  </div>

                  <div
                    className={`${cls.cell} ${cls.cellCheckbox} ${cls.chainWide}`}
                  >
                    <input
                      id="chain-inactive"
                      type="checkbox"
                      checked={drafts.chainInactive}
                      onChange={onChange}
                    />
                    <label htmlFor="chain-inactive">
                      Inactive Only (14+ days offline)
                    </label>
                  </div>

                  <div
                    className={`${cls.cell} ${cls.cellCheckbox} ${cls.chainWide}`}
                  >
                    <input
                      id="chain-factionless"
                      type="checkbox"
                      checked={drafts.chainFactionless}
                      onChange={onChange}
                    />
                    <label htmlFor="chain-factionless">Factionless Only</label>
                  </div>
                </div>
              )}
            </div>

            <div className={cls.cell}>
              <label htmlFor="factions-col-display">Faction Page Shows:</label>
              <select
                id="factions-col-display"
                value={drafts.factionsColDisplay}
                onChange={onChange}
              >
                <option value="fair_fight">FF Score</option>
                <option value="battle_stats">BS Estimate</option>
                <option value="none">None (Hide Column)</option>
              </select>
            </div>

            <div className={`${cls.cell} ${cls.cellCheckbox}`}>
              <input
                id="faction-filter-toggle"
                type="checkbox"
                checked={drafts.factionFilterEnabled}
                onChange={onChange}
              />
              <label htmlFor="faction-filter-toggle">
                Show faction filter box
              </label>
            </div>
			
			<div className={`${cls.cell} ${cls.cellCheckbox}`}>
              <input
                id="color-estimates-toggle"
                type="checkbox"
                checked={drafts.colorEstimatesEnabled}
                onChange={onChange}
              />
              <label htmlFor="color-estimates-toggle">
                Color estimates based on whore stat
              </label>
            </div>
			
			<div className={cls.cell}>
                    <label htmlFor="color-estimates-threshold">Whore stat % Threshold for color:</label>
                    <input
                      id="color-estimates-threshold"
                      type="number"
                      step="1"
                      className={cls.number}
                      placeholder="No max"
                      value={drafts.colorEstimatesThreshold}
                      onChange={onChange}
                    />
            </div>

            <div className={cls.cell}>
              <label htmlFor="war-col-display">War Page Shows:</label>
              <select
                id="war-col-display"
                value={drafts.warColDisplay}
                onChange={onChange}
              >
                <option value="fair_fight">FF Score</option>
                <option value="battle_stats">BS Estimate</option>
                <option value="none">None (Hide Column)</option>
              </select>
            </div>

            <div className={`${cls.cell} ${cls.cellCheckbox}`}>
              <input
                id="war-filter-toggle"
                type="checkbox"
                checked={drafts.warFilterEnabled}
                onChange={onChange}
              />
              <label htmlFor="war-filter-toggle">Show war filter box</label>
            </div>

            <div className={`${cls.cell} ${cls.cellCheckbox}`}>
              <input
                id="status-attack-links-toggle"
                type="checkbox"
                checked={drafts.statusAttackLinksEnabled}
                onChange={onChange}
              />
              <label htmlFor="status-attack-links-toggle">
                Enable online status indicator quick attack links
              </label>
            </div>

            <div className={cls.cell}>
              <label htmlFor="war-quick-attack-action">
                Quick Attack Action:
              </label>
              <select
                id="war-quick-attack-action"
                value={drafts.warQuickAttackAction}
                onChange={onChange}
              >
                <option value="new_tab">New Tab</option>
                <option value="current">Same Tab</option>
              </select>
            </div>

            <div className={`${cls.cell} ${cls.cellCheckbox}`}>
              <input
                id="ff-history-toggle"
                type="checkbox"
                checked={drafts.ffHistoryEnabled}
                onChange={onChange}
              />
              <label htmlFor="ff-history-toggle">
                Enable FF History button on profile pages
              </label>
            </div>

            <div className={`${cls.cell} ${cls.cellCheckbox}`}>
              <input
                id="settings-panel-own-profile-only-toggle"
                type="checkbox"
                checked={drafts.settingsPanelOwnProfileOnly}
                onChange={onChange}
              />
              <label htmlFor="settings-panel-own-profile-only-toggle">
                Only show FF Scouter Settings on my own profile
              </label>
            </div>

            <div className={`${cls.span} ff-deprecation-note`}>
              <span>
                War Monitor is no longer supported. Use{" "}
                <a
                  target="_blank"
                  href="https://greasyfork.org/en/scripts/529238-torn-war-stuff-enhanced"
                  rel="noreferrer"
                >
                  Torn War Stuff Enhanced
                </a>{" "}
                instead.
              </span>
            </div>
          </div>
        </div>

        {/* Debug Settings */}
        <div className={cls.group}>
          <h4>Debug Settings</h4>
          <div className={cls.section}>
            <div className={`${cls.cell} ${cls.cellCheckbox}`}>
              <input
                id="debug-logs"
                type="checkbox"
                checked={drafts.debugLogs}
                onChange={onChange}
              />
              <label htmlFor="debug-logs">Enable debug logging</label>
            </div>

            <div className={`${cls.cell} ${cls.cellCheckbox}`}>
              <input
                id="analytics-toggle"
                type="checkbox"
                checked={drafts.analyticsEnabled}
                onChange={onChange}
              />
              <label htmlFor="analytics-toggle">
                Enable local analytics logging (last 30 days)
              </label>
            </div>

            <div className={`${cls.cell} ${cls.cellCheckbox}`}>
              <input
                id="network-interception-toggle"
                type="checkbox"
                checked={drafts.networkInterceptionEnabled}
                onChange={onChange}
              />
              <label htmlFor="network-interception-toggle">
                Enable network request interception (Fetch/XHR/WS)
              </label>
            </div>

            <div className={`${cls.cell} ${cls.cellCheckbox}`}>
              <input
                id="debug-disable-pda-http"
                type="checkbox"
                checked={drafts.debugDisablePdaHttp}
                onChange={onChange}
              />
              <label htmlFor="debug-disable-pda-http">
                Disable PDA native HTTP (use GM_xmlhttpRequest instead)
              </label>
            </div>

            <div className={`${cls.cell} ${cls.cellCheckbox}`}>
              <input
                id="debug-force-react-fallback"
                type="checkbox"
                checked={drafts.debugForceReactFallback}
                onChange={onChange}
              />
              <label htmlFor="debug-force-react-fallback">
                Force React fallback (fetch/evaluate Torn's own react-dom bundle
                instead of using unsafeWindow.React/ReactDOM)
              </label>
            </div>
          </div>
        </div>

        {/* Action Buttons Area */}
        <div className={cls.actions}>
          <button type="button" className="torn-btn btn-save" onClick={onSave}>
            Save Settings
          </button>
          <button
            type="button"
            className="torn-btn btn-secondary"
            onClick={onReset}
          >
            Reset to Defaults
          </button>
          <button
            type="button"
            className="torn-btn btn-secondary"
            onClick={onClearCache}
          >
            Clear FF Cache
          </button>
          {showSavedMessage && <span className={cls.savedMsg}>✓ Saved!</span>}
        </div>
      </div>
    </details>
  );
}

export class FFSettingsPanel extends HTMLElement {
  private _props: any = { ...DEFAULT_VALUES };
  private _drafts: any = { ...DEFAULT_VALUES };
  private _rangeError = "";
  private _showSavedMessage = false;
  private _root: Root | null = null;
  private _updatePromise: Promise<void> = Promise.resolve();
  private _resolveUpdate: (() => void) | null = null;

  constructor() {
    super();
    this.resetDrafts();
  }

  connectedCallback() {
    this._root = createRoot(this);
    this.render();
  }

  disconnectedCallback() {
    this._root?.unmount();
    this._root = null;
  }

  get updateComplete(): Promise<void> {
    return this._updatePromise;
  }

  private resetDrafts() {
    this._drafts = {
      apiKey: this._props.apiKey,
      lowRange: this._props.lowRange,
      highRange: this._props.highRange,
      maxRange: this._props.maxRange,
      chainButtonEnabled: this._props.chainButtonEnabled,
      chainLinkType: this._props.chainLinkType,
      chainTabType: this._props.chainTabType,
      chainFFTarget: this._props.chainFFTarget,
      chainMinLevel: this._props.chainMinLevel,
      chainMaxLevel: this._props.chainMaxLevel,
      chainInactive: this._props.chainInactive,
      chainMinFF: this._props.chainMinFF,
      chainMaxFF: this._props.chainMaxFF,
      chainFactionless: this._props.chainFactionless,
      ffHistoryEnabled: this._props.ffHistoryEnabled,
      factionsColDisplay: this._props.factionsColDisplay,
      warColDisplay: this._props.warColDisplay,
      debugLogs: this._props.debugLogs,
      analyticsEnabled: this._props.analyticsEnabled,
      networkInterceptionEnabled: this._props.networkInterceptionEnabled,
      gaugeMarkerType: this._props.gaugeMarkerType,
      gaugeMarkerScale: this._props.gaugeMarkerScale,
      gaugeMarkerBorderWidth: this._props.gaugeMarkerBorderWidth,
      colorScheme: this._props.colorScheme,
      warQuickAttackAction: this._props.warQuickAttackAction,
      statusAttackLinksEnabled: this._props.statusAttackLinksEnabled,
      debugDisablePdaHttp: this._props.debugDisablePdaHttp,
      debugForceReactFallback: this._props.debugForceReactFallback,
      settingsPanelOwnProfileOnly: this._props.settingsPanelOwnProfileOnly,
      factionFilterEnabled: this._props.factionFilterEnabled,
	  colorEstimatesEnabled: this._props.colorEstimatesEnabled,
	  colorEstimatesThreshold: this._props.colorEstimatesThreshold,
      warFilterEnabled: this._props.warFilterEnabled,
    };
  }

  private render() {
    if (!this._root) return;

    if (!this._resolveUpdate) {
      this._updatePromise = new Promise((resolve) => {
        this._resolveUpdate = resolve;
      });
    }

    this._root.render(
      createElement(SettingsPanelComponent, {
        props: this._props,
        drafts: this._drafts,
        isPremium: this._props.isPremium,
        rangeError: this._rangeError,
        showSavedMessage: this._showSavedMessage,
        onChange: this.handleChange,
        onApiKeyBlur: this.handleApiKeyBlur,
        onVerify: () => {
          this.dispatchEvent(
            new CustomEvent("ff-verify", {
              detail: { apiKey: this._drafts.apiKey },
              bubbles: true,
              composed: true,
            }),
          );
        },
        onSave: () => {
          this.handleSave();
        },
        onReset: () => {
          if (
            confirm("Are you sure you want to reset all settings to defaults?")
          ) {
            this.dispatchEvent(
              new CustomEvent("ff-reset", {
                bubbles: true,
                composed: true,
              }),
            );
          }
        },
        onClearCache: () => {
          if (confirm("Are you sure you want to clear all FF Scouter cache?")) {
            this.dispatchEvent(
              new CustomEvent("ff-clear-cache", {
                bubbles: true,
                composed: true,
              }),
            );
          }
        },
        onRendered: () => {
          if (this._resolveUpdate) {
            this._resolveUpdate();
            this._resolveUpdate = null;
          }
        },
      }),
    );
  }

  private handleSave() {
    // Validate Ranges
    const low = this._drafts.lowRange;
    const high = this._drafts.highRange;
    const max = this._drafts.maxRange;
    if (Number.isNaN(low) || Number.isNaN(high) || Number.isNaN(max)) {
      this._rangeError = "FF ranges must be valid numbers";
      this.render();
      return;
    }
    if (low <= 0 || high <= 0 || max <= 0) {
      this._rangeError = "FF ranges must be positive numbers";
      this.render();
      return;
    }
    if (low >= high || high >= max) {
      this._rangeError =
        "FF ranges must be in ascending order: low < high < max";
      this.render();
      return;
    }
    this._rangeError = "";

    this._showSavedMessage = true;
    this.render();
    setTimeout(() => {
      this._showSavedMessage = false;
      this.render();
    }, 3000);

    this.dispatchEvent(
      new CustomEvent("ff-save", {
        detail: {
          apiKey: this._drafts.apiKey,
          lowRange: low,
          highRange: high,
          maxRange: max,
          chainButtonEnabled: this._drafts.chainButtonEnabled,
          chainLinkType: this._drafts.chainLinkType,
          chainTabType: this._drafts.chainTabType,
          chainFFTarget: this._drafts.chainFFTarget,
          chainMinLevel: this._drafts.chainMinLevel,
          chainMaxLevel: this._drafts.chainMaxLevel,
          chainInactive: this._drafts.chainInactive,
          chainMinFF: this._drafts.chainMinFF,
          chainMaxFF: this._drafts.chainMaxFF,
          chainFactionless: this._drafts.chainFactionless,
          ffHistoryEnabled: this._drafts.ffHistoryEnabled,
          factionsColDisplay: this._drafts.factionsColDisplay,
          warColDisplay: this._drafts.warColDisplay,
          debugLogs: this._drafts.debugLogs,
          analyticsEnabled: this._drafts.analyticsEnabled,
          networkInterceptionEnabled: this._drafts.networkInterceptionEnabled,
          gaugeMarkerType: this._drafts.gaugeMarkerType,
          gaugeMarkerScale: this._drafts.gaugeMarkerScale,
          gaugeMarkerBorderWidth: this._drafts.gaugeMarkerBorderWidth,
          colorScheme: this._drafts.colorScheme,
          warQuickAttackAction: this._drafts.warQuickAttackAction,
          statusAttackLinksEnabled: this._drafts.statusAttackLinksEnabled,
          debugDisablePdaHttp: this._drafts.debugDisablePdaHttp,
          debugForceReactFallback: this._drafts.debugForceReactFallback,
          settingsPanelOwnProfileOnly: this._drafts.settingsPanelOwnProfileOnly,
          factionFilterEnabled: this._drafts.factionFilterEnabled,
		  colorEstimatesEnabled: this._drafts.colorEstimatesEnabled,
		  colorEstimatesThreshold: this._drafts.colorEstimatesThreshold,
          warFilterEnabled: this._drafts.warFilterEnabled,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  // Single React onChange handler for every control. React's onChange fires on
  // each edit for text/number/range inputs (native "input" semantics) and on
  // selection for selects/checkboxes (native "change" semantics), so the input-
  // vs-change split the old native capture listeners maintained collapses into
  // one switch keyed by element id. The API key's commit-time trim/dispatch is
  // the lone exception, handled separately on blur (see handleApiKeyBlur).
  private handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const target = e.target;
    if (!target) return;

    this._showSavedMessage = false;

    const id = target.id;
    if (id === "api-key") {
      this._drafts.apiKey = target.value;
    } else if (
      id === "gauge-marker-scale" ||
      id === "gauge-marker-scale-number"
    ) {
      const raw = Number(target.value);
      if (!Number.isNaN(raw)) {
        this._drafts.gaugeMarkerScale = Math.min(200, Math.max(50, raw));
      }
    } else if (
      id === "gauge-marker-border-width" ||
      id === "gauge-marker-border-width-number"
    ) {
      const raw = Number(target.value);
      if (!Number.isNaN(raw)) {
        this._drafts.gaugeMarkerBorderWidth = Math.min(3, Math.max(0, raw));
      }
    } else if (id === "ff-range-low") {
      this._drafts.lowRange = Number(target.value);
    } else if (id === "ff-range-high") {
      this._drafts.highRange = Number(target.value);
    } else if (id === "ff-range-max") {
      this._drafts.maxRange = Number(target.value);
    } else if (id === "chain-min-level") {
      this._drafts.chainMinLevel =
        target.value === "" ? null : Number(target.value);
    } else if (id === "chain-max-level") {
      this._drafts.chainMaxLevel =
        target.value === "" ? null : Number(target.value);
    } else if (id === "chain-min-ff") {
      this._drafts.chainMinFF =
        target.value === "" ? null : Number(target.value);
    } else if (id === "chain-max-ff") {
      const num = Number(target.value);
      this._drafts.chainMaxFF = num;
      this._drafts.chainFFTarget = num;
    } else if (id === "gauge-marker-type") {
      this._drafts.gaugeMarkerType = target.value as GaugeMarkerType;
    } else if (id === "color-scheme") {
      this._drafts.colorScheme = target.value as ColorScheme;
    } else if (id === "chain-link-type") {
      this._drafts.chainLinkType = target.value as ChainLinkType;
    } else if (id === "chain-tab-type") {
      this._drafts.chainTabType = target.value as ChainTabType;
    } else if (id === "war-quick-attack-action") {
      this._drafts.warQuickAttackAction = target.value as WarQuickAttackAction;
    } else if (id === "factions-col-display") {
      this._drafts.factionsColDisplay = target.value as FactionsColDisplay;
    } else if (id === "war-col-display") {
      this._drafts.warColDisplay = target.value as FactionsColDisplay;
    } else if (id === "chain-button-toggle") {
      this._drafts.chainButtonEnabled = (target as HTMLInputElement).checked;
    } else if (id === "chain-inactive") {
      this._drafts.chainInactive = (target as HTMLInputElement).checked;
    } else if (id === "chain-factionless") {
      this._drafts.chainFactionless = (target as HTMLInputElement).checked;
    } else if (id === "status-attack-links-toggle") {
      this._drafts.statusAttackLinksEnabled = (
        target as HTMLInputElement
      ).checked;
    } else if (id === "ff-history-toggle") {
      this._drafts.ffHistoryEnabled = (target as HTMLInputElement).checked;
    } else if (id === "debug-logs") {
      this._drafts.debugLogs = (target as HTMLInputElement).checked;
    } else if (id === "analytics-toggle") {
      this._drafts.analyticsEnabled = (target as HTMLInputElement).checked;
    } else if (id === "network-interception-toggle") {
      this._drafts.networkInterceptionEnabled = (
        target as HTMLInputElement
      ).checked;
    } else if (id === "debug-disable-pda-http") {
      this._drafts.debugDisablePdaHttp = (target as HTMLInputElement).checked;
    } else if (id === "debug-force-react-fallback") {
      this._drafts.debugForceReactFallback = (
        target as HTMLInputElement
      ).checked;
    } else if (id === "settings-panel-own-profile-only-toggle") {
      this._drafts.settingsPanelOwnProfileOnly = (
        target as HTMLInputElement
      ).checked;
    } else if (id === "faction-filter-toggle") {
      this._drafts.factionFilterEnabled = (target as HTMLInputElement).checked;
    } else if (id === "color-estimates-toggle") {
      this._drafts.colorEstimatesEnabled = (target as HTMLInputElement).checked;
    } else if (id === "color-estimates-threshold") {
      this._drafts.colorEstimatesThreshold = Number(target.value);
    } else if (id === "war-filter-toggle") {
      this._drafts.warFilterEnabled = (target as HTMLInputElement).checked;
    }

    this.render();
  };

  // The API key commits when the field loses focus: trim it and notify the
  // parent so a freshly pasted key is persisted/verified without waiting for an
  // explicit Save. Keystroke-by-keystroke updates go through handleChange.
  private handleApiKeyBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    this._showSavedMessage = false;
    const val = e.target.value.trim();
    this._drafts.apiKey = val;
    this.dispatchEvent(
      new CustomEvent("ff-save-key", {
        detail: { apiKey: val },
        bubbles: true,
        composed: true,
      }),
    );
    this.render();
  };

  // getters and setters for props
  get apiKey() {
    return this._props.apiKey;
  }
  set apiKey(val) {
    this._props.apiKey = val;
    this._drafts.apiKey = val;
    this.render();
  }

  get lowRange() {
    return this._props.lowRange;
  }
  set lowRange(val) {
    this._props.lowRange = val;
    this._drafts.lowRange = val;
    this.render();
  }

  get highRange() {
    return this._props.highRange;
  }
  set highRange(val) {
    this._props.highRange = val;
    this._drafts.highRange = val;
    this.render();
  }

  get maxRange() {
    return this._props.maxRange;
  }
  set maxRange(val) {
    this._props.maxRange = val;
    this._drafts.maxRange = val;
    this.render();
  }

  get chainButtonEnabled() {
    return this._props.chainButtonEnabled;
  }
  set chainButtonEnabled(val) {
    this._props.chainButtonEnabled = val;
    this._drafts.chainButtonEnabled = val;
    this.render();
  }

  get chainLinkType() {
    return this._props.chainLinkType;
  }
  set chainLinkType(val) {
    this._props.chainLinkType = val;
    this._drafts.chainLinkType = val;
    this.render();
  }

  get chainTabType() {
    return this._props.chainTabType;
  }
  set chainTabType(val) {
    this._props.chainTabType = val;
    this._drafts.chainTabType = val;
    this.render();
  }

  get chainFFTarget() {
    return this._props.chainFFTarget;
  }
  set chainFFTarget(val) {
    this._props.chainFFTarget = val;
    this._drafts.chainFFTarget = val;
    this.render();
  }

  get chainMinLevel() {
    return this._props.chainMinLevel;
  }
  set chainMinLevel(val) {
    this._props.chainMinLevel = val;
    this._drafts.chainMinLevel = val;
    this.render();
  }

  get chainMaxLevel() {
    return this._props.chainMaxLevel;
  }
  set chainMaxLevel(val) {
    this._props.chainMaxLevel = val;
    this._drafts.chainMaxLevel = val;
    this.render();
  }

  get chainInactive() {
    return this._props.chainInactive;
  }
  set chainInactive(val) {
    this._props.chainInactive = val;
    this._drafts.chainInactive = val;
    this.render();
  }

  get chainMinFF() {
    return this._props.chainMinFF;
  }
  set chainMinFF(val) {
    this._props.chainMinFF = val;
    this._drafts.chainMinFF = val;
    this.render();
  }

  get chainMaxFF() {
    return this._props.chainMaxFF;
  }
  set chainMaxFF(val) {
    this._props.chainMaxFF = val;
    this._drafts.chainMaxFF = val;
    this.render();
  }

  get chainFactionless() {
    return this._props.chainFactionless;
  }
  set chainFactionless(val) {
    this._props.chainFactionless = val;
    this._drafts.chainFactionless = val;
    this.render();
  }

  get ffHistoryEnabled() {
    return this._props.ffHistoryEnabled;
  }
  set ffHistoryEnabled(val) {
    this._props.ffHistoryEnabled = val;
    this._drafts.ffHistoryEnabled = val;
    this.render();
  }

  get factionsColDisplay() {
    return this._props.factionsColDisplay;
  }
  set factionsColDisplay(val) {
    this._props.factionsColDisplay = val;
    this._drafts.factionsColDisplay = val;
    this.render();
  }

  get warColDisplay() {
    return this._props.warColDisplay;
  }
  set warColDisplay(val) {
    this._props.warColDisplay = val;
    this._drafts.warColDisplay = val;
    this.render();
  }

  get debugLogs() {
    return this._props.debugLogs;
  }
  set debugLogs(val) {
    this._props.debugLogs = val;
    this._drafts.debugLogs = val;
    this.render();
  }

  get analyticsEnabled() {
    return this._props.analyticsEnabled;
  }
  set analyticsEnabled(val) {
    this._props.analyticsEnabled = val;
    this._drafts.analyticsEnabled = val;
    this.render();
  }

  get networkInterceptionEnabled() {
    return this._props.networkInterceptionEnabled;
  }
  set networkInterceptionEnabled(val) {
    this._props.networkInterceptionEnabled = val;
    this._drafts.networkInterceptionEnabled = val;
    this.render();
  }

  get gaugeMarkerType() {
    return this._props.gaugeMarkerType;
  }
  set gaugeMarkerType(val) {
    this._props.gaugeMarkerType = val;
    this._drafts.gaugeMarkerType = val;
    this.render();
  }

  get gaugeMarkerScale() {
    return this._props.gaugeMarkerScale;
  }
  set gaugeMarkerScale(val) {
    this._props.gaugeMarkerScale = val;
    this._drafts.gaugeMarkerScale = val;
    this.render();
  }

  get gaugeMarkerBorderWidth() {
    return this._props.gaugeMarkerBorderWidth;
  }
  set gaugeMarkerBorderWidth(val) {
    this._props.gaugeMarkerBorderWidth = val;
    this._drafts.gaugeMarkerBorderWidth = val;
    this.render();
  }

  get colorScheme() {
    return this._props.colorScheme;
  }
  set colorScheme(val) {
    this._props.colorScheme = val;
    this._drafts.colorScheme = val;
    this.render();
  }

  get warQuickAttackAction() {
    return this._props.warQuickAttackAction;
  }
  set warQuickAttackAction(val) {
    this._props.warQuickAttackAction = val;
    this._drafts.warQuickAttackAction = val;
    this.render();
  }

  get statusAttackLinksEnabled() {
    return this._props.statusAttackLinksEnabled;
  }
  set statusAttackLinksEnabled(val) {
    this._props.statusAttackLinksEnabled = val;
    this._drafts.statusAttackLinksEnabled = val;
    this.render();
  }

  get settingsPanelOwnProfileOnly() {
    return this._props.settingsPanelOwnProfileOnly;
  }
  set settingsPanelOwnProfileOnly(val) {
    this._props.settingsPanelOwnProfileOnly = val;
    this._drafts.settingsPanelOwnProfileOnly = val;
    this.render();
  }

  get factionFilterEnabled() {
    return this._props.factionFilterEnabled;
  }
  set factionFilterEnabled(val) {
    this._props.factionFilterEnabled = val;
    this._drafts.factionFilterEnabled = val;
    this.render();
  }
  
  get colorEstimatesEnabled() {
    return this._props.colorEstimatesEnabled;
  }
  set colorEstimatesEnabled(val) {
    this._props.colorEstimatesEnabled = val;
    this._drafts.colorEstimatesEnabled = val;
    this.render();
  }
  
  get colorEstimatesThreshold() {
    return this._props.colorEstimatesThreshold;
  }
  set colorEstimatesThreshold(val) {
    this._props.colorEstimatesThreshold = val;
    this._drafts.colorEstimatesThreshold = val;
    this.render();
  }

  get warFilterEnabled() {
    return this._props.warFilterEnabled;
  }
  set warFilterEnabled(val) {
    this._props.warFilterEnabled = val;
    this._drafts.warFilterEnabled = val;
    this.render();
  }

  get debugDisablePdaHttp() {
    return this._props.debugDisablePdaHttp;
  }
  set debugDisablePdaHttp(val) {
    this._props.debugDisablePdaHttp = val;
    this._drafts.debugDisablePdaHttp = val;
    this.render();
  }

  get debugForceReactFallback() {
    return this._props.debugForceReactFallback;
  }
  set debugForceReactFallback(val) {
    this._props.debugForceReactFallback = val;
    this._drafts.debugForceReactFallback = val;
    this.render();
  }

  get isPremium() {
    return this._props.isPremium;
  }
  set isPremium(val) {
    this._props.isPremium = val;
    this.render();
  }

  // getters and setters for drafts
  get draftApiKey() {
    return this._drafts.apiKey;
  }
  set draftApiKey(val) {
    this._drafts.apiKey = val;
    this.render();
  }

  get draftLowRange() {
    return this._drafts.lowRange;
  }
  set draftLowRange(val) {
    this._drafts.lowRange = val;
    this.render();
  }

  get draftHighRange() {
    return this._drafts.highRange;
  }
  set draftHighRange(val) {
    this._drafts.highRange = val;
    this.render();
  }

  get draftMaxRange() {
    return this._drafts.maxRange;
  }
  set draftMaxRange(val) {
    this._drafts.maxRange = val;
    this.render();
  }

  get draftChainButtonEnabled() {
    return this._drafts.chainButtonEnabled;
  }
  set draftChainButtonEnabled(val) {
    this._drafts.chainButtonEnabled = val;
    this.render();
  }

  get draftChainLinkType() {
    return this._drafts.chainLinkType;
  }
  set draftChainLinkType(val) {
    this._drafts.chainLinkType = val;
    this.render();
  }

  get draftChainTabType() {
    return this._drafts.chainTabType;
  }
  set draftChainTabType(val) {
    this._drafts.chainTabType = val;
    this.render();
  }

  get draftChainFFTarget() {
    return this._drafts.chainFFTarget;
  }
  set draftChainFFTarget(val) {
    this._drafts.chainFFTarget = val;
    this.render();
  }

  get draftChainMinLevel() {
    return this._drafts.chainMinLevel;
  }
  set draftChainMinLevel(val) {
    this._drafts.chainMinLevel = val;
    this.render();
  }

  get draftChainMaxLevel() {
    return this._drafts.chainMaxLevel;
  }
  set draftChainMaxLevel(val) {
    this._drafts.chainMaxLevel = val;
    this.render();
  }

  get draftChainInactive() {
    return this._drafts.chainInactive;
  }
  set draftChainInactive(val) {
    this._drafts.chainInactive = val;
    this.render();
  }

  get draftChainMinFF() {
    return this._drafts.chainMinFF;
  }
  set draftChainMinFF(val) {
    this._drafts.chainMinFF = val;
    this.render();
  }

  get draftChainMaxFF() {
    return this._drafts.chainMaxFF;
  }
  set draftChainMaxFF(val) {
    this._drafts.chainMaxFF = val;
    this.render();
  }

  get draftChainFactionless() {
    return this._drafts.chainFactionless;
  }
  set draftChainFactionless(val) {
    this._drafts.chainFactionless = val;
    this.render();
  }

  get draftFFHistoryEnabled() {
    return this._drafts.ffHistoryEnabled;
  }
  set draftFFHistoryEnabled(val) {
    this._drafts.ffHistoryEnabled = val;
    this.render();
  }

  get draftFactionsColDisplay() {
    return this._drafts.factionsColDisplay;
  }
  set draftFactionsColDisplay(val) {
    this._drafts.factionsColDisplay = val;
    this.render();
  }

  get draftWarColDisplay() {
    return this._drafts.warColDisplay;
  }
  set draftWarColDisplay(val) {
    this._drafts.warColDisplay = val;
    this.render();
  }

  get draftDebugLogs() {
    return this._drafts.debugLogs;
  }
  set draftDebugLogs(val) {
    this._drafts.debugLogs = val;
    this.render();
  }

  get draftAnalyticsEnabled() {
    return this._drafts.analyticsEnabled;
  }
  set draftAnalyticsEnabled(val) {
    this._drafts.analyticsEnabled = val;
    this.render();
  }

  get draftNetworkInterceptionEnabled() {
    return this._drafts.networkInterceptionEnabled;
  }
  set draftNetworkInterceptionEnabled(val) {
    this._drafts.networkInterceptionEnabled = val;
    this.render();
  }

  get draftGaugeMarkerType() {
    return this._drafts.gaugeMarkerType;
  }
  set draftGaugeMarkerType(val) {
    this._drafts.gaugeMarkerType = val;
    this.render();
  }

  get draftGaugeMarkerScale() {
    return this._drafts.gaugeMarkerScale;
  }
  set draftGaugeMarkerScale(val) {
    this._drafts.gaugeMarkerScale = val;
    this.render();
  }

  get draftGaugeMarkerBorderWidth() {
    return this._drafts.gaugeMarkerBorderWidth;
  }
  set draftGaugeMarkerBorderWidth(val) {
    this._drafts.gaugeMarkerBorderWidth = val;
    this.render();
  }

  get draftColorScheme() {
    return this._drafts.colorScheme;
  }
  set draftColorScheme(val) {
    this._drafts.colorScheme = val;
    this.render();
  }

  get draftWarQuickAttackAction() {
    return this._drafts.warQuickAttackAction;
  }
  set draftWarQuickAttackAction(val) {
    this._drafts.warQuickAttackAction = val;
    this.render();
  }

  get draftStatusAttackLinksEnabled() {
    return this._drafts.statusAttackLinksEnabled;
  }
  set draftStatusAttackLinksEnabled(val) {
    this._drafts.statusAttackLinksEnabled = val;
    this.render();
  }

  get draftDebugDisablePdaHttp() {
    return this._drafts.debugDisablePdaHttp;
  }
  set draftDebugDisablePdaHttp(val) {
    this._drafts.debugDisablePdaHttp = val;
    this.render();
  }

  get draftDebugForceReactFallback() {
    return this._drafts.debugForceReactFallback;
  }
  set draftDebugForceReactFallback(val) {
    this._drafts.debugForceReactFallback = val;
    this.render();
  }

  get draftSettingsPanelOwnProfileOnly() {
    return this._drafts.settingsPanelOwnProfileOnly;
  }
  set draftSettingsPanelOwnProfileOnly(val) {
    this._drafts.settingsPanelOwnProfileOnly = val;
    this.render();
  }

  get draftFactionFilterEnabled() {
    return this._drafts.factionFilterEnabled;
  }
  set draftFactionFilterEnabled(val) {
    this._drafts.factionFilterEnabled = val;
    this.render();
  }
  
  get draftColorEstimatesEnabled() {
    return this._drafts.colorEstimatesEnabled;
  }
  set draftColorEstimatesEnabled(val) {
    this._drafts.colorEstimatesEnabled = val;
    this.render();
  }
  
  get draftColorEstimatesThreshold() {
    return this._drafts.colorEstimatesThreshold;
  }
  set draftColorEstimatesThreshold(val) {
    this._drafts.colorEstimatesThreshold = val;
    this.render();
  }

  get draftWarFilterEnabled() {
    return this._drafts.warFilterEnabled;
  }
  set draftWarFilterEnabled(val) {
    this._drafts.warFilterEnabled = val;
    this.render();
  }
}

// Guard against redefinition: the script's module graph can be evaluated more
// than once in the same document (duplicate injection into multiple isolated
// realms, or environments like Torn PDA that inject directly into page
// context with no per-injection realm isolation at all), and
// customElements.define throws NotSupportedError on a second registration.
if (!customElements.get("ff-settings-panel")) {
  customElements.define("ff-settings-panel", FFSettingsPanel);
}

declare global {
  interface HTMLElementTagNameMap {
    "ff-settings-panel": FFSettingsPanel;
  }
}
