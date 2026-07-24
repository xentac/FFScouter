// ==UserScript==
// @name         FF Scouter V2 beta
// @namespace    xentac-beta
// @version      3.2-beta1
// @author       xentac [3354782], MAVRI [2402357], rDacted [2670953], Weav3r [1853324], Glasnost [1844049]
// @description  Shows the expected Fair Fight score against targets and faction war status
// @license      GPLv3
// @copyright    2026, xentac
// @match        https://www.torn.com/*
// @require      https://www.torn.com/builds/react-umd/react-dom.19.2.0.93c06d8e.production.js
// @connect      ffscouter.com
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const n=new Set;const importCSS = async e=>{n.has(e)||(n.add(e),(d=>{const t=document.createElement("style");t.textContent=d,(document.head||document.documentElement).appendChild(t);})(e));};

  importCSS(" ._ffscouter-info-line__label_xi5zk_1{font-weight:700;margin-right:6px}._ffscouter-info-line__badge_xi5zk_8{font-weight:700;padding:2px 6px;border-radius:4px;display:inline-block}._ffscouter-info-line__premium-upgrade_xi5zk_15{display:block;margin-top:4px;line-height:1.3;white-space:nowrap;font-size:12px;font-style:normal}@media(max-width:768px){._ffscouter-info-line__premium-upgrade_xi5zk_15{margin-top:6px;line-height:1.35;white-space:normal;overflow-wrap:anywhere}}._ff-filter-box_ursux_1,._ff-filter-box_ursux_1 *,._ff-filter-box_ursux_1 *:before,._ff-filter-box_ursux_1 *:after{box-sizing:border-box!important}._ff-filter-box_ursux_1{background-color:var(--ffscouter-bg-color);border:1px solid var(--ffscouter-border-color);border-radius:8px;padding:12px 16px;margin-bottom:16px;color:var(--ffscouter-text-color);font-family:Arial,sans-serif;box-shadow:0 2px 5px #0000000d}._ff-filter-box_ursux_1._ff-filter-box--no-borders_ursux_19{background-color:var(--default-bg-panel-color);border-top:1px solid var(--ffscouter-border-color);border-bottom:1px solid var(--ffscouter-border-color);border-left:none;border-right:none;border-radius:0;box-shadow:none;padding:12px 10px;margin:0}._ff-filter-box_ursux_1 summary{cursor:pointer;font-size:14px;font-weight:700;outline:none;-webkit-user-select:none;user-select:none}._ff-filter-box_ursux_1[open] summary{border-bottom:1px solid var(--ffscouter-border-color);padding-bottom:6px;margin-bottom:12px}._ff-filter-box_ursux_1 summary:focus-visible{outline:2px solid var(--ffscouter-glow-color);outline-offset:2px}._ff-filter-box__header_ursux_52{display:inline-flex;justify-content:space-between;align-items:center;width:calc(100% - 24px);vertical-align:middle}._ff-filter-box__header-actions_ursux_60{display:flex;gap:6px;align-items:center}._ff-filter-box_ursux_1 ._ff-filter-box__action-btn_ursux_66{background:var(--ffscouter-alt-bg-color);border:1px solid var(--ffscouter-border-color);border-radius:4px;color:var(--ffscouter-text-color);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;transition:background-color .2s,color .2s,opacity .2s}._ff-filter-box_ursux_1 ._ff-filter-box__action-btn_ursux_66:hover{background-color:var(--ffscouter-hover-color)}._ff-filter-box_ursux_1 ._ff-filter-box__action-btn_ursux_66._ff-filter-box__action-btn--active_ursux_88{color:var(--ffscouter-text-color);opacity:1}._ff-filter-box_ursux_1 ._ff-filter-box__action-btn_ursux_66._ff-filter-box__action-btn--inactive_ursux_93{color:var(--ffscouter-text-color);opacity:.4}._ff-filter-box_ursux_1 ._ff-filter-box__action-btn_ursux_66 svg{width:14px;height:14px;fill:currentColor}._ff-filter-box_ursux_1 ._ff-filter-box__action-btn_ursux_66._ff-filter-box__action-btn--reset_ursux_104 svg{transition:transform .25s ease-in-out}._ff-filter-box_ursux_1 ._ff-filter-box__action-btn_ursux_66._ff-filter-box__action-btn--reset_ursux_104:hover svg{transform:rotate(-180deg)}._ff-filter-box__grid_ursux_114{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:12px}._ff-filter-box__group--sort_ursux_121{order:1}._ff-filter-box__group--level_ursux_125{order:2}._ff-filter-box__group--activity_ursux_129{order:3}._ff-filter-box__group--status_ursux_133{order:4}._ff-filter-box__group--ff_ursux_137{order:5}._ff-filter-box__group--stats_ursux_141{order:6}._ff-filter-box__group--last-action_ursux_145{order:7}._ff-filter-box__group--columns_ursux_149{order:8}@media(min-width:784px){._ff-filter-box__grid_ursux_114{grid-template-columns:repeat(3,1fr)}._ff-filter-box__grid_ursux_114>*{order:0}}._ff-filter-box__group_ursux_121{display:flex;flex-direction:column;gap:2px}._ff-filter-box__sort-controls_ursux_171{display:flex;flex-direction:column;gap:8px}._ff-filter-box__sort-controls_ursux_171 ._ff-filter-box__sort-btn_ursux_177{width:100%}._ff-filter-box__sort-controls_ursux_171 ._ff-filter-box__compare-btn_ursux_181{width:100%;height:32px}._ff-filter-box__display-select_ursux_186{padding:4px;border:1px solid var(--ffscouter-border-color);border-radius:4px;background:var(--ffscouter-alt-bg-color);color:var(--ffscouter-text-color);font-size:11px;cursor:pointer;height:32px}._ff-filter-box__options_ursux_197{display:flex;flex-direction:column}._ff-filter-box__options_ursux_197 label{display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer}._ff-filter-box__range-inputs_ursux_210{display:flex;align-items:center;gap:4px}._ff-filter-box__range-inputs_ursux_210 input{flex:1;width:0;min-width:30px;max-width:80px;padding:4px;border:1px solid var(--ffscouter-border-color);border-radius:4px;background:var(--ffscouter-alt-bg-color);color:var(--ffscouter-text-color);font-size:11px;text-align:center}._ff-filter-box_ursux_1 button{padding:6px 10px;border:1px solid var(--ffscouter-border-color);border-radius:4px;background:var(--ffscouter-alt-bg-color);color:var(--ffscouter-text-color);font-size:12px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;transition:background-color .2s}._ff-filter-box_ursux_1 button:hover{background-color:var(--ffscouter-hover-color)}._ff-settings-panel__accordion_6bhvd_1{margin:10px 0;padding:15px;background-color:var(--ffscouter-bg-color);border:1px solid var(--ffscouter-border-color);border-radius:5px;color:var(--ffscouter-text-color)}._ff-settings-panel__accordion_6bhvd_1._ff-settings-panel__accordion--glow_6bhvd_10{border-color:var(--ffscouter-glow-color);box-shadow:0 0 8px #4caf5080}._ff-settings-panel__accordion_6bhvd_1 summary{cursor:pointer;font-weight:700}._ff-settings-panel__body_6bhvd_20{margin-top:15px}._ff-settings-panel__input-row_6bhvd_24{display:flex;flex-direction:column;gap:5px;margin-bottom:15px}._ff-settings-panel__range-row_6bhvd_32{display:flex;gap:10px;align-items:center}._ff-settings-panel__blur_6bhvd_38{filter:blur(4px);transition:filter .2s ease}._ff-settings-panel__blur_6bhvd_38:hover,._ff-settings-panel__blur_6bhvd_38:focus{filter:blur(0)}._ff-settings-panel__error-msg_6bhvd_48{color:#f33;font-size:13px;margin-top:5px}._ff-settings-panel__accordion_6bhvd_1 input[type=text],._ff-settings-panel__accordion_6bhvd_1 input[type=number]{box-sizing:border-box!important;text-align:left;vertical-align:top;width:178px;height:34px!important;margin-right:8px;padding:9px 10px;line-height:14px;display:inline-block}._ff-settings-panel__accordion_6bhvd_1 input[type=number]._ff-settings-panel__number_6bhvd_67{width:80px}._ff-settings-panel__accordion_6bhvd_1 select{box-sizing:border-box;text-align:left;vertical-align:top;width:178px;height:34px;margin-right:8px;padding:8px 10px;line-height:14px;display:inline-block;border:var(--input-border-color, 1px solid var(--ffscouter-border-color));border-radius:5px;font-family:Arial,serif;color:var(--input-color, var(--ffscouter-text-color));background:var(--input-background-color, var(--ffscouter-alt-bg-color))}.dark-mode ._ff-settings-panel__accordion_6bhvd_1 select option{background-color:#000;color:var(--input-color)}._ff-settings-panel__api-explanation_6bhvd_94{color:var(--ffscouter-text-color);margin-bottom:20px;font-size:13px;line-height:1.5}._ff-settings-panel__accordion_6bhvd_1 a{color:var(--ffscouter-success-color);text-decoration:underline}._ff-settings-panel__premium-badge_6bhvd_107{display:inline-block;color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;vertical-align:middle}._ff-settings-panel__premium-badge--enabled_6bhvd_117{background:#4caf50}._ff-settings-panel__premium-badge--disabled_6bhvd_121{background:#c62828}._ff-settings-panel__premium-badge--unknown_6bhvd_125{background:#f39c12}._ff-settings-panel__section_6bhvd_138{display:grid;grid-template-columns:1fr;gap:12px;margin-bottom:15px}@media(min-width:784px){._ff-settings-panel__section_6bhvd_138{grid-template-columns:repeat(3,1fr)}}._ff-settings-panel__span_6bhvd_152{grid-column:1 / -1;margin-bottom:0}._ff-settings-panel__cell_6bhvd_160{display:flex;flex-direction:column;gap:5px;min-width:0;margin-bottom:0}._ff-settings-panel__cell_6bhvd_160._ff-settings-panel__cell--checkbox_6bhvd_169{flex-direction:row;align-items:flex-start;gap:10px}._ff-settings-panel__cell_6bhvd_160 input[type=text]{width:100%;margin-right:0}._ff-settings-panel__cell_6bhvd_160 select{width:auto;max-width:100%;margin-right:0}._ff-settings-panel__api-block_6bhvd_193{display:flex;flex-direction:column;gap:10px}._ff-settings-panel__api-block_6bhvd_193 ._ff-settings-panel__cell_6bhvd_160 input[type=text]{max-width:360px}._ff-settings-panel__api-status-row_6bhvd_203{display:flex;flex-wrap:wrap;align-items:center;gap:10px}._ff-settings-panel__chain-suboptions_6bhvd_213{border-left:2px solid var(--ffscouter-border-color);padding-left:8px;margin-top:10px;grid-template-columns:repeat(2,1fr)}._ff-settings-panel__chain-suboptions_6bhvd_213 ._ff-settings-panel__chain-wide_6bhvd_218{grid-column:1 / -1}@media(min-width:784px){._ff-settings-panel__chain-suboptions_6bhvd_213{padding-left:16px;grid-template-columns:repeat(3,1fr)}._ff-settings-panel__chain-suboptions_6bhvd_213 ._ff-settings-panel__chain-wide_6bhvd_218{grid-column:auto}}._ff-settings-panel__group_6bhvd_242{background-color:var(--ffscouter-alt-bg-color);border:1px solid var(--ffscouter-border-color);border-radius:5px;padding:12px;margin-bottom:15px}._ff-settings-panel__group_6bhvd_242 h4{margin:0 0 12px}._ff-settings-panel__marker-size_6bhvd_256,._ff-settings-panel__marker-border-width_6bhvd_257{display:flex;flex-direction:column;gap:5px}._ff-settings-panel__marker-size-controls_6bhvd_263{display:flex;flex-wrap:wrap;align-items:center;gap:10px}._ff-settings-panel__marker-size-controls_6bhvd_263 input[type=range]{flex:1 1 120px;min-width:120px}._ff-settings-panel__color-scheme_6bhvd_276{display:flex;flex-direction:column;gap:5px}._ff-settings-panel__color-scheme-controls_6bhvd_282{display:flex;flex-wrap:wrap;align-items:center;gap:10px}._ff-settings-panel__accordion_6bhvd_1 .ffscouter-swatch-row{flex-wrap:wrap}._ff-settings-panel__actions_6bhvd_295{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px;margin-top:20px}._ff-settings-panel__saved-msg_6bhvd_304{color:#4caf50} ");

  var StartTime = ((StartTime2) => {
    StartTime2[StartTime2["DocumentStart"] = 0] = "DocumentStart";
    StartTime2[StartTime2["DocumentBody"] = 1] = "DocumentBody";
    StartTime2[StartTime2["DocumentEnd"] = 2] = "DocumentEnd";
    return StartTime2;
  })(StartTime || {});
  function isInPDA() {
    return typeof window !== "undefined" && typeof window.PDA_httpGet === "function";
  }
  var LogLevel = ((LogLevel2) => {
    LogLevel2[LogLevel2["DEBUG"] = 0] = "DEBUG";
    LogLevel2[LogLevel2["INFO"] = 1] = "INFO";
    LogLevel2[LogLevel2["WARN"] = 2] = "WARN";
    LogLevel2[LogLevel2["ERROR"] = 3] = "ERROR";
    LogLevel2[LogLevel2["NONE"] = 4] = "NONE";
    return LogLevel2;
  })(LogLevel || {});
  class Logger {
constructor(prefix = "", defaultLevel = 1, state = {}) {
      this.isPDA = false;
      this.colors = {
        debug: "#7f8c8d",
        info: "#3498db",
        warn: "#f39c12",
        error: "#e74c3c"
      };
      this.prefix = prefix;
      this.defaultLevel = defaultLevel;
      this.state = state;
      this.detectPDA();
    }
    detectPDA() {
      this.isPDA = isInPDA();
    }
setLevel(level) {
      this.state.explicitLevel = level;
    }
getLevel() {
      return this.state.explicitLevel !== void 0 ? this.state.explicitLevel : this.defaultLevel;
    }
debug(...args) {
      if (this.getLevel() <= 0) {
        if (this.isPDA) {
          console.log(`${this.formatPrefix("DEBUG")}`, ...this.formatArgs(args));
        } else {
          console.log(
            `%c${this.formatPrefix("DEBUG")}`,
            `color: ${this.colors.debug}; font-weight: bold`,
            ...args
          );
        }
      }
    }
info(...args) {
      if (this.getLevel() <= 1) {
        if (this.isPDA) {
          console.info(`${this.formatPrefix("INFO")}`, ...this.formatArgs(args));
        } else {
          console.info(
            `%c${this.formatPrefix("INFO")}`,
            `color: ${this.colors.info}; font-weight: bold`,
            ...args
          );
        }
      }
    }
warn(...args) {
      if (this.getLevel() <= 2) {
        if (this.isPDA) {
          console.warn(`${this.formatPrefix("WARN")}`, ...this.formatArgs(args));
        } else {
          console.warn(
            `%c${this.formatPrefix("WARN")}`,
            `color: ${this.colors.warn}; font-weight: bold`,
            ...args
          );
        }
      }
    }
error(...args) {
      if (this.getLevel() <= 3) {
        if (this.isPDA) {
          console.error(
            `${this.formatPrefix("ERROR")}`,
            ...this.formatArgs(args)
          );
        } else {
          console.error(
            `%c${this.formatPrefix("ERROR")}`,
            `color: ${this.colors.error}; font-weight: bold`,
            ...args
          );
        }
      }
    }
group(label, collapsed = false) {
      if (this.getLevel() < 4) {
        if (collapsed) {
          console.groupCollapsed(this.formatPrefix(""), label);
        } else {
          console.group(this.formatPrefix(""), label);
        }
      }
    }
groupEnd() {
      if (this.getLevel() < 4) {
        console.groupEnd();
      }
    }
child(subPrefix) {
      const childPrefix = this.prefix ? `${this.prefix}:${subPrefix}` : subPrefix;
      return new Logger(childPrefix, this.defaultLevel, this.state);
    }
formatPrefix(level) {
      const prefix = this.prefix ? `[${this.prefix}]` : "";
      return level ? `${prefix} - [${level}]: ` : `${prefix}: `;
    }
formatArgs(args) {
      return args.map((arg) => {
        if (isDOMNode(arg)) {
          return formatDOMNode(arg);
        }
        if (typeof arg === "object" && arg !== null) {
          try {
            const seen = new WeakSet();
            return JSON.stringify(
              arg,
              (_key, val) => {
                if (typeof val === "object" && val !== null) {
                  if (seen.has(val)) {
                    return "[Circular]";
                  }
                  seen.add(val);
                }
                if (isDOMNode(val)) {
                  return formatDOMNode(val);
                }
                if (val instanceof Error) {
                  return {
                    message: val.message,
                    stack: val.stack,
                    name: val.name
                  };
                }
                return val;
              },
              2
            );
          } catch {
            return String(arg);
          }
        }
        return arg;
      });
    }
  }
  function isDOMNode(val) {
    return typeof val === "object" && val !== null && "nodeType" in val && typeof val.nodeType === "number" && "nodeName" in val && typeof val.nodeName === "string";
  }
  function formatDOMNode(node) {
    if (node.nodeType === 1) {
      const tagName = node.tagName.toLowerCase();
      const id = node.id ? `#${node.id}` : "";
      const classes = node.className && typeof node.className === "string" && node.className.trim() ? `.${node.className.trim().split(/\s+/).join(".")}` : "";
      return `<${tagName}${id}${classes}>`;
    }
    return `[Node: ${node.nodeName}]`;
  }
  const logger = new Logger(
    "FFSV2",
    0
);
  const log$i = logger.child("storage");
  var Time = ((Time2) => {
    Time2[Time2["Seconds"] = 1e3] = "Seconds";
    Time2[Time2["Minutes"] = 6e4] = "Minutes";
    Time2[Time2["Hours"] = 36e5] = "Hours";
    Time2[Time2["Days"] = 864e5] = "Days";
    Time2[Time2["Weeks"] = 6048e5] = "Weeks";
    Time2[Time2["Years"] = 31536e6] = "Years";
    return Time2;
  })(Time || {});
  class Storage {
constructor(prefix) {
      this.prefix = prefix;
    }
set(key, value, expireConfig) {
      try {
        const item = {
          value,
          expiration: expireConfig ? Date.now() + expireConfig.amount * (expireConfig.unit || 6e4) : null
        };
        localStorage.setItem(this.prefix + key, JSON.stringify(item));
      } catch (error) {
        log$i.error(`Error storing item '${key}':`, error);
      }
    }
get(key) {
      try {
        const itemStr = localStorage.getItem(this.prefix + key);
        if (!itemStr) {
          return null;
        }
        let item = null;
        try {
          item = JSON.parse(itemStr);
        } catch {
          item = null;
        }
        if (!item) {
          log$i.warn(`Key '${key}' has invalid JSON in it.`);
          this.remove(key);
          return null;
        }
        if (item.expiration && Date.now() > item.expiration) {
          this.remove(key);
          log$i.debug(`Key ${key} has expired.`);
          return null;
        }
        return item.value;
      } catch (error) {
        log$i.error(`Error retrieving item '${key}':`, error);
        return null;
      }
    }
remove(key) {
      try {
        localStorage.removeItem(this.prefix + key);
      } catch (error) {
        log$i.error(`Error removing item [${key}]:`, error);
      }
    }
has(key) {
      return this.get(key) !== null;
    }
clearAll() {
      try {
        Object.keys(localStorage).filter((key) => key.startsWith(this.prefix)).forEach((key) => {
          localStorage.removeItem(key);
        });
      } catch (error) {
        log$i.error("Error clearing storage:", error);
      }
    }
  }
  var FactionsColDisplay = ((FactionsColDisplay2) => {
    FactionsColDisplay2["FAIR_FIGHT"] = "fair_fight";
    FactionsColDisplay2["BATTLE_STATS"] = "battle_stats";
    FactionsColDisplay2["NONE"] = "none";
    return FactionsColDisplay2;
  })(FactionsColDisplay || {});
  var GaugeMarkerType = ((GaugeMarkerType2) => {
    GaugeMarkerType2["ARROW"] = "arrow";
    GaugeMarkerType2["BUBBLE_FF"] = "bubble_ff";
    GaugeMarkerType2["BUBBLE_ESTIMATE"] = "bubble_estimate";
    return GaugeMarkerType2;
  })(GaugeMarkerType || {});
  var ColorScheme = ((ColorScheme2) => {
    ColorScheme2["CLASSIC"] = "classic";
    ColorScheme2["COOL_DIVERGING"] = "cool_diverging";
    ColorScheme2["NEON"] = "neon";
    ColorScheme2["COLORBLIND_SAFE"] = "colorblind_safe";
    ColorScheme2["GRAYSCALE"] = "grayscale";
    ColorScheme2["GREEN_YELLOW_RED"] = "green_yellow_red";
    ColorScheme2["BLUE_YELLOW_RED"] = "blue_yellow_red";
    ColorScheme2["PLASMA"] = "plasma";
    ColorScheme2["CUSTOM"] = "custom";
    return ColorScheme2;
  })(ColorScheme || {});
  const CONFIG_DEFAULTS = {
    low_ff_range: 2,
    high_ff_range: 4,
    max_ff_range: 8,
    chain_button_enabled: true,
    chain_link_type: "attack",
    chain_tab_type: "newtab",
    chain_ff_target: 2.5,
    ff_history_enabled: true,
    factions_col_display: "battle_stats",
    war_col_display: "battle_stats",
    debug_logs: false,
    analytics_enabled: false,
    chain_min_level: null,
    chain_max_level: null,
    chain_inactive: true,
    chain_min_ff: null,
    chain_max_ff: 2.5,
    chain_factionless: false,
    gauge_marker_type: "arrow",
    gauge_marker_scale: 100,
    gauge_marker_border_width: 1,
    war_quick_attack_action: "new_tab",
    network_interception_enabled: false,
    status_attack_links_enabled: true,
    debug_disable_pda_http: false,
    debug_force_react_fallback: false,
    color_scheme: "classic",
    custom_colors: null,
    settings_panel_own_profile_only: false,
    faction_filter_enabled: true,
    war_filter_enabled: true
  };
  class FFConfig {
    constructor(name) {
      this.name = name;
      this.storage = new Storage(this.name);
      logger.setLevel(this.debug_logs ? LogLevel.DEBUG : LogLevel.INFO);
    }
    get key() {
      return this.storage.get(
        "key"
) ?? "";
    }
    set key(key) {
      this.storage.set("key", key);
    }
    get low_ff_range() {
      return this.storage.get(
        "low_ff_range"
) ?? CONFIG_DEFAULTS.low_ff_range;
    }
    set low_ff_range(val) {
      this.storage.set("low_ff_range", val);
    }
    get high_ff_range() {
      return this.storage.get(
        "high_ff_range"
) ?? CONFIG_DEFAULTS.high_ff_range;
    }
    set high_ff_range(val) {
      this.storage.set("high_ff_range", val);
    }
    get max_ff_range() {
      return this.storage.get(
        "max_ff_range"
) ?? CONFIG_DEFAULTS.max_ff_range;
    }
    set max_ff_range(val) {
      this.storage.set("max_ff_range", val);
    }
    get chain_button_enabled() {
      return this.storage.get(
        "chain_button_enabled"
) ?? CONFIG_DEFAULTS.chain_button_enabled;
    }
    set chain_button_enabled(val) {
      this.storage.set("chain_button_enabled", val);
    }
    get chain_link_type() {
      return this.storage.get(
        "chain_link_type"
) ?? CONFIG_DEFAULTS.chain_link_type;
    }
    set chain_link_type(val) {
      this.storage.set("chain_link_type", val);
    }
    get chain_tab_type() {
      return this.storage.get(
        "chain_tab_type"
) ?? CONFIG_DEFAULTS.chain_tab_type;
    }
    set chain_tab_type(val) {
      this.storage.set("chain_tab_type", val);
    }
    get war_quick_attack_action() {
      return this.storage.get(
        "war_quick_attack_action"
) ?? CONFIG_DEFAULTS.war_quick_attack_action;
    }
    set war_quick_attack_action(val) {
      this.storage.set("war_quick_attack_action", val);
    }
    get chain_ff_target() {
      return this.storage.get(
        "chain_ff_target"
) ?? CONFIG_DEFAULTS.chain_ff_target;
    }
    set chain_ff_target(val) {
      this.storage.set("chain_ff_target", val);
    }
    get chain_min_level() {
      return this.storage.get(
        "chain_min_level"
) ?? CONFIG_DEFAULTS.chain_min_level;
    }
    set chain_min_level(val) {
      if (val === null) {
        this.storage.remove(
          "chain_min_level"
);
      } else {
        this.storage.set("chain_min_level", val);
      }
    }
    get chain_max_level() {
      return this.storage.get(
        "chain_max_level"
) ?? CONFIG_DEFAULTS.chain_max_level;
    }
    set chain_max_level(val) {
      if (val === null) {
        this.storage.remove(
          "chain_max_level"
);
      } else {
        this.storage.set("chain_max_level", val);
      }
    }
    get chain_inactive() {
      return this.storage.get(
        "chain_inactive"
) ?? CONFIG_DEFAULTS.chain_inactive;
    }
    set chain_inactive(val) {
      this.storage.set("chain_inactive", val);
    }
    get chain_min_ff() {
      return this.storage.get(
        "chain_min_ff"
) ?? CONFIG_DEFAULTS.chain_min_ff;
    }
    set chain_min_ff(val) {
      if (val === null) {
        this.storage.remove(
          "chain_min_ff"
);
      } else {
        this.storage.set("chain_min_ff", val);
      }
    }
    get chain_max_ff() {
      return this.storage.get(
        "chain_max_ff"
) ?? this.storage.get(
        "chain_ff_target"
) ?? CONFIG_DEFAULTS.chain_max_ff;
    }
    set chain_max_ff(val) {
      this.storage.set("chain_max_ff", val);
      this.storage.set("chain_ff_target", val);
    }
    get chain_factionless() {
      return this.storage.get(
        "chain_factionless"
) ?? CONFIG_DEFAULTS.chain_factionless;
    }
    set chain_factionless(val) {
      this.storage.set("chain_factionless", val);
    }
    get ff_history_enabled() {
      return this.storage.get(
        "ff_history_enabled"
) ?? CONFIG_DEFAULTS.ff_history_enabled;
    }
    set ff_history_enabled(val) {
      this.storage.set("ff_history_enabled", val);
    }
    get factions_col_display() {
      return this.storage.get(
        "factions_col_display"
) ?? CONFIG_DEFAULTS.factions_col_display;
    }
    set factions_col_display(val) {
      this.storage.set("factions_col_display", val);
    }
    get war_col_display() {
      return this.storage.get(
        "war_col_display"
) ?? CONFIG_DEFAULTS.war_col_display;
    }
    set war_col_display(val) {
      this.storage.set("war_col_display", val);
    }
    get debug_logs() {
      return this.storage.get(
        "debug_logs"
) ?? CONFIG_DEFAULTS.debug_logs;
    }
    set debug_logs(val) {
      this.storage.set("debug_logs", val);
      logger.setLevel(val ? LogLevel.DEBUG : LogLevel.INFO);
    }
    get analytics_enabled() {
      return this.storage.get(
        "analytics_enabled"
) ?? CONFIG_DEFAULTS.analytics_enabled;
    }
    set analytics_enabled(val) {
      this.storage.set("analytics_enabled", val);
    }
    get network_interception_enabled() {
      return this.storage.get(
        "network_interception_enabled"
) ?? CONFIG_DEFAULTS.network_interception_enabled;
    }
    set network_interception_enabled(val) {
      this.storage.set("network_interception_enabled", val);
    }
    get status_attack_links_enabled() {
      return this.storage.get(
        "status_attack_links_enabled"
) ?? CONFIG_DEFAULTS.status_attack_links_enabled;
    }
    set status_attack_links_enabled(val) {
      this.storage.set("status_attack_links_enabled", val);
    }
    get settings_panel_own_profile_only() {
      return this.storage.get(
        "settings_panel_own_profile_only"
) ?? CONFIG_DEFAULTS.settings_panel_own_profile_only;
    }
    set settings_panel_own_profile_only(val) {
      this.storage.set("settings_panel_own_profile_only", val);
    }
    get faction_filter_enabled() {
      return this.storage.get(
        "faction_filter_enabled"
) ?? CONFIG_DEFAULTS.faction_filter_enabled;
    }
    set faction_filter_enabled(val) {
      this.storage.set("faction_filter_enabled", val);
    }
    get war_filter_enabled() {
      return this.storage.get(
        "war_filter_enabled"
) ?? CONFIG_DEFAULTS.war_filter_enabled;
    }
    set war_filter_enabled(val) {
      this.storage.set("war_filter_enabled", val);
    }
    get debug_disable_pda_http() {
      return this.storage.get(
        "debug_disable_pda_http"
) ?? CONFIG_DEFAULTS.debug_disable_pda_http;
    }
    set debug_disable_pda_http(val) {
      this.storage.set("debug_disable_pda_http", val);
    }
    get debug_force_react_fallback() {
      return this.storage.get(
        "debug_force_react_fallback"
) ?? CONFIG_DEFAULTS.debug_force_react_fallback;
    }
    set debug_force_react_fallback(val) {
      this.storage.set("debug_force_react_fallback", val);
    }
    get gauge_marker_type() {
      return this.storage.get(
        "gauge_marker_type"
) ?? CONFIG_DEFAULTS.gauge_marker_type;
    }
    set gauge_marker_type(val) {
      this.storage.set("gauge_marker_type", val);
    }
    get gauge_marker_scale() {
      return this.storage.get(
        "gauge_marker_scale"
) ?? CONFIG_DEFAULTS.gauge_marker_scale;
    }
    set gauge_marker_scale(val) {
      this.storage.set("gauge_marker_scale", val);
    }
    get gauge_marker_border_width() {
      return this.storage.get(
        "gauge_marker_border_width"
) ?? CONFIG_DEFAULTS.gauge_marker_border_width;
    }
    set gauge_marker_border_width(val) {
      this.storage.set("gauge_marker_border_width", val);
    }
    get color_scheme() {
      return this.storage.get(
        "color_scheme"
) ?? CONFIG_DEFAULTS.color_scheme;
    }
    set color_scheme(val) {
      this.storage.set("color_scheme", val);
    }
    get custom_colors() {
      return this.storage.get(
        "custom_colors"
) ?? CONFIG_DEFAULTS.custom_colors;
    }
    set custom_colors(val) {
      if (val === null) {
        this.storage.remove(
          "custom_colors"
);
      } else {
        this.storage.set("custom_colors", val);
      }
    }
    get faction_filter_state() {
      return this.storage.get(
        "faction_filter_state"
) ?? null;
    }
    set faction_filter_state(val) {
      this.storage.set("faction_filter_state", val);
    }
    get faction_filter_collapsed() {
      return this.storage.get(
        "faction_filter_collapsed"
) ?? false;
    }
    set faction_filter_collapsed(val) {
      this.storage.set("faction_filter_collapsed", val);
    }
    get war_filter_state() {
      return this.storage.get(
        "war_filter_state"
) ?? null;
    }
    set war_filter_state(val) {
      this.storage.set("war_filter_state", val);
    }
    get war_filter_collapsed() {
      return this.storage.get(
        "war_filter_collapsed"
) ?? false;
    }
    set war_filter_collapsed(val) {
      this.storage.set("war_filter_collapsed", val);
    }
    get chain_targets() {
      return this.storage.get(
        "chain_targets"
);
    }
    set chain_targets(val) {
      if (val === null) {
        this.storage.remove(
          "chain_targets"
);
      } else {
        this.storage.set("chain_targets", val);
      }
    }
    get chain_target_index() {
      return this.storage.get(
        "chain_target_index"
) ?? 0;
    }
    set chain_target_index(val) {
      this.storage.set("chain_target_index", val);
    }
    reset() {
      this.storage.remove(
        "low_ff_range"
);
      this.storage.remove(
        "high_ff_range"
);
      this.storage.remove(
        "max_ff_range"
);
      this.storage.remove(
        "chain_button_enabled"
);
      this.storage.remove(
        "chain_link_type"
);
      this.storage.remove(
        "chain_tab_type"
);
      this.storage.remove(
        "chain_ff_target"
);
      this.storage.remove(
        "ff_history_enabled"
);
      this.storage.remove(
        "factions_col_display"
);
      this.storage.remove(
        "war_col_display"
);
      this.storage.remove(
        "debug_logs"
);
      this.storage.remove(
        "analytics_enabled"
);
      this.storage.remove(
        "network_interception_enabled"
);
      this.storage.remove(
        "faction_filter_state"
);
      this.storage.remove(
        "faction_filter_collapsed"
);
      this.storage.remove(
        "war_filter_state"
);
      this.storage.remove(
        "war_filter_collapsed"
);
      this.storage.remove(
        "chain_min_level"
);
      this.storage.remove(
        "chain_max_level"
);
      this.storage.remove(
        "chain_inactive"
);
      this.storage.remove(
        "chain_min_ff"
);
      this.storage.remove(
        "chain_max_ff"
);
      this.storage.remove(
        "chain_factionless"
);
      this.storage.remove(
        "chain_targets"
);
      this.storage.remove(
        "chain_target_index"
);
      this.storage.remove(
        "gauge_marker_type"
);
      this.storage.remove(
        "gauge_marker_scale"
);
      this.storage.remove(
        "gauge_marker_border_width"
);
      this.storage.remove(
        "war_quick_attack_action"
);
      this.storage.remove(
        "status_attack_links_enabled"
);
      this.storage.remove(
        "debug_disable_pda_http"
);
      this.storage.remove(
        "debug_force_react_fallback"
);
      this.storage.remove(
        "color_scheme"
);
      this.storage.remove(
        "custom_colors"
);
      this.storage.remove(
        "settings_panel_own_profile_only"
);
      this.storage.remove(
        "faction_filter_enabled"
);
      this.storage.remove(
        "war_filter_enabled"
);
    }
  }
  const ffconfig = new FFConfig("ffsv3-config");
  function unsafeWindowReact() {
    return unsafeWindow;
  }
  function requiredReact() {
    return globalThis;
  }
  function hasWorkingUnsafeWindowReact() {
    const w = unsafeWindowReact();
    return Boolean(w.React && w.ReactDOM);
  }
  function getReact() {
    if (!ffconfig.debug_force_react_fallback && hasWorkingUnsafeWindowReact()) {
      return unsafeWindowReact().React;
    }
    return requiredReact().React;
  }
  function getReactDOM() {
    if (!ffconfig.debug_force_react_fallback && hasWorkingUnsafeWindowReact()) {
      return unsafeWindowReact().ReactDOM;
    }
    return requiredReact().ReactDOM;
  }
  const FRAGMENT_SENTINEL = Symbol("ReactFragment");
  const Fragment = FRAGMENT_SENTINEL;
  function jsx(type, { children, ...props }, key) {
    const R = getReact();
    const createElement2 = R.createElement;
    const realType = type === FRAGMENT_SENTINEL ? R.Fragment : type;
    if (key !== void 0) props.key = key;
    if (children === void 0) {
      return createElement2(realType, props);
    }
    return Array.isArray(children) ? createElement2(realType, props, ...children) : createElement2(realType, props, children);
  }
  const jsxs = jsx;
  var TornApiError;
  (function(TornApiError2) {
    TornApiError2[TornApiError2["UNKNOWN_ERROR"] = 0] = "UNKNOWN_ERROR";
    TornApiError2[TornApiError2["KEY_EMPTY"] = 1] = "KEY_EMPTY";
    TornApiError2[TornApiError2["INCORRECT_KEY"] = 2] = "INCORRECT_KEY";
    TornApiError2[TornApiError2["WRONG_TYPE"] = 3] = "WRONG_TYPE";
    TornApiError2[TornApiError2["WRONG_FIELDS"] = 4] = "WRONG_FIELDS";
    TornApiError2[TornApiError2["TOO_MANY_REQUESTS"] = 5] = "TOO_MANY_REQUESTS";
    TornApiError2[TornApiError2["INCORRECT_ID"] = 6] = "INCORRECT_ID";
    TornApiError2[TornApiError2["INCORRECT_RELATION"] = 7] = "INCORRECT_RELATION";
    TornApiError2[TornApiError2["IP_BLOCK"] = 8] = "IP_BLOCK";
    TornApiError2[TornApiError2["API_DISABLED"] = 9] = "API_DISABLED";
    TornApiError2[TornApiError2["KEY_FEDERAL_JAIL"] = 10] = "KEY_FEDERAL_JAIL";
    TornApiError2[TornApiError2["KEY_CHANGE_ERROR"] = 11] = "KEY_CHANGE_ERROR";
    TornApiError2[TornApiError2["KEY_READ_ERROR"] = 12] = "KEY_READ_ERROR";
    TornApiError2[TornApiError2["KEY_TEMPORARILY_DISABLED_TO_INACTIVITY"] = 13] = "KEY_TEMPORARILY_DISABLED_TO_INACTIVITY";
    TornApiError2[TornApiError2["DAILY_READ_LIMIT_REACHED"] = 14] = "DAILY_READ_LIMIT_REACHED";
    TornApiError2[TornApiError2["TEMPORARY_ERROR"] = 15] = "TEMPORARY_ERROR";
    TornApiError2[TornApiError2["ACCESS_LEVEL_KEY_NOT_HIGH"] = 16] = "ACCESS_LEVEL_KEY_NOT_HIGH";
    TornApiError2[TornApiError2["BACKEND_ERROR_OCCURRED"] = 17] = "BACKEND_ERROR_OCCURRED";
    TornApiError2[TornApiError2["API_KEY_HAS_BEEN_PAUSED"] = 18] = "API_KEY_HAS_BEEN_PAUSED";
    TornApiError2[TornApiError2["MUST_BE_MIGRATED_TO_CRIMES"] = 19] = "MUST_BE_MIGRATED_TO_CRIMES";
    TornApiError2[TornApiError2["RACE_NOT_YET_FINISHED"] = 20] = "RACE_NOT_YET_FINISHED";
    TornApiError2[TornApiError2["INCORRECT_CATEGORY"] = 21] = "INCORRECT_CATEGORY";
    TornApiError2[TornApiError2["SELECTION_ONLY_AVAILABLE_API_V1"] = 22] = "SELECTION_ONLY_AVAILABLE_API_V1";
    TornApiError2[TornApiError2["SELECTION_ONLY_AVAILABLE_API_V2"] = 23] = "SELECTION_ONLY_AVAILABLE_API_V2";
    TornApiError2[TornApiError2["CLOSED_TEMPORARILY"] = 24] = "CLOSED_TEMPORARILY";
    TornApiError2[TornApiError2["INVALID_STAT_REQUESTED"] = 25] = "INVALID_STAT_REQUESTED";
    TornApiError2[TornApiError2["ONLY_CATEGORY_OR_STATS_CAN"] = 26] = "ONLY_CATEGORY_OR_STATS_CAN";
    TornApiError2[TornApiError2["MUST_BE_MIGRATED_TO_ORGANIZED"] = 27] = "MUST_BE_MIGRATED_TO_ORGANIZED";
    TornApiError2[TornApiError2["INCORRECT_LOG_ID"] = 28] = "INCORRECT_LOG_ID";
    TornApiError2[TornApiError2["CATEGORY_SELECTION_NOT_AVAILABLE_FOR"] = 29] = "CATEGORY_SELECTION_NOT_AVAILABLE_FOR";
  })(TornApiError || (TornApiError = {}));
  class HTTPClient {
    canAbort() {
      return false;
    }
  }
  class AbortableHTTPClient extends HTTPClient {
    canAbort() {
      return true;
    }
  }
  class FetchHTTPClient extends AbortableHTTPClient {
    async getJson(url, timeout = void 0) {
      let response;
      if (timeout !== void 0) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
      } else {
        response = await fetch(url);
      }
      return await response.json();
    }
  }
  class TornApiClient {
    httpClient;
    defaultComment;
    defaultTimeout;
    constructor(options = {}) {
      this.httpClient = options.httpClient ?? new FetchHTTPClient();
      this.defaultComment = options.defaultComment;
      this.defaultTimeout = options.defaultTimeout;
    }
    async getV1({ section, selections, id, params = {}, key, comment, cache, expiry, timeout }) {
      const cached = await cache?.get({
        section,
        selections,
        id,
        params,
        key
      });
      if (cached)
        return cached;
      let url = `https://api.torn.com/${section}/${id ?? ""}`;
      url = this.populateUrl(url, key, selections ?? [], comment, params ?? {});
      if (this.httpClient.canAbort() && typeof timeout === "number") {
        return this.httpClient.getJson(url, timeout).then(addToCache).catch(this.handleError);
      } else {
        return this.httpClient.getJson(url).then(addToCache).catch(this.handleError);
      }
      function addToCache(response) {
        if ("error" in response)
          return response;
        cache?.set({
          section,
          selections,
          id,
          params,
          key
        }, response, expiry ?? Date.now() + 3e4);
        return response;
      }
    }
    async getV2({ section, selections, id, params = {}, key, comment, cache, expiry, timeout }) {
      const cached = await cache?.get({
        section,
        selections,
        id,
        params,
        key
      });
      if (cached)
        return cached;
      let url = `https://api.torn.com/v2/${section}/${id ?? ""}`;
      url = this.populateUrl(url, key, selections ?? [], comment, params ?? {});
      if (this.httpClient.canAbort() && typeof timeout === "number") {
        return this.httpClient.getJson(url, timeout).then(addToCache).catch(this.handleError);
      } else {
        return this.httpClient.getJson(url).then(addToCache).catch(this.handleError);
      }
      function addToCache(response) {
        if ("error" in response)
          return response;
        cache?.set({
          section,
          selections,
          id,
          params,
          key
        }, response, expiry ?? Date.now() + 3e4);
        return response;
      }
    }
    handleError(error) {
      console.error(error);
      return { error: { code: -1, error: generateErrorString(error) } };
      function generateErrorString(e) {
        switch (typeof e) {
          case "string":
            return e;
          case "object": {
            if (e instanceof Error)
              return e.message;
            return JSON.stringify(e);
          }
          default:
            return e.toString();
        }
      }
    }
    populateUrl(url, key, selections, comment, params) {
      const allParams = {
        key,
        comment: comment ?? this.defaultComment,
        selections: selections.length ? selections.join(",") : void 0,
        ...params
      };
      const query = Object.entries(allParams).filter((entry) => !!entry[1]).map(([key2, value]) => `${key2}=${value}`).join("&");
      return `${url}?${query}`;
    }
  }
  const FF_SCOUTER_BASE_URL = "https://ffscouter.com/api/v1";
  new TornApiClient({
    defaultComment: `FFScouterV2-${"3.2-beta1"}`,
    defaultTimeout: 30
});
  async function gmRequest(options) {
    if (isInPDA() && !ffconfig.debug_disable_pda_http) {
      const url = options.url;
      const headers = options.headers ?? {};
      const method = (options.method ?? "GET").toUpperCase();
      const pdaResp = method === "POST" ? await window.PDA_httpPost(url, headers, options.data) : await window.PDA_httpGet(url, headers);
      return pdaResp;
    }
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        ...options,
        onload: (response) => resolve(response),
        onerror: (err) => reject(err),
        ontimeout: () => reject(new Error("Timeout making GM_xmlhttpRequest"))
      });
    });
  }
  const make_stats_url = (key, player_ids) => {
    const query = new URLSearchParams([
      ["key", key],
      ["targets", player_ids.toString()]
    ]);
    return `${FF_SCOUTER_BASE_URL}/get-stats?${query.toString()}`;
  };
  const EMPTY_AVAILABLE_ESTIMATES = {
    bss: null,
    premium: null,
    spies: null
  };
  function is_ff_success(resp) {
    return resp.code === void 0;
  }
  function is_ff_check_success(resp) {
    return resp.code === void 0;
  }
  class FFApiError extends Error {
    constructor(message, options) {
      super(message, options);
      this.ff_api_limits = options?.ff_api_limits;
      this.ff_api_error = options?.ff_api_error;
    }
  }
  const query_stats = async (key, player_ids, requester = gmRequest) => {
    logger.debug("Calling query_stats with arguments", { key, player_ids });
    const url = make_stats_url(key, player_ids);
    const resp = await requester({
      method: "GET",
      url
    });
    if (!resp) {
      return { result: new Map(), blank: true };
    }
    const limits = parse_limit_headers(resp.responseHeaders);
    let ff_response = null;
    try {
      ff_response = JSON.parse(resp.responseText);
    } catch {
      logger.warn(
        `query_stats: unparseable response. status=${resp.status}, body=${resp.responseText?.substring(0, 200)}, url=${url}`
      );
      throw new FFApiError(
        `API request failed. Couldn't parse response. HTTP status code: ${resp.status}`,
        { ff_api_limits: limits }
      );
    }
    if (ff_response == null) {
      logger.warn(
        `query_stats: null response after parse. status=${resp.status}, url=${url}`
      );
      throw new FFApiError(
        `API request failed. Response not set. HTTP status code: ${resp.status}`,
        { ff_api_limits: limits }
      );
    }
    if (!is_ff_success(ff_response)) {
      throw new FFApiError(
        `API request failed. Error: ${ff_response.error}; Code: ${ff_response.code}`,
        { ff_api_error: ff_response, ff_api_limits: limits }
      );
    }
    if (resp.status !== 200) {
      logger.warn(
        `query_stats: unexpected HTTP status. status=${resp.status}, body=${resp.responseText?.substring(0, 200)}, url=${url}`
      );
      throw new FFApiError(
        `API request failed. HTTP status code: ${resp.status}`,
        { ff_api_limits: limits }
      );
    }
    const results = new Map();
    ff_response.forEach((result) => {
      if (result?.player_id) {
        if (!result.fair_fight || !result.last_updated || !result.bs_estimate || !result.bs_estimate_human || !result.bss_public || !result.source) {
          results.set(result.player_id, {
            no_data: true,
            player_id: result.player_id
          });
        } else {
          let distribution;
          if (result.distribution) {
            distribution = {
              last_updated: result.distribution.last_updated,
              distribution_human: result.distribution.distribution_human,
              stats_percentage: {
                strength: result.distribution.stats_percentage?.strength,
                speed: result.distribution.stats_percentage?.speed,
                defense: result.distribution.stats_percentage?.defense,
                dexterity: result.distribution.stats_percentage?.dexterity
              }
            };
          }
          results.set(result.player_id, {
            no_data: false,
            fair_fight: result.fair_fight,
            last_updated: result.last_updated,
            bs_estimate: result.bs_estimate,
            bs_estimate_human: result.bs_estimate_human,
            bss_public: result.bss_public,
            source: result.source ?? "bss",
            premium_insights_available: result.premium_insights_available ?? false,
            distribution,
            available_estimates: result.available_estimates ?? EMPTY_AVAILABLE_ESTIMATES,
            spies: result.spies ?? [],
            player_id: result.player_id
          });
        }
      }
    });
    for (const id of player_ids) {
      if (!results.get(id)) {
        results.set(id, {
          no_data: true,
          player_id: id
        });
      }
    }
    return { result: results, blank: false, limits };
  };
  const parse_limit_headers = (responseHeaders) => {
    if (typeof responseHeaders !== "string") {
      return void 0;
    }
    const headerLines = responseHeaders.split("\n");
    const headers = new Map();
    for (const line of headerLines) {
      const [key, value] = line.split(":", 2);
      if (!key || !value) {
        continue;
      }
      headers.set(key, value.trim());
    }
    const reset_time_str = headers.get("x-ratelimit-reset-timestamp");
    const remaining_str = headers.get("x-ratelimit-remaining");
    const rate_limit_str = headers.get("x-ratelimit-limit");
    if (reset_time_str && remaining_str && rate_limit_str) {
      const remaining = parseInt(remaining_str, 10);
      const rate_limit = parseInt(rate_limit_str, 10);
      const this_minute = rate_limit - remaining;
      return {
        reset_time: new Date(parseInt(reset_time_str, 10) * 1e3),
        remaining,
        rate_limit,
        this_minute
      };
    }
  };
  const check_key = async (key, requester = gmRequest) => {
    if (!key) {
      return { blank: true };
    }
    const query = new URLSearchParams([["key", key]]);
    const url = `${FF_SCOUTER_BASE_URL}/check-key?${query.toString()}`;
    const resp = await requester({
      method: "GET",
      url
    });
    if (!resp) {
      return { blank: true };
    }
    const limits = parse_limit_headers(resp.responseHeaders);
    let ff_response = null;
    try {
      ff_response = JSON.parse(resp.responseText);
    } catch {
      logger.warn(
        `check_key: unparseable response. status=${resp.status}, body=${resp.responseText?.substring(0, 200)}, url=${url}`
      );
      throw new FFApiError(
        `API request failed. Couldn't parse response. HTTP status code: ${resp.status}`,
        { ff_api_limits: limits }
      );
    }
    if (ff_response == null) {
      logger.warn(
        `check_key: null response after parse. status=${resp.status}, url=${url}`
      );
      throw new FFApiError(
        `API request failed. Response not set. HTTP status code: ${resp.status}`,
        { ff_api_limits: limits }
      );
    }
    if (!is_ff_check_success(ff_response)) {
      throw new FFApiError(
        `API request failed. Error: ${ff_response.error}; Code: ${ff_response.code}`,
        { ff_api_error: ff_response, ff_api_limits: limits }
      );
    }
    if (resp.status !== 200) {
      logger.warn(
        `check_key: unexpected HTTP status. status=${resp.status}, body=${resp.responseText?.substring(0, 200)}, url=${url}`
      );
      throw new FFApiError(
        `API request failed. HTTP status code: ${resp.status}`,
        { ff_api_limits: limits }
      );
    }
    return { result: ff_response, blank: false, limits };
  };
  const make_flights_url = (key, target) => {
    const query = new URLSearchParams([
      ["key", key],
      ["target", target.toString()]
    ]);
    return `${FF_SCOUTER_BASE_URL}/player-flights?${query.toString()}`;
  };
  function is_flight_success(resp) {
    return resp.code === void 0;
  }
  const query_flights = async (key, target, requester = gmRequest) => {
    logger.debug("Calling query_flights with arguments", { key, target });
    const url = make_flights_url(key, target);
    const resp = await requester({
      method: "GET",
      url
    });
    if (!resp) {
      return { blank: true };
    }
    const limits = parse_limit_headers(resp.responseHeaders);
    let ff_response = null;
    try {
      ff_response = JSON.parse(resp.responseText);
    } catch {
      logger.warn(
        `query_flights: unparseable response. status=${resp.status}, body=${resp.responseText?.substring(0, 200)}, url=${url}`
      );
      throw new FFApiError(
        `API request failed. Couldn't parse response. HTTP status code: ${resp.status}`,
        { ff_api_limits: limits }
      );
    }
    if (ff_response == null) {
      logger.warn(
        `query_flights: null response after parse. status=${resp.status}, url=${url}`
      );
      throw new FFApiError(
        `API request failed. Response not set. HTTP status code: ${resp.status}`,
        { ff_api_limits: limits }
      );
    }
    if (!is_flight_success(ff_response)) {
      throw new FFApiError(
        `API request failed. Error: ${ff_response.error}; Code: ${ff_response.code}`,
        { ff_api_error: ff_response, ff_api_limits: limits }
      );
    }
    if (resp.status !== 200) {
      logger.warn(
        `query_flights: unexpected HTTP status. status=${resp.status}, body=${resp.responseText?.substring(0, 200)}, url=${url}`
      );
      throw new FFApiError(
        `API request failed. HTTP status code: ${resp.status}`,
        { ff_api_limits: limits }
      );
    }
    return { result: ff_response, blank: false, limits };
  };
  const query_targets = async (key, params, requester = gmRequest) => {
    logger.debug("Calling query_targets with arguments", { key, params });
    const query = new URLSearchParams([["key", key]]);
    if (params.minlevel !== void 0 && params.minlevel !== null) {
      query.append("minlevel", params.minlevel.toString());
    }
    if (params.maxlevel !== void 0 && params.maxlevel !== null) {
      query.append("maxlevel", params.maxlevel.toString());
    }
    if (params.minff !== void 0 && params.minff !== null) {
      query.append("minff", params.minff.toString());
    }
    if (params.maxff !== void 0 && params.maxff !== null) {
      query.append("maxff", params.maxff.toString());
    }
    if (params.inactiveonly !== void 0 && params.inactiveonly !== null) {
      query.append("inactiveonly", params.inactiveonly.toString());
    }
    if (params.factionless !== void 0 && params.factionless !== null) {
      query.append("factionless", params.factionless.toString());
    }
    if (params.limit !== void 0 && params.limit !== null) {
      query.append("limit", params.limit.toString());
    }
    const url = `${FF_SCOUTER_BASE_URL}/get-targets?${query.toString()}`;
    const resp = await requester({
      method: "GET",
      url
    });
    if (!resp) {
      throw new Error("Empty response from get-targets");
    }
    if (resp.status !== 200) {
      let errMessage = `API request failed with HTTP ${resp.status}`;
      try {
        const errJson = JSON.parse(resp.responseText);
        if (errJson?.error) {
          errMessage = errJson.error;
        }
      } catch {
      }
      throw new Error(errMessage);
    }
    const parsed = JSON.parse(resp.responseText);
    if (parsed.error) {
      throw new Error(parsed.error);
    }
    return parsed;
  };
  const log$h = logger.child("api");
  const CHECK_KEY = "check-key-status";
  class CheckKeyStatus {
    constructor(config, storage) {
      this.check_key_status = async (force = false) => {
        if (!force) {
          const cached = this.storage.get(CHECK_KEY);
          if (cached) {
            return cached;
          }
        }
        let result;
        try {
          result = await check_key(this.config.key);
        } catch (err) {
          log$h.error(
            "Received error response querying ffscouter check-key api:",
            err
          );
          throw err;
        }
        if (result.blank) {
          return null;
        }
        this.storage.set(CHECK_KEY, result.result, {
          amount: 5,
          unit: Time.Minutes
        });
        return result.result;
      };
      this.is_premium = async (force = false) => {
        try {
          const status = await this.check_key_status(force);
          if (!status) return null;
          return status.is_premium;
        } catch (err) {
          log$h.warn("Failed to check premium status:", err);
          return null;
        }
      };
      this.clear = () => {
        this.storage.remove(CHECK_KEY);
      };
      this.config = config;
      this.storage = storage;
    }
  }
  const check_key_status = new CheckKeyStatus(
    ffconfig,
    new Storage("ffsv3-check")
  );
  function resolve_estimate(data) {
    const candidate = data.available_estimates?.[data.source];
    return {
      source: data.source,
      bs_estimate: candidate?.bs_estimate ?? data.bs_estimate,
      bs_estimate_human: candidate?.bs_estimate_human ?? data.bs_estimate_human,
      last_updated: candidate?.last_updated ?? data.last_updated,
      fair_fight: candidate?.fair_fight ?? data.fair_fight
    };
  }
  function extract_ff(data) {
    return resolve_estimate(data).fair_fight;
  }
  function extract_bs_estimate(data) {
    return resolve_estimate(data).bs_estimate;
  }
  function extract_bs_estimate_human(data) {
    return resolve_estimate(data).bs_estimate_human;
  }
  function extract_source(data) {
    return resolve_estimate(data).source;
  }
  function extract_last_updated(data) {
    return resolve_estimate(data).last_updated;
  }
  const instanceOfAny = (object, constructors) => constructors.some((c) => object instanceof c);
  let idbProxyableTypes;
  let cursorAdvanceMethods;
  function getIdbProxyableTypes() {
    return idbProxyableTypes || (idbProxyableTypes = [
      IDBDatabase,
      IDBObjectStore,
      IDBIndex,
      IDBCursor,
      IDBTransaction
    ]);
  }
  function getCursorAdvanceMethods() {
    return cursorAdvanceMethods || (cursorAdvanceMethods = [
      IDBCursor.prototype.advance,
      IDBCursor.prototype.continue,
      IDBCursor.prototype.continuePrimaryKey
    ]);
  }
  const transactionDoneMap = new WeakMap();
  const transformCache = new WeakMap();
  const reverseTransformCache = new WeakMap();
  function promisifyRequest(request) {
    const promise = new Promise((resolve, reject) => {
      const unlisten = () => {
        request.removeEventListener("success", success);
        request.removeEventListener("error", error);
      };
      const success = () => {
        resolve(wrap(request.result));
        unlisten();
      };
      const error = () => {
        reject(request.error);
        unlisten();
      };
      request.addEventListener("success", success);
      request.addEventListener("error", error);
    });
    reverseTransformCache.set(promise, request);
    return promise;
  }
  function cacheDonePromiseForTransaction(tx) {
    if (transactionDoneMap.has(tx))
      return;
    const done = new Promise((resolve, reject) => {
      const unlisten = () => {
        tx.removeEventListener("complete", complete);
        tx.removeEventListener("error", error);
        tx.removeEventListener("abort", error);
      };
      const complete = () => {
        resolve();
        unlisten();
      };
      const error = () => {
        reject(tx.error || new DOMException("AbortError", "AbortError"));
        unlisten();
      };
      tx.addEventListener("complete", complete);
      tx.addEventListener("error", error);
      tx.addEventListener("abort", error);
    });
    transactionDoneMap.set(tx, done);
  }
  let idbProxyTraps = {
    get(target, prop, receiver) {
      if (target instanceof IDBTransaction) {
        if (prop === "done")
          return transactionDoneMap.get(target);
        if (prop === "store") {
          return receiver.objectStoreNames[1] ? void 0 : receiver.objectStore(receiver.objectStoreNames[0]);
        }
      }
      return wrap(target[prop]);
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
    has(target, prop) {
      if (target instanceof IDBTransaction && (prop === "done" || prop === "store")) {
        return true;
      }
      return prop in target;
    }
  };
  function replaceTraps(callback) {
    idbProxyTraps = callback(idbProxyTraps);
  }
  function wrapFunction(func) {
    if (getCursorAdvanceMethods().includes(func)) {
      return function(...args) {
        func.apply(unwrap(this), args);
        return wrap(this.request);
      };
    }
    return function(...args) {
      return wrap(func.apply(unwrap(this), args));
    };
  }
  function transformCachableValue(value) {
    if (typeof value === "function")
      return wrapFunction(value);
    if (value instanceof IDBTransaction)
      cacheDonePromiseForTransaction(value);
    if (instanceOfAny(value, getIdbProxyableTypes()))
      return new Proxy(value, idbProxyTraps);
    return value;
  }
  function wrap(value) {
    if (value instanceof IDBRequest)
      return promisifyRequest(value);
    if (transformCache.has(value))
      return transformCache.get(value);
    const newValue = transformCachableValue(value);
    if (newValue !== value) {
      transformCache.set(value, newValue);
      reverseTransformCache.set(newValue, value);
    }
    return newValue;
  }
  const unwrap = (value) => reverseTransformCache.get(value);
  function openDB(name, version, { blocked, upgrade, blocking, terminated } = {}) {
    const request = indexedDB.open(name, version);
    const openPromise = wrap(request);
    if (upgrade) {
      request.addEventListener("upgradeneeded", (event) => {
        upgrade(wrap(request.result), event.oldVersion, event.newVersion, wrap(request.transaction), event);
      });
    }
    if (blocked) {
      request.addEventListener("blocked", (event) => blocked(
event.oldVersion,
        event.newVersion,
        event
      ));
    }
    openPromise.then((db) => {
      if (terminated)
        db.addEventListener("close", () => terminated());
      if (blocking) {
        db.addEventListener("versionchange", (event) => blocking(event.oldVersion, event.newVersion, event));
      }
    }).catch(() => {
    });
    return openPromise;
  }
  function deleteDB(name, { blocked } = {}) {
    const request = indexedDB.deleteDatabase(name);
    if (blocked) {
      request.addEventListener("blocked", (event) => blocked(
event.oldVersion,
        event
      ));
    }
    return wrap(request).then(() => void 0);
  }
  const readMethods = ["get", "getKey", "getAll", "getAllKeys", "count"];
  const writeMethods = ["put", "add", "delete", "clear"];
  const cachedMethods = new Map();
  function getMethod(target, prop) {
    if (!(target instanceof IDBDatabase && !(prop in target) && typeof prop === "string")) {
      return;
    }
    if (cachedMethods.get(prop))
      return cachedMethods.get(prop);
    const targetFuncName = prop.replace(/FromIndex$/, "");
    const useIndex = prop !== targetFuncName;
    const isWrite = writeMethods.includes(targetFuncName);
    if (
!(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) || !(isWrite || readMethods.includes(targetFuncName))
    ) {
      return;
    }
    const method = async function(storeName, ...args) {
      const tx = this.transaction(storeName, isWrite ? "readwrite" : "readonly");
      let target2 = tx.store;
      if (useIndex)
        target2 = target2.index(args.shift());
      return (await Promise.all([
        target2[targetFuncName](...args),
        isWrite && tx.done
      ]))[0];
    };
    cachedMethods.set(prop, method);
    return method;
  }
  replaceTraps((oldTraps) => ({
    ...oldTraps,
    get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get(target, prop, receiver),
    has: (target, prop) => !!getMethod(target, prop) || oldTraps.has(target, prop)
  }));
  const advanceMethodProps = ["continue", "continuePrimaryKey", "advance"];
  const methodMap = {};
  const advanceResults = new WeakMap();
  const ittrProxiedCursorToOriginalProxy = new WeakMap();
  const cursorIteratorTraps = {
    get(target, prop) {
      if (!advanceMethodProps.includes(prop))
        return target[prop];
      let cachedFunc = methodMap[prop];
      if (!cachedFunc) {
        cachedFunc = methodMap[prop] = function(...args) {
          advanceResults.set(this, ittrProxiedCursorToOriginalProxy.get(this)[prop](...args));
        };
      }
      return cachedFunc;
    }
  };
  async function* iterate(...args) {
    let cursor = this;
    if (!(cursor instanceof IDBCursor)) {
      cursor = await cursor.openCursor(...args);
    }
    if (!cursor)
      return;
    cursor = cursor;
    const proxiedCursor = new Proxy(cursor, cursorIteratorTraps);
    ittrProxiedCursorToOriginalProxy.set(proxiedCursor, cursor);
    reverseTransformCache.set(proxiedCursor, unwrap(cursor));
    while (cursor) {
      yield proxiedCursor;
      cursor = await (advanceResults.get(proxiedCursor) || cursor.continue());
      advanceResults.delete(proxiedCursor);
    }
  }
  function isIteratorProp(target, prop) {
    return prop === Symbol.asyncIterator && instanceOfAny(target, [IDBIndex, IDBObjectStore, IDBCursor]) || prop === "iterate" && instanceOfAny(target, [IDBIndex, IDBObjectStore]);
  }
  replaceTraps((oldTraps) => ({
    ...oldTraps,
    get(target, prop, receiver) {
      if (isIteratorProp(target, prop))
        return iterate;
      return oldTraps.get(target, prop, receiver);
    },
    has(target, prop) {
      return isIteratorProp(target, prop) || oldTraps.has(target, prop);
    }
  }));
  const log$g = logger.child("storage");
  const STORES = {
    CACHE: "cache",
    FLIGHTS: "flights",
    ANALYTICS: "analytics"
  };
  class FFCache {
    constructor(db_name) {
      this.db = null;
      this.db_version = 3;
      this.cache_interval = 60 * 60 * 1e3;
      this.last_clean = 0;
      this.active_operations = 0;
      this.close_timer = null;
      this.open_promise = null;
      this.channel = null;
      this.state = "CLOSED";
      this.deletion_promise = null;
      this.resolve_deletion = null;
      this.migrations = new Map([
        [
          1,
          (db, _) => {
            const store = db.createObjectStore(STORES.CACHE, {
              keyPath: "player_id"
            });
            store.createIndex("expiry", "expiry", {
              unique: false
            });
          }
        ],
        [
          2,
          (db, _) => {
            const store = db.createObjectStore(STORES.FLIGHTS, {
              keyPath: "player_id"
            });
            store.createIndex("expiry", "expiry", {
              unique: false
            });
          }
        ],
        [
          3,
          (db, _) => {
            const store = db.createObjectStore(STORES.ANALYTICS, {
              keyPath: "id",
              autoIncrement: true
            });
            store.createIndex("timestamp", "timestamp", {
              unique: false
            });
          }
        ]
      ]);
      this.open = async () => {
        if (this.db) {
          return this.db;
        }
        if (this.open_promise) {
          return this.open_promise;
        }
        if (typeof BroadcastChannel !== "undefined" && !this.channel) {
          this.channel = new BroadcastChannel(`ffcache-channel-${this.db_name}`);
          this.channel.onmessage = (event) => {
            this.handle_broadcast(event.data);
          };
          if (typeof this.channel.unref === "function") {
            this.channel.unref();
          }
        }
        const cache = this;
        this.open_promise = (async () => {
          try {
            const db = await openDB(this.db_name, this.db_version, {
              upgrade(db2, oldVersion, newVersion, transaction, _event) {
                log$g.info("Need to upgrade from", oldVersion, "to", newVersion);
                for (let i = (oldVersion ?? 0) + 1; i <= cache.db_version; i++) {
                  log$g.debug(`Migration: ${i}`);
                  const m2 = cache.migrations.get(i);
                  if (m2) {
                    m2(db2, transaction);
                  } else {
                    log$g.debug(`Migration not found: ${i}`);
                  }
                  log$g.debug(`Migration complete: ${i}`);
                }
              },
              blocking(currentVersion, blockedVersion, event) {
                log$g.debug(
                  `Can't open ${blockedVersion} because ${currentVersion} is open. Closing.`
                );
                cache.close();
                if (event?.target && typeof event.target.close === "function") {
                  event.target.close();
                }
              }
});
            cache.db = db;
            cache.state = "OPEN";
            return db;
          } finally {
            cache.open_promise = null;
          }
        })();
        return this.open_promise;
      };
      this.close = () => {
        if (this.db) {
          this.db.close();
          this.db = null;
        }
        this.state = "CLOSED";
      };
      this.start_op = async () => {
        if (this.state === "DELETING_LOCAL" || this.state === "DELETING_REMOTE") {
          await this.wait_for_deletion_complete();
        }
        this.active_operations++;
        if (this.close_timer) {
          clearTimeout(this.close_timer);
          this.close_timer = null;
        }
        return await this.open();
      };
      this.end_op = () => {
        this.active_operations = Math.max(0, this.active_operations - 1);
        if (this.active_operations === 0) {
          if (this.close_timer) {
            clearTimeout(this.close_timer);
          }
          this.close_timer = setTimeout(() => {
            this.close();
            this.close_timer = null;
          }, 1e3);
        }
      };
      this.delete_db = async () => {
        if (this.close_timer) {
          clearTimeout(this.close_timer);
          this.close_timer = null;
        }
        this.state = "DELETING_LOCAL";
        this.channel?.postMessage({ type: "deleting" });
        await this.wait_for_active_ops();
        this.close();
        try {
          await deleteDB(this.db_name, {
            blocked: () => {
              log$g.debug("deleteDB blocked callback called!");
            }
          });
          log$g.info(`Successfully deleted ${this.db_name} IndexedDB.`);
        } finally {
          this.channel?.postMessage({ type: "deleted" });
          this.state = "CLOSED";
          if (this.resolve_deletion) {
            this.resolve_deletion();
            this.resolve_deletion = null;
            this.deletion_promise = null;
          }
          if (this.channel) {
            this.channel.close();
            this.channel = null;
          }
        }
      };
      this.handle_broadcast = (data) => {
        if (data && typeof data === "object") {
          if (data.type === "deleting") {
            this.state = "DELETING_REMOTE";
            if (!this.deletion_promise) {
              this.deletion_promise = new Promise((resolve) => {
                this.resolve_deletion = resolve;
              });
            }
            this.close();
          } else if (data.type === "deleted") {
            this.state = "CLOSED";
            if (this.resolve_deletion) {
              this.resolve_deletion();
              this.resolve_deletion = null;
              this.deletion_promise = null;
            }
          }
        }
      };
      this.wait_for_deletion_complete = async () => {
        while (this.state === "DELETING_LOCAL" || this.state === "DELETING_REMOTE") {
          if (this.deletion_promise) {
            await this.deletion_promise;
          } else {
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
        }
      };
      this.wait_for_active_ops = async () => {
        if (this.open_promise) {
          try {
            await this.open_promise;
          } catch {
          }
        }
        while (this.active_operations > 0) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      };
      this.get = async (player_ids) => {
        const db = await this.start_op();
        try {
          const tx = db.transaction(STORES.CACHE, "readonly");
          const requests = player_ids.map((id) => tx.store.get(id));
          const entries = await Promise.all(requests);
          await tx.done;
          const result = new Map();
          player_ids.forEach((id, idx) => {
            const value = entries[idx];
            result.set(id, !value || value.expiry <= Date.now() ? null : value);
          });
          return result;
        } finally {
          this.end_op();
        }
      };
      this.update = async (values) => {
        const db = await this.start_op();
        try {
          const tx = db.transaction(STORES.CACHE, "readwrite");
          const values_expiry = values.map((value) => {
            return {
              ...value,
              expiry: Date.now() + this.cache_interval
            };
          });
          const requests = values_expiry.map((value) => {
            return tx.store.put(value);
          });
          await Promise.all(requests);
          await tx.done;
        } finally {
          this.end_op();
        }
      };
      this.clean_expired = (force = false) => {
        const now = Date.now();
        if (!force && now - this.last_clean < 60 * 60 * 1e3) {
          return Promise.resolve();
        }
        this.last_clean = now;
        const runClean = async () => {
          const db = await this.start_op();
          try {
            {
              const tx = db.transaction(STORES.CACHE, "readwrite");
              const index2 = tx.store.index("expiry");
              const range = IDBKeyRange.upperBound(Date.now());
              const r = await index2.getAllKeys(range);
              log$g.info(`Found ${r.length} expired values to delete from cache.`);
              await Promise.all(r.map((id) => tx.store.delete(id)));
              await tx.done;
            }
            {
              const tx = db.transaction(STORES.FLIGHTS, "readwrite");
              const index2 = tx.store.index("expiry");
              const range = IDBKeyRange.upperBound(Date.now());
              const r = await index2.getAllKeys(range);
              log$g.info(`Found ${r.length} expired values to delete from flights.`);
              await Promise.all(r.map((id) => tx.store.delete(id)));
              await tx.done;
            }
            {
              const tx = db.transaction(STORES.ANALYTICS, "readwrite");
              const index2 = tx.store.index("timestamp");
              const thirty_days_ago = Date.now() - 30 * 24 * 60 * 60 * 1e3;
              const range = IDBKeyRange.upperBound(thirty_days_ago);
              const r = await index2.getAllKeys(range);
              log$g.info(
                `Found ${r.length} expired values to delete from analytics.`
              );
              await Promise.all(r.map((id) => tx.store.delete(id)));
              await tx.done;
            }
          } finally {
            this.end_op();
          }
        };
        if (typeof window !== "undefined" && "requestIdleCallback" in window) {
          return new Promise((resolve, reject) => {
            window.requestIdleCallback(() => {
              runClean().then(resolve, reject);
            });
          });
        }
        return runClean();
      };
      this.get_flight = async (player_id) => {
        const db = await this.start_op();
        try {
          const tx = db.transaction(STORES.FLIGHTS, "readonly");
          const entry = await tx.store.get(player_id);
          await tx.done;
          if (!entry || entry.expiry <= Date.now()) {
            return null;
          }
          return entry;
        } finally {
          this.end_op();
        }
      };
      this.update_flight = async (value, cache_interval = 60 * 1e3) => {
        const db = await this.start_op();
        try {
          const tx = db.transaction(STORES.FLIGHTS, "readwrite");
          const value_expiry = {
            ...value,
            expiry: Date.now() + cache_interval
          };
          await tx.store.put(value_expiry);
          await tx.done;
        } finally {
          this.end_op();
        }
      };
      this.delete_flight = async (player_id) => {
        const db = await this.start_op();
        try {
          const tx = db.transaction(STORES.FLIGHTS, "readwrite");
          await tx.store.delete(player_id);
          await tx.done;
        } finally {
          this.end_op();
        }
      };
      this.add_analytics = async (entry) => {
        const db = await this.start_op();
        try {
          const tx = db.transaction(STORES.ANALYTICS, "readwrite");
          const value = {
            ...entry,
            timestamp: Date.now()
          };
          await tx.store.add(value);
          await tx.done;
        } finally {
          this.end_op();
        }
      };
      this.get_analytics = async () => {
        const db = await this.start_op();
        try {
          const tx = db.transaction(STORES.ANALYTICS, "readonly");
          const res = await tx.store.getAll();
          await tx.done;
          return res;
        } finally {
          this.end_op();
        }
      };
      this.clear_analytics = async () => {
        const db = await this.start_op();
        try {
          const tx = db.transaction(STORES.ANALYTICS, "readwrite");
          await tx.store.clear();
          await tx.done;
        } finally {
          this.end_op();
        }
      };
      this.dump = async () => {
        const db = await this.start_op();
        try {
          const tx = db.transaction(STORES.CACHE, "readonly");
          const res = await tx.store.getAll();
          await tx.done;
          return res;
        } finally {
          this.end_op();
        }
      };
      this.dump_flights = async () => {
        const db = await this.start_op();
        try {
          const tx = db.transaction(STORES.FLIGHTS, "readonly");
          const res = await tx.store.getAll();
          await tx.done;
          return res;
        } finally {
          this.end_op();
        }
      };
      this.db_name = db_name;
      if (typeof BroadcastChannel !== "undefined") {
        this.channel = new BroadcastChannel(`ffcache-channel-${db_name}`);
        this.channel.onmessage = (event) => {
          this.handle_broadcast(event.data);
        };
        if (typeof this.channel.unref === "function") {
          this.channel.unref();
        }
      }
    }
  }
  const log$f = logger.child("api");
  const DB_NAME = "FFSV3-cache";
  const RECHECK_RETRY_DELAY = 60 * 1e3;
  const RECHECK_WINDOW_DURATION = 3 * 60 * 1e3;
  const FINALIZED_NO_FLIGHT_TTL = 30 * 60 * 1e3;
  const FLIGHT_PACING_DELAY = 1e3;
  const GLOBAL_BUDGET_RESERVE = 50;
  function getParamFast(queryString, paramName) {
    if (!queryString) return null;
    const target = `${paramName}=`;
    if (!queryString.includes(target)) return null;
    let startIdx = 0;
    if (queryString.charCodeAt(0) === 63) {
      startIdx = 1;
    }
    let pos = queryString.indexOf(target, startIdx);
    while (pos !== -1) {
      if (pos === startIdx || queryString.charCodeAt(pos - 1) === 38 ||
queryString.charCodeAt(pos - 1) === 63) {
        const valStart = pos + target.length;
        let valEnd = queryString.indexOf("&", valStart);
        if (valEnd === -1) {
          valEnd = queryString.length;
        }
        const rawVal = queryString.substring(valStart, valEnd);
        if (rawVal.indexOf("%") === -1 && rawVal.indexOf("+") === -1) {
          return rawVal;
        }
        try {
          return decodeURIComponent(rawVal.replace(/\+/g, " "));
        } catch {
          return rawVal;
        }
      }
      pos = queryString.indexOf(target, pos + 1);
    }
    return null;
  }
  class FFScouter {
    constructor(config, cache) {
      this.cache = new FFCache(DB_NAME);
      this.pending = new Map();
      this.flight_queue = [];
      this.flight_timer = null;
      this.flight_recheck_until = new Map();
      this.pending_flights = new Map();
      this.cache_queue = new Set();
      this.cache_delay = 10;
      this.cache_timer = null;
      this.api_queue = new Set();
      this.api_max_batch_size = 200;
      this.api_initial_delay = 100;
      this.api_default_delay = 1e3;
      this.api_timer = null;
      this.api_attempts = 5;
      this.schedule = (fn, delay) => {
        return setTimeout(fn, delay);
      };
      this.clear = (timer) => {
        if (timer) {
          clearTimeout(timer);
        }
      };
      this.get = (player_id) => {
        const p = this.pending.get(player_id);
        if (p) {
          return p.promise;
        }
        let resolve;
        let reject;
        const promise = new Promise((res, rej) => {
          resolve = res;
          reject = rej;
        });
        this.pending.set(player_id, { promise, resolve, reject, api_attempts: 0 });
        if (!this.config.key) {
          this.resolve(player_id, { player_id, no_data: true });
          return promise;
        }
        this.enqueue_cache(player_id);
        return promise;
      };
      this.clear_flight_cache = async (player_id) => {
        try {
          await this.cache.delete_flight(player_id);
        } catch (err) {
          log$f.error("Failed to delete flight from cache", err);
        }
      };
      this.calculate_flight_cache_ttl = (result) => {
        if (result.current) {
          const now = Date.now();
          const latest_arrival_time_ms = result.current.latest_arrival_time * 1e3;
          const time_remaining = latest_arrival_time_ms - now;
          if (time_remaining > 0) {
            const segment = Math.floor(time_remaining / 2);
            const min_ttl = 60 * 1e3;
            return Math.max(min_ttl, segment);
          }
        }
        return FINALIZED_NO_FLIGHT_TTL;
      };
      this.enqueue_flight_api = (player_id, recheck_until) => {
        let resolve;
        let reject;
        const promise = new Promise((res, rej) => {
          resolve = res;
          reject = rej;
        });
        if (recheck_until !== void 0) {
          this.flight_recheck_until.set(player_id, recheck_until);
        }
        const pending = this.pending_flights.get(player_id);
        if (pending) {
          pending.push({ resolve, reject });
          return promise;
        }
        this.pending_flights.set(player_id, [{ resolve, reject }]);
        this.flight_queue.push(player_id);
        this.schedule_flight_processor();
        return promise;
      };
      this.schedule_flight_processor = (delay = 0) => {
        if (this.flight_timer) {
          return;
        }
        this.flight_timer = this.schedule(this.process_flight_queue, delay);
      };
      this.process_flight_queue = async () => {
        this.flight_timer = null;
        if (this.flight_queue.length === 0) {
          return;
        }
        if (this.last_limits && this.last_limits.reset_time > new Date() && this.last_limits.remaining <= GLOBAL_BUDGET_RESERVE) {
          log$f.warn(
            `Total API quota <= ${GLOBAL_BUDGET_RESERVE}. Deferring flight status checks to prioritize stats.`
          );
          this.schedule_flight_processor(5e3);
          return;
        }
        const player_id = this.flight_queue.shift();
        if (player_id === void 0) {
          return;
        }
        const pending = this.pending_flights.get(player_id);
        if (!pending) {
          this.schedule_flight_processor(0);
          return;
        }
        log$f.debug(`Querying paced flight API for player ${player_id}`);
        try {
          const response = await query_flights(this.config.key, player_id);
          if (response.blank) {
            throw new Error(
              `Empty flight response returned for player ${player_id}`
            );
          }
          if (response.limits) {
            this.last_limits = response.limits;
          }
          let finalResult = response.result;
          if (response.result.current) {
            try {
              const ttl = this.calculate_flight_cache_ttl(response.result);
              await this.cache.update_flight(response.result, ttl);
            } catch (err) {
              log$f.error("Failed to update flight cache", err);
            }
          } else {
            log$f.debug(`Start rechecking cycle for player ${player_id}`);
            const now = Date.now();
            const next_retry_at = now + RECHECK_RETRY_DELAY;
            const existing_recheck_until = this.flight_recheck_until.get(player_id);
            const recheck_until = existing_recheck_until ?? now + RECHECK_WINDOW_DURATION;
            const rechecking_response = {
              player_id: response.result.player_id,
              current: null,
              recent_flights: response.result.recent_flights,
              rechecking: true,
              next_retry_at,
              recheck_until
            };
            try {
              const remaining_ttl = Math.max(0, recheck_until - now);
              await this.cache.update_flight(rechecking_response, remaining_ttl);
            } catch (err) {
              log$f.error("Failed to update flight cache during recheck", err);
            }
            finalResult = rechecking_response;
          }
          for (const job of pending) {
            job.resolve(finalResult);
          }
        } catch (err) {
          log$f.error(`Paced flight API query failed for ${player_id}:`, err);
          const apiErr = err;
          if (apiErr?.ff_api_limits) {
            this.last_limits = apiErr.ff_api_limits;
          }
          for (const job of pending) {
            job.reject(err);
          }
        } finally {
          this.pending_flights.delete(player_id);
          this.flight_recheck_until.delete(player_id);
          try {
            await this.cache.clean_expired();
          } catch (err) {
            log$f.error("Failed to clean expired cache entries", err);
          }
          if (this.flight_queue.length > 0) {
            this.schedule_flight_processor(FLIGHT_PACING_DELAY);
          }
        }
      };
      this.get_flights = async (player_id) => {
        log$f.debug(`get_flights called for ${player_id}`);
        if (!this.config.key) {
          return {
            player_id,
            current: null,
            recent_flights: []
          };
        }
        let cached = null;
        try {
          cached = await this.cache.get_flight(player_id);
        } catch (err) {
          log$f.error("Failed to query flight cache", err);
        }
        if (cached) {
          log$f.debug(`Flight cache hit for player ${player_id}`);
          if (cached.rechecking) {
            const now = Date.now();
            if (cached.recheck_until && now >= cached.recheck_until) {
              log$f.debug(
                `Rechecking window expired for player ${player_id}. Finalizing no data.`
              );
              const final_response = {
                player_id: cached.player_id,
                current: null,
                recent_flights: cached.recent_flights,
                rechecking: false
              };
              try {
                await this.cache.update_flight(
                  final_response,
                  FINALIZED_NO_FLIGHT_TTL
                );
              } catch (err) {
                log$f.error("Failed to finalize flight cache", err);
              }
              return final_response;
            }
            if (cached.next_retry_at && now >= cached.next_retry_at) {
              log$f.debug(
                `Retrying API call for player ${player_id} during recheck window`
              );
              const result2 = await this.enqueue_flight_api(
                player_id,
                cached.recheck_until
              );
              return result2;
            }
            return {
              player_id: cached.player_id,
              current: cached.current,
              recent_flights: cached.recent_flights,
              rechecking: true,
              next_retry_at: cached.next_retry_at,
              recheck_until: cached.recheck_until
            };
          }
          return {
            player_id: cached.player_id,
            current: cached.current,
            recent_flights: cached.recent_flights
          };
        }
        log$f.debug(`Flight cache miss for player ${player_id}. Querying API paced.`);
        const result = await this.enqueue_flight_api(player_id);
        return result;
      };
      this.complete = () => {
        this.process_cache();
      };
      this.enqueue_cache = (player_id) => {
        log$f.debug(`Enqueuing cache ${player_id}`);
        this.cache_queue.add(player_id);
        this.schedule_cache();
      };
      this.schedule_cache = () => {
        if (this.cache_timer) {
          log$f.debug(`schedule_cache called but job already scheduled`);
          return;
        }
        log$f.debug(
          `schedule_cache called and job scheduled for ${this.cache_delay} ms`
        );
        this.cache_timer = this.schedule(this.process_cache, this.cache_delay);
      };
      this.process_cache = async () => {
        if (this.cache_timer) {
          this.clear(this.cache_timer);
          this.cache_timer = null;
        }
        const ids = Array.from(this.cache_queue);
        this.cache_queue.clear();
        if (ids.length <= 0) {
          return;
        }
        let results;
        try {
          results = await this.cache.get(ids);
        } catch (_) {
          results = new Map();
        }
        log$f.debug(`Received ${results.size} cache results`);
        for (const id of ids) {
          const v = results.get(id);
          if (v) {
            log$f.debug("Id", id, "found in cache. Resolving value.");
            this.resolve(id, v);
          } else {
            log$f.debug("Id", id, "not found in cache. Scheduling api call.");
            this.enqueue_api(id);
          }
        }
      };
      this.clear_cache = () => {
        this.cache.delete_db().catch((err) => {
          log$f.error("Failed to delete IndexedDB cache", err);
        });
        check_key_status.clear();
      };
      this.enqueue_api = (player_id) => {
        log$f.debug(`Enqueuing api ${player_id}`);
        this.api_queue.add(player_id);
        this.schedule_api();
      };
      this.schedule_api = (delay = this.api_initial_delay) => {
        if (this.api_timer) {
          log$f.debug(`schedule_api called but job already scheduled`);
          return;
        }
        log$f.debug(`schedule_api called and job scheduled for ${delay} ms`);
        this.api_timer = this.schedule(this.process_api, delay);
      };
      this.process_api = async () => {
        log$f.debug("process_api called");
        if (this.api_timer) {
          this.clear(this.api_timer);
          this.api_timer = null;
        }
        let ids = Array.from(this.api_queue);
        if (ids.length > this.api_max_batch_size) {
          ids = ids.slice(0, this.api_max_batch_size);
        }
        for (const id of ids) {
          this.api_queue.delete(id);
        }
        log$f.debug(`Processing ${ids} api requests`);
        if (ids.length <= 0) {
          log$f.debug("No ids found to query");
          return;
        }
        let next_run = this.api_default_delay;
        let results;
        try {
          log$f.debug(`Calling query_stats with key=*** ids=[${ids}]`);
          results = await query_stats(this.config.key, ids);
        } catch (err) {
          log$f.error("Received error response querying ffscouter api:", err);
          for (const id of ids) {
            this.reject(id, err);
          }
          const ff_error = err;
          results = {
            result: new Map(),
            blank: true,
            limits: ff_error.ff_api_limits
          };
        }
        log$f.debug(
          `Received api results: blank=${results.blank}, count=${results.result.size}`
        );
        if (results.blank) {
          for (const id of ids) {
            this.requeue_api(id);
          }
        } else {
          try {
            await this.cache.update(Array.from(results.result.values()));
          } catch (err) {
            log$f.error("Failed to update cache", err);
          }
          for (const id of ids) {
            const v = results.result.get(id);
            if (v) {
              log$f.debug("Id", id, "found in results. Resolving value.");
              this.resolve(id, v);
            } else {
              log$f.debug("Id", id, "not found in results. Resolving no_data.");
              this.resolve(id, { player_id: id, no_data: true });
            }
          }
        }
        if (results.limits) {
          this.last_limits = results.limits;
          next_run = this.calculate_next_api_run(results.limits);
        }
        this.schedule_api(next_run);
        try {
          await this.cache.clean_expired();
        } catch (err) {
          log$f.error("Failed to clean expired cache entries", err);
        }
      };
      this.calculate_next_api_run = (limits) => {
        if (limits.remaining <= 0) {
          return limits.reset_time.getTime() - Date.now();
        } else if (limits.reset_time < new Date()) {
          return this.api_initial_delay;
        } else if (limits.rate_limit * 0.75 < limits.remaining) {
          return this.api_default_delay;
        } else {
          const ms_left = limits.reset_time.getTime() - Date.now();
          return ms_left / limits.remaining;
        }
      };
      this.resolve = (id, value) => {
        const entry = this.pending.get(id);
        if (!entry) return;
        entry.resolve(value);
        this.pending.delete(id);
      };
      this.reject = (id, err) => {
        const entry = this.pending.get(id);
        if (!entry) return;
        entry.reject(err);
        this.pending.delete(id);
      };
      this.requeue_api = (id) => {
        const entry = this.pending.get(id);
        if (!entry) return;
        entry.api_attempts++;
        if (entry.api_attempts > this.api_attempts) {
          this.reject(
            id,
            new Error(`Too many failed attempts to get stats for ${id}.`)
          );
          return false;
        }
        this.enqueue_api(id);
        return true;
      };
      this.add_analytics_entry = async (feature, player_id, status) => {
        if (!this.config.analytics_enabled) {
          return;
        }
        try {
          const url = window.location.origin + window.location.pathname;
          const params = window.location.search;
          const hash = window.location.hash;
          await this.cache.add_analytics({
            feature,
            player_id,
            status,
            url,
            params,
            hash
          });
        } catch (err) {
          log$f.error("Failed to add analytics entry", err);
        }
      };
      this.get_analytics_entries = async () => {
        try {
          return await this.cache.get_analytics();
        } catch (err) {
          log$f.error("Failed to get analytics entries", err);
          return [];
        }
      };
      this.get_aggregated_analytics = async () => {
        const entries = await this.get_analytics_entries();
        const aggregationMap = new Map();
        for (const entry of entries) {
          let param = "";
          if (entry.params) {
            param = getParamFast(entry.params, "sid") || getParamFast(entry.params, "step") || "";
          }
          if (!param && entry.hash) {
            let hashClean = entry.hash;
            if (hashClean.startsWith("#/")) {
              hashClean = hashClean.substring(2);
            } else if (hashClean.startsWith("#") || hashClean.startsWith("/")) {
              hashClean = hashClean.substring(1);
            }
            if (!hashClean.startsWith("!") && !hashClean.startsWith("?")) {
              hashClean = `?${hashClean}`;
            }
            param = getParamFast(hashClean, "sid") || getParamFast(hashClean, "step") || "";
          }
          const key = `${entry.url}|${param}|${entry.feature}|${entry.status}`;
          const existing = aggregationMap.get(key);
          if (existing) {
            existing.count++;
          } else {
            aggregationMap.set(key, {
              url: entry.url,
              param: param || "-",
              feature: entry.feature,
              status: entry.status,
              count: 1
            });
          }
        }
        return Array.from(aggregationMap.values());
      };
      this.clear_analytics = async () => {
        try {
          await this.cache.clear_analytics();
        } catch (err) {
          log$f.error("Failed to clear analytics entries", err);
        }
      };
      this.config = config;
      if (cache) {
        this.cache = cache;
      }
    }
    get analytics_enabled() {
      return this.config.analytics_enabled;
    }
  }
  const ffscouter = new FFScouter(ffconfig);
  const unit = Object.create(null);
  const m = 6e4, h = m * 60, d = h * 24, y = d * 365.25;
  unit.year = unit.yr = unit.y = y;
  unit.month = unit.mo = unit.mth = y / 12;
  unit.week = unit.wk = unit.w = d * 7;
  unit.day = unit.d = d;
  unit.hour = unit.hr = unit.h = h;
  unit.minute = unit.min = unit.m = m;
  unit.second = unit.sec = unit.s = 1e3;
  unit.millisecond = unit.millisec = unit.ms = 1;
  unit.microsecond = unit.microsec = unit.us = unit.µs = 1e-3;
  unit.nanosecond = unit.nanosec = unit.ns = 1e-6;
  unit.group = ",";
  unit.decimal = ".";
  unit.placeholder = " _";
  const durationRE = /((?:\d{1,16}(?:\.\d{1,16})?|\.\d{1,16})(?:[eE][-+]?\d{1,4})?)\s?([\p{L}]{0,14})/gu;
  parse.unit = unit;
  function parse(str = "", format = "ms") {
    let result = null, prevUnits;
    String(str).replace(new RegExp(`(\\d)[${parse.unit.placeholder}${parse.unit.group}](\\d)`, "g"), "$1$2").replace(parse.unit.decimal, ".").replace(durationRE, (_, n, units) => {
      if (!units) {
        if (prevUnits) {
          for (const u in parse.unit) if (parse.unit[u] < prevUnits) {
            units = u;
            break;
          }
        } else units = format;
      } else units = units.toLowerCase();
      prevUnits = units = parse.unit[units] || parse.unit[units.replace(/s$/, "")];
      if (units) result = (result || 0) + n * units;
    });
    return result && result / (parse.unit[format] || 1) * (str[0] === "-" ? -1 : 1);
  }
  const HOUR = 60 * 60;
  const DAY = HOUR * 24;
  const OLD_ESTIMATE_INTERVAL = 14 * DAY;
  function get_source_marker(source) {
    switch (source) {
      case "spies":
        return { icon: "spy", label: "Faction spy data" };
      case "premium":
        return { icon: "premium", label: "Premium data" };
      case "bss":
        return null;
    }
  }
  const SOURCE_MARKER_VIEWBOX = "0 0 20 20";
  const SPY_ICON_LENS = { cx: 8, cy: 8, r: 5 };
  const SPY_ICON_HANDLE = { x1: 12, y1: 12, x2: 18, y2: 18 };
  const SPY_ICON_COLOR = "#4a90d9";
  const PREMIUM_ICON_PATH_D = "M10,1 L12.47,6.6 L18.56,7.22 L13.99,11.3 L15.29,17.28 L10,14.2 L4.71,17.28 L6.01,11.3 L1.44,7.22 L7.53,6.6 Z";
  const PREMIUM_ICON_COLOR = "#d4af37";
  function format_ff_score(d2) {
    const ff = extract_ff(d2).toFixed(2);
    const now = Date.now() / 1e3;
    const age = now - extract_last_updated(d2);
    var suffix = "";
    if (age > OLD_ESTIMATE_INTERVAL) {
      suffix = "?";
    }
    return `${ff}${suffix}`;
  }
  function format_difficulty_text(d2) {
    const ff = extract_ff(d2);
    if (ff <= 1) {
      return "Extremely easy";
    } else if (ff <= 2) {
      return "Easy";
    } else if (ff <= 3.5) {
      return "Moderately difficult";
    } else if (ff <= 4.5) {
      return "Difficult";
    } else {
      return "May be impossible";
    }
  }
  function format_relative_time(timestamp_sec) {
    const age = Date.now() / 1e3 - timestamp_sec;
    if (age < DAY) {
      return "";
    } else if (age < 31 * DAY) {
      const days = Math.round(age / DAY);
      if (days === 1) {
        return "(1 day old)";
      } else {
        return `(${days} days old)`;
      }
    } else if (age < 365 * DAY) {
      const months = Math.round(age / (31 * DAY));
      if (months === 1) {
        return "(1 month old)";
      } else {
        return `(${months} months old)`;
      }
    } else {
      const years = Math.round(age / (365 * DAY));
      if (years === 1) {
        return "(1 year old)";
      } else {
        return `(${years} years old)`;
      }
    }
  }
  function get_ff_colour(d2) {
    return get_ff_arrow_colour(d2);
  }
  const FF_ARROW_VIEWBOX = "0 0 20 13";
  const FF_ARROW_PATH_D = "M 0,0 H 13 20 L 10,12 Z";
  const NO_DATA_COLOR = "#000000";
  const BUILTIN_PALETTES = {

[ColorScheme.CLASSIC]: [
      "#1734e8",
      "#1788e8",
      "#17dbe8",
      "#17e8a1",
      "#17e84e",
      "#34e817",
      "#88e817",
      "#dbe817",
      "#e8a117",
      "#e84e17",
      "#e81734"
    ],

[ColorScheme.COOL_DIVERGING]: [
      "#2166ac",
      "#2080a2",
      "#1f9497",
      "#1e8d75",
      "#1c8254",
      "#1b7837",
      "#2e8b1e",
      "#6c9e21",
      "#b1aa23",
      "#c47525",
      "#d73027"
    ],
[ColorScheme.NEON]: [
      "#0c50ff",
      "#0cb1ff",
      "#0cffec",
      "#0cff8a",
      "#0cff29",
      "#50ff0c",
      "#b1ff0c",
      "#ffec0c",
      "#ff8a0c",
      "#ff290c",
      "#ff0c50"
    ],

[ColorScheme.COLORBLIND_SAFE]: [
      "#440154",
      "#481a6c",
      "#472f7d",
      "#414487",
      "#39568c",
      "#2a788e",
      "#21908d",
      "#22a884",
      "#42be71",
      "#a8db34",
      "#fde725"
    ],
[ColorScheme.GRAYSCALE]: [
      "#f0f0f0",
      "#e0e0e0",
      "#cccccc",
      "#b3b3b3",
      "#999999",
      "#808080",
      "#666666",
      "#4d4d4d",
      "#333333",
      "#1a1a1a",
      "#000000"
    ],



[ColorScheme.GREEN_YELLOW_RED]: [
      "#73bf69",
      "#8ec55c",
      "#a9cb50",
      "#c4d243",
      "#dfd837",
      "#fade2a",
      "#f8c034",
      "#f7a23e",
      "#f58548",
      "#f46752",
      "#f2495c"
    ],



[ColorScheme.BLUE_YELLOW_RED]: [
      "#1f60c4",
      "#4c7ebb",
      "#799db3",
      "#a5bbaa",
      "#d2daa2",
      "#fff899",
      "#f3cb83",
      "#e79e6d",
      "#dc7056",
      "#d04340",
      "#c4162a"
    ],

[ColorScheme.PLASMA]: [
      "#0d0887",
      "#41049d",
      "#6a00a8",
      "#8f0da4",
      "#b12a90",
      "#cc4778",
      "#e16462",
      "#f2844b",
      "#fca636",
      "#fcce25",
      "#f0f921"
    ]
  };
  function is_valid_custom_palette(colors) {
    return colors !== null && colors.length === 11 && colors.every((c) => typeof c === "string");
  }
  function get_palette_for_scheme(scheme, customColors = null) {
    if (scheme === ColorScheme.CUSTOM) {
      if (is_valid_custom_palette(customColors)) {
        return customColors;
      }
      return BUILTIN_PALETTES[ColorScheme.CLASSIC];
    }
    return BUILTIN_PALETTES[scheme];
  }
  function get_active_palette() {
    return get_palette_for_scheme(ffconfig.color_scheme, ffconfig.custom_colors);
  }
  function get_ff_arrow_colour(d2) {
    if (d2.no_data) {
      return NO_DATA_COLOR;
    }
    let ff = extract_ff(d2);
    if (ff < 1) {
      ff = 1;
    } else if (ff > 5) {
      ff = 5;
    }
    const ratio = Math.floor((ff - 1) / 4 * 10);
    const r = get_active_palette()[ratio];
    return r ?? NO_DATA_COLOR;
  }
  function get_contrast_color(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const brightness = r * 0.299 + g * 0.587 + b * 0.114;
    return brightness > 126 ? "black" : "white";
  }
  function ff_to_percent(d2) {
    const low_ff = ffconfig.low_ff_range;
    const high_ff = ffconfig.high_ff_range;
    const max_ff = ffconfig.max_ff_range;
    const low_mid_percent = 33;
    const mid_high_percent = 66;
    const ff_lower = Math.min(extract_ff(d2), max_ff);
    let percent;
    if (ff_lower < low_ff) {
      percent = (ff_lower - 1) / (low_ff - 1) * low_mid_percent;
    } else if (ff_lower < high_ff) {
      percent = (ff_lower - low_ff) / (high_ff - low_ff) * (mid_high_percent - low_mid_percent) + low_mid_percent;
    } else {
      percent = (ff_lower - high_ff) / (max_ff - high_ff) * (100 - mid_high_percent) + mid_high_percent;
    }
    return percent;
  }
  function format_timestamp(ts) {
    const d2 = new Date(ts * 1e3);
    return `${d2.getHours() < 10 ? "0" : ""}${d2.getHours()}:${d2.getMinutes() < 10 ? "0" : ""}${d2.getMinutes()}:${d2.getSeconds() < 10 ? "0" : ""}${d2.getSeconds()} - ${d2.getDate() < 10 ? "0" : ""}${d2.getDate()}/${d2.getMonth() + 1 < 10 ? "0" : ""}${d2.getMonth() + 1}/${d2.getFullYear() - 2e3}`;
  }
  function parse_suffix_number(valStr) {
    const trimmed = valStr.trim().toLowerCase();
    if (!trimmed) return null;
    const match = trimmed.match(/^([\d.,]+)\s*([kmbt])?$/);
    if (!match) return null;
    const matchStr = match[1];
    if (!matchStr) return null;
    const num = Number(matchStr.replace(/,/g, ""));
    if (Number.isNaN(num)) return null;
    const suffix = match[2];
    if (!suffix) return num;
    const multiplier = {
      k: 1e3,
      m: 1e6,
      b: 1e9,
      t: 1e12
    };
    return num * (multiplier[suffix] ?? 1);
  }
  function parse_duration_to_seconds(valStr) {
    const trimmed = valStr.trim();
    if (!trimmed) return null;
    return parse(trimmed, "s");
  }
  new Proxy({}, {
    get(_, prop) {
      return getReact()[prop];
    }
  });
  const useState = ((...args) => getReact().useState(
    ...args
  ));
  const useEffect = ((...args) => getReact().useEffect(
    ...args
  ));
  const useRef = ((...args) => getReact().useRef(
    ...args
  ));
  const useImperativeHandle = ((...args) => getReact().useImperativeHandle(
    ...args
  ));
  const createElement = ((...args) => getReact().createElement(
    ...args
  ));
  new Proxy(
    {},
    {
      get: (_, prop) => getReact().Fragment[prop]
    }
  );
  new Proxy(
    {},
    {
      get: (_, prop) => getReact().StrictMode[prop]
    }
  );
  new Proxy(
    {},
    {
      get: (_, prop) => getReact().Suspense[prop]
    }
  );
  new Proxy(
    {},
    {
      get: (_, prop) => getReact().Children[prop]
    }
  );
  const styles$2 = {
    "ffscouter-info-line__label": "_ffscouter-info-line__label_xi5zk_1",
    "ffscouter-info-line__badge": "_ffscouter-info-line__badge_xi5zk_8",
    "ffscouter-info-line__premium-upgrade": "_ffscouter-info-line__premium-upgrade_xi5zk_15"
  };
  function SourceMarkerIcon({ marker, className }) {
    return jsxs(
      "svg",
      {
        className: className ?? "ffscouter-inline-source-marker",
        viewBox: SOURCE_MARKER_VIEWBOX,
        role: "img",
        "aria-label": marker.label,
        children: [
jsx("title", { children: marker.label }),
          marker.icon === "spy" ? jsxs(Fragment, { children: [
jsx(
              "circle",
              {
                cx: SPY_ICON_LENS.cx,
                cy: SPY_ICON_LENS.cy,
                r: SPY_ICON_LENS.r,
                fill: SPY_ICON_COLOR,
                stroke: "#000000",
                strokeWidth: 1.5
              }
            ),
jsx(
              "line",
              {
                x1: SPY_ICON_HANDLE.x1,
                y1: SPY_ICON_HANDLE.y1,
                x2: SPY_ICON_HANDLE.x2,
                y2: SPY_ICON_HANDLE.y2,
                stroke: "#000000",
                strokeWidth: 2.5,
                strokeLinecap: "round"
              }
            )
          ] }) : jsx(
            "path",
            {
              d: PREMIUM_ICON_PATH_D,
              fill: PREMIUM_ICON_COLOR,
              stroke: "#000000",
              strokeWidth: 1.2,
              strokeLinejoin: "round"
            }
          )
        ]
      }
    );
  }
  const log$e = logger.child("ui");
  const PREMIUM_UPGRADE_URL$1 = "https://ffscouter.com/premium";
  function FFHeaderLine({ playerId }) {
    const [data, setData] = useState(null);
    const [isPremium, setIsPremium] = useState(null);
    const [premiumLoading, setPremiumLoading] = useState(false);
    useEffect(() => {
      let cancelled = false;
      ffscouter.get(playerId).then((result) => {
        if (!cancelled) setData(result);
      }).catch((err) => {
        log$e.error(err);
      });
      return () => {
        cancelled = true;
      };
    }, [playerId]);
    useEffect(() => {
      if (!data) return;
      setPremiumLoading(true);
      let cancelled = false;
      check_key_status.is_premium().then((premium) => {
        if (!cancelled) setIsPremium(premium);
      }).catch((err) => {
        log$e.error(err);
      }).finally(() => {
        if (!cancelled) setPremiumLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }, [data]);
    if (data === null) {
      return jsxs(Fragment, { children: [
jsx("span", { className: styles$2["ffscouter-info-line__label"], children: "FairFight:" }),
jsx("span", { style: { fontStyle: "italic" }, children: "Loading..." })
      ] });
    }
    if (data.no_data) {
      return jsxs(Fragment, { children: [
jsx("span", { className: styles$2["ffscouter-info-line__label"], children: "FairFight:" }),
jsx(
          "span",
          {
            className: styles$2["ffscouter-info-line__badge"],
            style: { background: "#444", color: "#fff" },
            children: "No data"
          }
        )
      ] });
    }
    const ffString = format_ff_score(data);
    const difficulty = format_difficulty_text(data);
    const fresh = format_relative_time(extract_last_updated(data));
    const backgroundColor = get_ff_colour(data);
    const textColor = get_contrast_color(backgroundColor);
    const sourceMarker = get_source_marker(extract_source(data));
    let extraDetailsLine = null;
    if (data.distribution?.distribution_human) {
      const ageStr = format_relative_time(data.distribution.last_updated);
      extraDetailsLine = jsxs(
        "span",
        {
          style: {
            display: "block",
            marginTop: "2px",
            fontSize: "12px",
            fontStyle: "normal"
          },
          children: [
jsx("span", { className: styles$2["ffscouter-info-line__label"], children: "Top Stats:" }),
jsxs("span", { style: { fontWeight: "normal" }, children: [
              data.distribution.distribution_human,
              " ",
              ageStr
            ] })
          ]
        }
      );
    } else if (premiumLoading) {
      extraDetailsLine = null;
    } else if (isPremium === false && data.premium_insights_available) {
      extraDetailsLine = jsx("span", { className: styles$2["ffscouter-info-line__premium-upgrade"], children: jsx(
        "a",
        {
          href: PREMIUM_UPGRADE_URL$1,
          target: "_blank",
          rel: "noopener noreferrer",
          style: { fontWeight: "bold", textDecoration: "underline" },
          children: "Premium Data Available - Upgrade To View"
        }
      ) });
    }
    return jsxs(Fragment, { children: [
jsx("span", { className: styles$2["ffscouter-info-line__label"], children: "FairFight:" }),
jsxs(
        "span",
        {
          className: styles$2["ffscouter-info-line__badge"],
          style: { background: backgroundColor, color: textColor },
          children: [
            ffString,
            " (",
            difficulty,
            ") ",
            fresh
          ]
        }
      ),
      sourceMarker && jsx(SourceMarkerIcon, { marker: sourceMarker }),
jsxs(
        "span",
        {
          style: {
            fontSize: "11px",
            fontWeight: "normal",
            marginLeft: "6px",
            verticalAlign: "middle",
            fontStyle: "italic"
          },
          children: [
            "Est. Stats: ",
jsx("span", { children: extract_bs_estimate_human(data) })
          ]
        }
      ),
      extraDetailsLine
    ] });
  }
  const log$d = logger.child("dom");
  const ID_PARAMS = ["XID", "user2ID"];
  var GaugeAttachMode = ((GaugeAttachMode2) => {
    GaugeAttachMode2["HONOR_BAR"] = "honor-bar";
    GaugeAttachMode2["FALLBACK"] = "fallback";
    return GaugeAttachMode2;
  })(GaugeAttachMode || {});
  function extract_id_from_url(url) {
    const parsed = new URL(url);
    const search = new URLSearchParams(parsed.search);
    for (const param of ID_PARAMS) {
      const v = search.get(param);
      if (v) {
        return parseInt(v, 10);
      }
    }
    return null;
  }
  function torn_page(page, params = {}, match_hash = []) {
    const url_match = window.location.href.startsWith(
      `https://www.torn.com/${page}.php`
    );
    if (!url_match) {
      return false;
    }
    const search = new URLSearchParams(window.location.search);
    let sid_match = true;
    let step_match = true;
    let page_match = true;
    if (params.sid) {
      const page_sid = search.get("sid");
      sid_match = page_sid !== null && params.sid === page_sid;
    }
    if (params.step) {
      const page_step = search.get("step");
      step_match = page_step !== null && params.step === page_step;
    }
    if (params.page) {
      const page_page = search.get("page");
      page_match = page_page !== null && params.page === page_page;
    }
    if (!sid_match || !step_match || !page_match) {
      return false;
    }
    let hash_match = false;
    if (match_hash.length === 0) {
      hash_match = true;
    } else {
      const hash = window.location.hash;
      for (const h2 of match_hash) {
        if (h2.endsWith("*")) {
          const stripped = h2.substring(0, h2.length - 1);
          if (hash.startsWith(stripped)) {
            hash_match = true;
            break;
          }
        }
        if (hash === h2) {
          hash_match = true;
          break;
        }
      }
    }
    return sid_match && step_match && page_match && hash_match;
  }
  function make_arrow(d2) {
    const fill = get_ff_arrow_colour(d2);
    const div = document.createElement("div");
    div.innerHTML = `<svg version="1.2" id="Layer_1" x="0px" y="0px" width="20" height="13" viewBox="${FF_ARROW_VIEWBOX}" xml:space="preserve" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg">
	<path fill-rule="evenodd" fill="${fill}" stroke="#000000" d="${FF_ARROW_PATH_D}" id="path1" style="display:inline;stroke-width:${ffconfig.gauge_marker_border_width};"/>
</svg>`;
    if (!div.firstChild || !(div.firstChild instanceof SVGElement)) {
      throw new Error(
        "Wasn't able to extract just created SVG out of div element"
      );
    }
    const svg = div.firstChild;
    svg.classList.add("ffscouter-arrow");
    return svg;
  }
  function make_source_marker_svg(marker, className) {
    const div = document.createElement("div");
    const inner = marker.icon === "spy" ? `<circle cx="${SPY_ICON_LENS.cx}" cy="${SPY_ICON_LENS.cy}" r="${SPY_ICON_LENS.r}" fill="${SPY_ICON_COLOR}" stroke="#000000" stroke-width="1.5" />
         <line x1="${SPY_ICON_HANDLE.x1}" y1="${SPY_ICON_HANDLE.y1}" x2="${SPY_ICON_HANDLE.x2}" y2="${SPY_ICON_HANDLE.y2}" stroke="#000000" stroke-width="2.5" stroke-linecap="round" />` : `<path d="${PREMIUM_ICON_PATH_D}" fill="${PREMIUM_ICON_COLOR}" stroke="#000000" stroke-width="1.2" stroke-linejoin="round" />`;
    div.innerHTML = `<svg class="${className}" viewBox="${SOURCE_MARKER_VIEWBOX}" role="img" aria-label="${marker.label}">
    <title>${marker.label}</title>
    ${inner}
  </svg>`;
    if (!div.firstChild || !(div.firstChild instanceof SVGElement)) {
      throw new Error(
        "Wasn't able to extract source marker SVG out of div element"
      );
    }
    return div.firstChild;
  }
  function make_source_marker_badge(d2) {
    const marker = get_source_marker(extract_source(d2));
    if (!marker) {
      return null;
    }
    return make_source_marker_svg(marker, "ffscouter-source-marker");
  }
  const BUBBLE_FONT_SIZE_PX = 8.5;
  const BUBBLE_MIN_WIDTH_EM = 2.5882;
  const BUBBLE_PADDING_EM = 0.4706;
  const BUBBLE_FONT_FAMILY = "Geneva, Arial, sans-serif";
  const BUBBLE_WIDTH_SAFETY_PX = 1;
  let measure_canvas_ctx;
  function get_measure_canvas_ctx() {
    if (measure_canvas_ctx === void 0) {
      measure_canvas_ctx = document.createElement("canvas").getContext("2d");
    }
    return measure_canvas_ctx;
  }
  const bubble_width_cache = new Map();
  function measure_bubble_width(text) {
    const scale = ffconfig.gauge_marker_scale / 100;
    const border_width = ffconfig.gauge_marker_border_width * scale;
    const cache_key = `${text}|${scale}|${border_width}`;
    const cached = bubble_width_cache.get(cache_key);
    if (cached !== void 0) {
      return cached;
    }
    const font_size = BUBBLE_FONT_SIZE_PX * scale;
    const ctx = get_measure_canvas_ctx();
    let text_width = 0;
    if (ctx) {
      ctx.font = `bold ${font_size}px ${BUBBLE_FONT_FAMILY}`;
      text_width = ctx.measureText(text).width;
    }
    const padding = BUBBLE_PADDING_EM * font_size;
    const min_width = BUBBLE_MIN_WIDTH_EM * font_size;
    const width = Math.max(min_width, text_width + padding * 2) + border_width * 2 + BUBBLE_WIDTH_SAFETY_PX;
    bubble_width_cache.set(cache_key, width);
    return width;
  }
  function measure_marker_width(marker) {
    const bubble = marker.querySelector(".ffscouter-bubble");
    if (!bubble) {
      return null;
    }
    return measure_bubble_width(bubble.textContent ?? "");
  }
  function make_marker(d2) {
    const markerType = ffconfig.gauge_marker_type;
    let shape;
    if (markerType === GaugeMarkerType.BUBBLE_FF || markerType === GaugeMarkerType.BUBBLE_ESTIMATE) {
      const fill = get_ff_arrow_colour(d2);
      const contrastColor = get_contrast_color(fill);
      const bubble = document.createElement("div");
      bubble.classList.add("ffscouter-bubble");
      bubble.style.backgroundColor = fill;
      bubble.style.color = contrastColor;
      bubble.style.borderWidth = `${ffconfig.gauge_marker_border_width * (ffconfig.gauge_marker_scale / 100)}px`;
      if (markerType === GaugeMarkerType.BUBBLE_FF) {
        bubble.textContent = extract_ff(d2).toFixed(2);
      } else {
        bubble.textContent = extract_bs_estimate_human(d2) || "N/A";
      }
      shape = bubble;
    } else {
      shape = make_arrow(d2);
    }
    const wrapper = document.createElement("div");
    wrapper.classList.add("ffscouter-marker-wrapper");
    wrapper.appendChild(shape);
    const badge = make_source_marker_badge(d2);
    if (badge) {
      wrapper.appendChild(badge);
    }
    return wrapper;
  }
  function add_ff_arrow(element, featureName, attachMode) {
    const player_id = get_player_id_in_element(element);
    if (!player_id) {
      return;
    }
    if (element.querySelector(".ffscouter-gauge") || element.classList.contains("ffscouter-gauge")) {
      ffscouter.add_analytics_entry(featureName, player_id, "ignored");
      return;
    }
    ffscouter.get(player_id).then((d2) => {
      if (d2.no_data) {
        return;
      }
      if (element.querySelector(".ffscouter-gauge") || element.classList.contains("ffscouter-gauge")) {
        ffscouter.add_analytics_entry(featureName, player_id, "ignored");
        return;
      }
      const percent = ff_to_percent(d2);
      element.classList.add("ffscouter-gauge");
      element.style.setProperty("--band-percent", `${percent}`);
      element.setAttribute("data-ffscouter-attach-mode", attachMode);
      element.setAttribute(
        "data-ffscouter-band-side",
        percent > 50 ? "right" : "left"
      );
      document.body.style.setProperty(
        "--ffscouter-marker-scale",
        `${ffconfig.gauge_marker_scale / 100}`
      );
      const existing = element.querySelector(".ffscouter-marker-wrapper");
      if (existing) {
        existing.remove();
      }
      const marker = element.appendChild(make_marker(d2));
      const width = measure_marker_width(marker);
      if (width !== null) {
        element.style.setProperty(
          "--ffscouter-marker-actual-width",
          `${width}px`
        );
      }
      ffscouter.add_analytics_entry(featureName, player_id, "applied");
    }).catch((err) => {
      log$d.error(err);
    });
  }
  function has_href(el) {
    return el instanceof HTMLAnchorElement;
  }
  function extract_target_id(href, r) {
    const match = href.match(r);
    const groups = match?.groups;
    if (groups?.target_id) {
      return parseInt(groups.target_id, 10);
    }
    return null;
  }
  function get_player_id_in_element(element) {
    const parent = element.parentElement;
    if (has_href(parent)) {
      const xid = extract_target_id(parent.href, /.*XID=(?<target_id>\d+)/);
      if (xid) {
        return xid;
      }
    }
    const anchors = element.getElementsByTagName("a");
    for (const anchor of anchors) {
      const xid = extract_target_id(anchor.href, /.*XID=(?<target_id>\d+)/);
      if (xid) {
        return xid;
      }
      const userid = extract_target_id(anchor.href, /.*userId=(?<target_id>\d+)/);
      if (userid) {
        return userid;
      }
    }
    if (has_href(element)) {
      const xid = extract_target_id(element.href, /.*XID=(?<target_id>\d+)/);
      if (xid) {
        return xid;
      }
      const userid = extract_target_id(
        element.href,
        /.*userId=(?<target_id>\d+)/
      );
      if (userid) {
        return userid;
      }
    }
    const parent_anchor = element.closest("a");
    if (parent_anchor) {
      const xid = extract_target_id(
        parent_anchor.href,
        /.*XID=(?<target_id>\d+)/
      );
      if (xid) {
        return xid;
      }
      const userid = extract_target_id(
        parent_anchor.href,
        /.*userId=(?<target_id>\d+)/
      );
      if (userid) {
        return userid;
      }
    }
    return null;
  }
  const seenUnknownActivityLabels = new Set();
  function get_activity_status(row) {
    const wrap2 = row.querySelector('[class*="userStatusWrap"]');
    const label = wrap2?.getAttribute("aria-label") || "";
    const match = label.match(/ is (online|offline|idle)$/i);
    const status = match?.[1];
    if (!status) {
      if (!seenUnknownActivityLabels.has(label)) {
        seenUnknownActivityLabels.add(label);
        log$d.warn(`Unrecognized activity aria-label: "${label}"`);
      }
      return "unknown";
    }
    return status.toLowerCase();
  }
  function apply_ff_gauge_selector(node_list, featureName, attachMode) {
    for (const node of node_list) {
      add_ff_arrow(node, featureName, attachMode);
    }
  }
  function apply_ff_gauge(element, featureName, attachMode) {
    if (!(element instanceof HTMLElement)) {
      return;
    }
    add_ff_arrow(element, featureName, attachMode);
  }
  async function wait_for_element(querySelector, timeout, root) {
    const existingElement = document.querySelector(querySelector);
    if (existingElement) return existingElement;
    return new Promise((resolve) => {
      let timer;
      const observer = new MutationObserver(() => {
        const element = document.querySelector(querySelector);
        if (element) {
          cleanup();
          resolve(element);
        }
      });
      if (!root) {
        root = document.body;
      }
      observer.observe(root, {
        childList: true,
        subtree: true
      });
      if (timeout) {
        timer = setTimeout(() => {
          cleanup();
          resolve(null);
        }, timeout);
      }
      function cleanup() {
        observer.disconnect();
        if (timer) clearTimeout(timer);
      }
    });
  }
  async function wait_for_body(timeout) {
    const body = await wait_for_element(
      "body",
      timeout,
      document.documentElement
    );
    return body !== null;
  }
  const CREATE_ELEMENT_RETRY_DELAYS_MS = [0, 50, 150];
  async function create_ff_element(tagName) {
    const ctor = customElements.get(tagName);
    for (const delay of CREATE_ELEMENT_RETRY_DELAYS_MS) {
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      const element = document.createElement(tagName);
      if (!ctor || element instanceof ctor) {
        return element;
      }
      log$d.warn(`<${tagName}> construction produced a fallback element; retrying`);
    }
    log$d.error(
      `Failed to construct a working <${tagName}> after multiple attempts`
    );
    return null;
  }
  class MonitorElements {
    constructor(node_matcher, handler, root, continuous, options, _timeout) {
      this.options = {
        target: false,
        added: false,
        removed: false
      };
      this.started = false;
      this.timer = null;
      this.start = () => {
        if (this.started) {
          return;
        }
        let initial = false;
        for (const child of this.root.childNodes) {
          if (child instanceof HTMLElement && this.node_matcher(child)) {
            this.handler({ added: child });
            initial = true;
          }
        }
        if (!this.continuous && initial) {
          this.started = false;
          return;
        }
        this.observer.observe(this.root, { childList: true });
        this.timer = setInterval(() => {
          if (!this.root.isConnected) {
            this.cleanup();
          }
        }, 1e4);
        this.started = true;
      };
      this.cleanup = () => {
        this.observer.disconnect();
        if (this.timer) {
          clearInterval(this.timer);
        }
        this.timer = null;
      };
      this.node_matcher = node_matcher;
      this.handler = handler;
      this.root = root;
      this.continuous = continuous;
      this.options = options;
      this.observer = new MutationObserver(async (mutations) => {
        for (const mutation of mutations) {
          if (this.options.target && mutation.target instanceof HTMLElement && this.node_matcher(mutation.target)) {
            this.handler({ target: mutation.target });
          }
          if (this.options.added) {
            for (const node of mutation.addedNodes) {
              if (node instanceof HTMLElement && this.node_matcher(node)) {
                this.handler({ added: node });
              }
            }
          }
          if (this.options.removed) {
            for (const node of mutation.removedNodes) {
              if (node instanceof HTMLElement && this.node_matcher(node)) {
                this.handler({ removed: node });
              }
            }
          }
        }
      });
    }
  }
  async function getLocalUserId() {
    const name = await wait_for_element(
      ".settings-menu > .link > a:first-child",
      15e3
    );
    if (!name || !name.href) {
      log$d.debug("Failed to find the XID element.");
      return null;
    }
    try {
      const params = new URL(name.href).searchParams;
      return params.get("XID");
    } catch {
      log$d.debug("User XID is malformed");
      return null;
    }
  }
  function create_info_line() {
    const info_line = document.createElement("div");
    info_line.className = "ffscouter-info-line";
    info_line.style.display = "block";
    info_line.style.clear = "both";
    info_line.style.margin = "5px 0";
    return info_line;
  }
  function on_navigation(callback) {
    const nav = window.navigation;
    if (nav) {
      nav.addEventListener("currententrychange", callback);
      return () => {
        nav.removeEventListener("currententrychange", callback);
      };
    }
    const delayedCallback = () => {
      setTimeout(callback, 0);
    };
    window.addEventListener("popstate", delayedCallback);
    window.addEventListener("hashchange", delayedCallback);
    return () => {
      window.removeEventListener("popstate", delayedCallback);
      window.removeEventListener("hashchange", delayedCallback);
    };
  }
  function get_attack_url(playerId) {
    return `https://www.torn.com/page.php?sid=attack&user2ID=${playerId}`;
  }
  function open_attack_link(playerId, options) {
    const url = get_attack_url(playerId);
    const shouldOpenInNewTab = options?.openInNewTab !== void 0 ? options.openInNewTab : ffconfig.war_quick_attack_action === "new_tab";
    if (shouldOpenInNewTab) {
      window.open(url, "_blank");
    } else {
      window.location.href = url;
    }
  }
  const SORT_ICON_CLASS_SETS = {
    sortIcon___wbOOi: {
      sortIcon: "sortIcon___wbOOi",
      activeIcon: "activeIcon___wmLLe",
      desc: "desc___wkA0A",
      asc: "asc___y_atw"
    },
    sortIcon___LNQ9D: {
      sortIcon: "sortIcon___LNQ9D",
      activeIcon: "activeIcon___SwNJj",
      desc: "desc___ZvHWf",
      asc: "asc___YAXFZ"
    },
    sortIcon___pMyNX: {
      sortIcon: "sortIcon___pMyNX",
      activeIcon: "activeIcon___dw8TK",
      desc: "desc___TLpPc",
      asc: "asc___Q3bz5"
    }
  };
  function detect_sort_icon_classes(root) {
    const existing = root.querySelector(
      "[class*='sortIcon___']:not(.ffscouter-sort-icon)"
    );
    if (!existing) return null;
    const sortIcon = Array.from(existing.classList).find((c) => c.startsWith("sortIcon___")) ?? "";
    const classes = SORT_ICON_CLASS_SETS[sortIcon];
    if (!classes) return null;
    const tab = Array.from(existing.parentElement?.classList ?? []).find(
      (c) => c.startsWith("tab___")
    ) ?? "";
    return { ...classes, tab };
  }
  new Proxy({}, {
    get(_, prop) {
      return getReactDOM()[prop];
    }
  });
  const createRoot = ((...args) => getReactDOM().createRoot(...args));
  function mountComponent(element, parent) {
    const container = document.createElement("div");
    container.style.display = "contents";
    parent.appendChild(container);
    const root = createRoot(container);
    root.render(element);
    return root;
  }
  const log$c = logger.child("feature:attack");
  async function inject_info_line$1(info_line) {
    const h4 = await wait_for_element("h4", 1e4);
    if (!h4) {
      return;
    }
    h4.parentNode?.parentNode?.parentNode?.insertBefore(
      info_line,
      h4.parentNode?.parentNode?.nextSibling
    );
  }
  const index$d = {
    name: "Attack FF display",
    description: "Shows FF on top left of any attack page",
    executionTime: StartTime.DocumentBody,
    async shouldRun() {
      return torn_page("page", { sid: "attack" });
    },
    async run() {
      const player_id = extract_id_from_url(window.location.href);
      if (!player_id) {
        return;
      }
      log$c.debug("On the attack page, found player_id", player_id);
      const info_line = create_info_line();
      mountComponent(
        createElement(FFHeaderLine, { playerId: player_id }),
        info_line
      );
      inject_info_line$1(info_line);
    },
    httpIntercept: {
      before(_url, _init) {
        return void 0;
      },
      after(_bodyText, _response, _ctx) {
        return void 0;
      }
    }
  };
  const __vite_glob_0_0 = Object.freeze( Object.defineProperty({
    __proto__: null,
    default: index$d
  }, Symbol.toStringTag, { value: "Module" }));
  const _deprecatedStub = null;
  const __vite_glob_0_1 = Object.freeze( Object.defineProperty({
    __proto__: null,
    default: _deprecatedStub
  }, Symbol.toStringTag, { value: "Module" }));
  const styles$1 = {
    "ff-filter-box": "_ff-filter-box_ursux_1",
    "ff-filter-box--no-borders": "_ff-filter-box--no-borders_ursux_19",
    "ff-filter-box__header": "_ff-filter-box__header_ursux_52",
    "ff-filter-box__header-actions": "_ff-filter-box__header-actions_ursux_60",
    "ff-filter-box__action-btn": "_ff-filter-box__action-btn_ursux_66",
    "ff-filter-box__action-btn--active": "_ff-filter-box__action-btn--active_ursux_88",
    "ff-filter-box__action-btn--inactive": "_ff-filter-box__action-btn--inactive_ursux_93",
    "ff-filter-box__action-btn--reset": "_ff-filter-box__action-btn--reset_ursux_104",
    "ff-filter-box__grid": "_ff-filter-box__grid_ursux_114",
    "ff-filter-box__group--sort": "_ff-filter-box__group--sort_ursux_121",
    "ff-filter-box__group--level": "_ff-filter-box__group--level_ursux_125",
    "ff-filter-box__group--activity": "_ff-filter-box__group--activity_ursux_129",
    "ff-filter-box__group--status": "_ff-filter-box__group--status_ursux_133",
    "ff-filter-box__group--ff": "_ff-filter-box__group--ff_ursux_137",
    "ff-filter-box__group--stats": "_ff-filter-box__group--stats_ursux_141",
    "ff-filter-box__group--last-action": "_ff-filter-box__group--last-action_ursux_145",
    "ff-filter-box__group--columns": "_ff-filter-box__group--columns_ursux_149",
    "ff-filter-box__group": "_ff-filter-box__group_ursux_121",
    "ff-filter-box__sort-controls": "_ff-filter-box__sort-controls_ursux_171",
    "ff-filter-box__sort-btn": "_ff-filter-box__sort-btn_ursux_177",
    "ff-filter-box__compare-btn": "_ff-filter-box__compare-btn_ursux_181",
    "ff-filter-box__display-select": "_ff-filter-box__display-select_ursux_186",
    "ff-filter-box__options": "_ff-filter-box__options_ursux_197",
    "ff-filter-box__range-inputs": "_ff-filter-box__range-inputs_ursux_210"
  };
  const cls$1 = {
    box: styles$1["ff-filter-box"],
    boxNoBorders: styles$1["ff-filter-box--no-borders"],
    header: styles$1["ff-filter-box__header"],
    headerActions: styles$1["ff-filter-box__header-actions"],
    actionBtn: styles$1["ff-filter-box__action-btn"],
    actionBtnActive: styles$1["ff-filter-box__action-btn--active"],
    actionBtnInactive: styles$1["ff-filter-box__action-btn--inactive"],
    actionBtnReset: styles$1["ff-filter-box__action-btn--reset"],
    grid: styles$1["ff-filter-box__grid"],
    group: styles$1["ff-filter-box__group"],
    groupSort: styles$1["ff-filter-box__group--sort"],
    groupLevel: styles$1["ff-filter-box__group--level"],
    groupActivity: styles$1["ff-filter-box__group--activity"],
    groupStatus: styles$1["ff-filter-box__group--status"],
    groupFf: styles$1["ff-filter-box__group--ff"],
    groupStats: styles$1["ff-filter-box__group--stats"],
    groupLastAction: styles$1["ff-filter-box__group--last-action"],
    groupColumns: styles$1["ff-filter-box__group--columns"],
    sortControls: styles$1["ff-filter-box__sort-controls"],
    sortBtn: styles$1["ff-filter-box__sort-btn"],
    compareBtn: styles$1["ff-filter-box__compare-btn"],
    displaySelect: styles$1["ff-filter-box__display-select"],
    options: styles$1["ff-filter-box__options"],
    rangeInputs: styles$1["ff-filter-box__range-inputs"]
  };
  const DEFAULT_HIDDEN_COLUMNS = { level: false, status: false, score: false };
  const DEFAULT_STATE = {
    sortBy: "none",
    filterEnabled: true,
    activity: { online: true, idle: true, offline: true },
    status: {
      okay: true,
      traveling: true,
      hospital: true,
      jail: true,
      abroad: true,
      federal: true,
      fallen: true
    },
    levelMin: null,
    levelMax: null,
    ffMin: null,
    ffMax: null,
    statsMin: null,
    statsMax: null,
    lastActionMin: null,
    lastActionMax: null,
    hiddenColumns: DEFAULT_HIDDEN_COLUMNS
  };
  function getFilterBoxHandle(el) {
    if (!el) return null;
    return el.__ffHandle ?? null;
  }
  function isMobileView() {
    return typeof window !== "undefined" && window.innerWidth < 784;
  }
  function FFFactionFilterBox({
    mode,
    onFilterChange,
    ref,
    initialHasLastActionData = false,
    filteringDisabled = false,
    onReady
  }) {
    const [filterState, setFilterState] = useState(
      () => DEFAULT_STATE
    );
    const [collapsed, setCollapsed] = useState(
      () => mode === "war" ? ffconfig.war_filter_collapsed : ffconfig.faction_filter_collapsed
    );
    const [colDisplay, setColDisplay] = useState(
      FactionsColDisplay.FAIR_FIGHT
    );
    const [hasLastActionData, setHasLastActionData] = useState(
      initialHasLastActionData
    );
    const filterStateRef = useRef(filterState);
    filterStateRef.current = filterState;
    const collapsedRef = useRef(collapsed);
    collapsedRef.current = collapsed;
    const hasLastActionDataRef = useRef(hasLastActionData);
    hasLastActionDataRef.current = hasLastActionData;
    const modeRef = useRef(mode);
    modeRef.current = mode;
    const filteringDisabledRef = useRef(filteringDisabled);
    filteringDisabledRef.current = filteringDisabled;
    const onFilterChangeRef = useRef(onFilterChange);
    onFilterChangeRef.current = onFilterChange;
    const debounceTimerRef = useRef(null);
    const wasMobileRef = useRef(isMobileView());
    const rootRef = useRef(null);
    const applyStatePatch = (patch) => {
      const next = { ...filterStateRef.current, ...patch };
      filterStateRef.current = next;
      setFilterState(next);
    };
    const getFilterSnapshot = () => {
      const s2 = filterStateRef.current;
      return {
        sortBy: s2.sortBy,
        filterEnabled: filteringDisabledRef.current ? false : s2.filterEnabled,
        activity: s2.activity,



status: modeRef.current === "war" ? { ...s2.status, fallen: false } : s2.status,
        levelMin: s2.levelMin,
        levelMax: s2.levelMax,
        ffMin: s2.ffMin,
        ffMax: s2.ffMax,
        statsMin: s2.statsMin ? parse_suffix_number(s2.statsMin) : null,
        statsMax: s2.statsMax ? parse_suffix_number(s2.statsMax) : null,
        lastActionMinSec: s2.lastActionMin ? parse_duration_to_seconds(s2.lastActionMin) : null,
        lastActionMaxSec: s2.lastActionMax ? parse_duration_to_seconds(s2.lastActionMax) : null
      };
    };
    const dispatchChange = () => {
      onFilterChangeRef.current(getFilterSnapshot());
    };
    const saveState = (state) => {
      const isWar = modeRef.current === "war";
      const isMobile = isMobileView();
      const existing = isWar ? ffconfig.war_filter_state : ffconfig.faction_filter_state;
      const savedHiddenColumns = existing?.hiddenColumns;
      const savedHiddenColumnsMobile = existing?.hiddenColumnsMobile;
      const hiddenColumnsToSave = isMobile ? savedHiddenColumns ?? DEFAULT_HIDDEN_COLUMNS : state.hiddenColumns ?? DEFAULT_HIDDEN_COLUMNS;
      const hiddenColumnsMobileToSave = isMobile ? state.hiddenColumns ?? DEFAULT_HIDDEN_COLUMNS : savedHiddenColumnsMobile ?? {
        level: true,
        status: false,
        score: false
      };
      const toSave = {
        ...state,
        hiddenColumns: hiddenColumnsToSave,
        hiddenColumnsMobile: hiddenColumnsMobileToSave
      };
      if (isWar) {
        ffconfig.war_filter_state = toSave;
      } else {
        ffconfig.faction_filter_state = toSave;
      }
    };
    const executeChangeImmediately = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      saveState(filterStateRef.current);
      dispatchChange();
    };
    const queueChange = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        saveState(filterStateRef.current);
        dispatchChange();
        debounceTimerRef.current = null;
      }, 250);
    };
    const loadState = () => {
      const isWar = modeRef.current === "war";
      const isMobile = isMobileView();
      const newCollapsed = isWar ? ffconfig.war_filter_collapsed : ffconfig.faction_filter_collapsed;
      setCollapsed(newCollapsed);
      setColDisplay(
        isWar ? ffconfig.war_col_display : ffconfig.factions_col_display
      );
      const parsed = isWar ? ffconfig.war_filter_state : ffconfig.faction_filter_state;
      let next;
      if (parsed) {
        const savedSortBy = parsed.sortBy ?? "none";
        const hiddenColumns2 = isMobile ? {
          level: parsed.hiddenColumnsMobile?.level ?? true,
          status: parsed.hiddenColumnsMobile?.status ?? DEFAULT_HIDDEN_COLUMNS.status,
          score: parsed.hiddenColumnsMobile?.score ?? DEFAULT_HIDDEN_COLUMNS.score
        } : {
          level: parsed.hiddenColumns?.level ?? DEFAULT_HIDDEN_COLUMNS.level,
          status: parsed.hiddenColumns?.status ?? DEFAULT_HIDDEN_COLUMNS.status,
          score: parsed.hiddenColumns?.score ?? DEFAULT_HIDDEN_COLUMNS.score
        };
        next = {
          sortBy: savedSortBy === "ff-asc" || savedSortBy === "ff-desc" ? savedSortBy : "none",
          filterEnabled: parsed.filterEnabled ?? true,
          activity: { ...DEFAULT_STATE.activity, ...parsed.activity },
          status: { ...DEFAULT_STATE.status, ...parsed.status },
          levelMin: parsed.levelMin ?? null,
          levelMax: parsed.levelMax ?? null,
          ffMin: parsed.ffMin ?? null,
          ffMax: parsed.ffMax ?? null,
          statsMin: parsed.statsMin ?? null,
          statsMax: parsed.statsMax ?? null,
          lastActionMin: parsed.lastActionMin ?? null,
          lastActionMax: parsed.lastActionMax ?? null,
          hiddenColumns: hiddenColumns2
        };
      } else {
        next = {
          ...DEFAULT_STATE,
          hiddenColumns: {
            level: isMobile,
            status: DEFAULT_HIDDEN_COLUMNS.status,
            score: DEFAULT_HIDDEN_COLUMNS.score
          }
        };
      }
      filterStateRef.current = next;
      setFilterState(next);
      onFilterChangeRef.current(getFilterSnapshot());
    };
    useEffect(() => {
      loadState();
      const onConfigUpdated = () => {
        setColDisplay(
          modeRef.current === "war" ? ffconfig.war_col_display : ffconfig.factions_col_display
        );
      };
      const onResize = () => {
        const isMobile = isMobileView();
        if (isMobile !== wasMobileRef.current) {
          wasMobileRef.current = isMobile;
          loadState();
        }
      };
      window.addEventListener("ff-config-updated", onConfigUpdated);
      window.addEventListener("resize", onResize);
      onReady?.();
      return () => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        window.removeEventListener("ff-config-updated", onConfigUpdated);
        window.removeEventListener("resize", onResize);
      };
    }, []);
    useEffect(() => {
      if (mode !== "war") return;
      const target = rootRef.current?.closest(".faction-war");
      if (!(target instanceof HTMLElement)) return;
      const cols = filterState.hiddenColumns ?? DEFAULT_HIDDEN_COLUMNS;
      for (const [col, isHidden] of Object.entries(cols)) {
        if (isHidden) {
          target.setAttribute(`data-ffscouter-hide-${col}`, "true");
        } else {
          target.removeAttribute(`data-ffscouter-hide-${col}`);
        }
      }
    }, [filterState.hiddenColumns, mode]);
    useImperativeHandle(
      ref,
      () => ({
        setSortBy(val) {
          applyStatePatch({ sortBy: val });
          executeChangeImmediately();
        },
        getFilterSnapshot,
        get sortBy() {
          return filterStateRef.current.sortBy;
        },
        get activity() {
          return filterStateRef.current.activity;
        },
        get hasLastActionData() {
          return hasLastActionDataRef.current;
        },
        setHasLastActionData(val) {
          hasLastActionDataRef.current = val;
          setHasLastActionData(val);
        },
        setFilterState(patch) {
          applyStatePatch(patch);
          dispatchChange();
        },
        dispatchChange,
        get ready() {
          return true;
        }
      }),
      []
    );
    const onToggle = (e) => {
      const newCollapsed = !e.currentTarget.open;
      if (newCollapsed === collapsedRef.current) return;
      setCollapsed(newCollapsed);
      if (mode === "war") {
        ffconfig.war_filter_collapsed = newCollapsed;
      } else {
        ffconfig.faction_filter_collapsed = newCollapsed;
      }
    };
    const onSortToggle = () => {
      const next = filterStateRef.current.sortBy === "none" ? "ff-desc" : filterStateRef.current.sortBy === "ff-desc" ? "ff-asc" : "none";
      applyStatePatch({ sortBy: next });
      executeChangeImmediately();
    };
    const onDisplayChange = (e) => {
      const val = e.target.value;
      setColDisplay(val);
      if (mode === "war") {
        ffconfig.war_col_display = val;
      } else {
        ffconfig.factions_col_display = val;
      }
      window.dispatchEvent(new CustomEvent("ff-config-updated"));
      executeChangeImmediately();
    };
    const onToggleFilter = (e) => {
      e.preventDefault();
      e.stopPropagation();
      applyStatePatch({ filterEnabled: !filterStateRef.current.filterEnabled });
      executeChangeImmediately();
    };
    const onResetFilters = (e) => {
      e.preventDefault();
      e.stopPropagation();
      applyStatePatch({
        activity: { online: true, idle: true, offline: true },
        status: {
          okay: true,
          traveling: true,
          hospital: true,
          jail: true,
          abroad: true,
          federal: true,
          fallen: true
        },
        levelMin: null,
        levelMax: null,
        ffMin: null,
        ffMax: null,
        statsMin: null,
        statsMax: null,
        lastActionMin: null,
        lastActionMax: null
      });
      executeChangeImmediately();
    };
    const onActivityChange = (key, val) => {
      applyStatePatch({
        activity: { ...filterStateRef.current.activity, [key]: val }
      });
      executeChangeImmediately();
    };
    const onStatusChange = (key, val) => {
      applyStatePatch({
        status: { ...filterStateRef.current.status, [key]: val }
      });
      executeChangeImmediately();
    };
    const onLevelChange = (type, valStr) => {
      const val = valStr === "" ? null : Number.parseInt(valStr, 10);
      applyStatePatch(type === "min" ? { levelMin: val } : { levelMax: val });
      queueChange();
    };
    const onFFChange = (type, valStr) => {
      const val = valStr === "" ? null : Number.parseFloat(valStr);
      applyStatePatch(type === "min" ? { ffMin: val } : { ffMax: val });
      queueChange();
    };
    const onStatsChange = (type, valStr) => {
      const val = valStr.trim() === "" ? null : valStr;
      applyStatePatch(type === "min" ? { statsMin: val } : { statsMax: val });
      queueChange();
    };
    const onLastActionChange = (type, valStr) => {
      const val = valStr.trim() === "" ? null : valStr;
      applyStatePatch(
        type === "min" ? { lastActionMin: val } : { lastActionMax: val }
      );
      queueChange();
    };
    const onColumnVisibilityChange = (key, val) => {
      applyStatePatch({
        hiddenColumns: {
          ...filterStateRef.current.hiddenColumns ?? DEFAULT_HIDDEN_COLUMNS,
          [key]: val
        }
      });
      executeChangeImmediately();
    };
    const onCompareActivity = () => {
      const container = rootRef.current?.closest(".faction-war");
      const links = container ? Array.from(
        container.querySelectorAll('a[href*="step=profile"]')
      ) : [];
      const seen = new Set();
      const ids = [];
      const tryExtract = (link) => {
        try {
          const url = new URL(link.href, window.location.origin);
          const id = url.searchParams.get("ID");
          if (id && !seen.has(id)) {
            seen.add(id);
            ids.push(id);
          }
        } catch {
          const match = (link.getAttribute("href") || "").match(/[?&]ID=(\d+)/i);
          if (match?.[1]) {
            const id = match[1];
            if (!seen.has(id)) {
              seen.add(id);
              ids.push(id);
            }
          }
        }
      };
      for (const link of links) tryExtract(link);
      if (ids.length < 2) {
        const docLinks = Array.from(
          document.querySelectorAll('a[href*="step=profile"]')
        );
        for (const link of docLinks) tryExtract(link);
      }
      if (ids.length < 2) {
        console.warn("Could not find faction IDs to compare activity.");
        return;
      }
      const now = new Date();
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
      const formatUTC = (d2) => {
        const y2 = d2.getUTCFullYear();
        const m2 = String(d2.getUTCMonth() + 1).padStart(2, "0");
        const day = String(d2.getUTCDate()).padStart(2, "0");
        const h2 = String(d2.getUTCHours()).padStart(2, "0");
        const min = String(d2.getUTCMinutes()).padStart(2, "0");
        return `${y2}-${m2}-${day}T${h2}:${min}`;
      };
      const factionId1 = ids[0];
      const factionId2 = ids[1];
      const scouterUrl = `https://ffscouter.com/faction-activity-comparison?faction_id_1=${factionId1}&faction_id_2=${factionId2}&start_at=${encodeURIComponent(formatUTC(start))}&end_at=${encodeURIComponent(formatUTC(now))}&bucket_minutes=60`;
      window.open(scouterUrl, "_blank");
    };
    const s = filterState;
    const hiddenColumns = s.hiddenColumns ?? DEFAULT_HIDDEN_COLUMNS;
    const isEst = colDisplay === FactionsColDisplay.BATTLE_STATS;
    const sortText = isEst ? "Stats" : "FF";
    return jsxs(
      "details",
      {
        ref: rootRef,
        className: `${cls$1.box}${mode === "war" ? ` ${cls$1.boxNoBorders}` : ""}`,
        open: !collapsed,
        onToggle,
        children: [
jsx("summary", { children: jsxs("div", { className: cls$1.header, children: [
jsx("span", { children: "FFScouter Filter & Sort Controls" }),
jsxs(
              "div",
              {
                className: cls$1.headerActions,
                onClick: (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                },
                children: [
jsx(
                    "button",
                    {
                      type: "button",
                      className: `${cls$1.actionBtn} ${s.filterEnabled ? cls$1.actionBtnActive : cls$1.actionBtnInactive}`,
                      title: s.filterEnabled ? "Turn off filtering" : "Turn on filtering",
                      onClick: onToggleFilter,
                      children: s.filterEnabled ? jsx("svg", { viewBox: "0 0 16 16", "aria-hidden": "true", children: jsx("path", { d: "M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.124.318l-4.5 5.5v4.682a.5.5 0 0 1-.168.373l-2.5 2a.5.5 0 0 1-.832-.373v-6.682l-4.5-5.5A.5.5 0 0 1 1.5 3.5v-2z" }) }) : jsxs("svg", { viewBox: "0 0 16 16", "aria-hidden": "true", children: [
jsx("path", { d: "M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.124.318l-4.5 5.5v4.682a.5.5 0 0 1-.168.373l-2.5 2a.5.5 0 0 1-.832-.373v-6.682l-4.5-5.5A.5.5 0 0 1 1.5 3.5v-2z" }),
jsx(
                          "line",
                          {
                            x1: "1.5",
                            y1: "14.5",
                            x2: "14.5",
                            y2: "1.5",
                            stroke: "currentColor",
                            strokeWidth: "1.5"
                          }
                        )
                      ] })
                    }
                  ),
jsx(
                    "button",
                    {
                      type: "button",
                      className: `${cls$1.actionBtn} ${cls$1.actionBtnReset}`,
                      title: "Reset filters to default",
                      onClick: onResetFilters,
                      children: jsxs("svg", { viewBox: "0 0 16 16", "aria-hidden": "true", children: [
jsx(
                          "path",
                          {
                            fillRule: "evenodd",
                            d: "M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"
                          }
                        ),
jsx("path", { d: "M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" })
                      ] })
                    }
                  )
                ]
              }
            )
          ] }) }),
jsxs("div", { className: cls$1.grid, children: [
jsxs("div", { className: `${cls$1.group} ${cls$1.groupSort}`, children: [
jsx("strong", { children: "Sort & Display" }),
jsxs("div", { className: cls$1.sortControls, children: [
jsx(
                  "button",
                  {
                    type: "button",
                    id: "sort-toggle-btn",
                    className: cls$1.sortBtn,
                    onClick: onSortToggle,
                    children: s.sortBy === "none" ? "Sort: Default" : s.sortBy === "ff-asc" ? `Sort: ${sortText} ▲` : `Sort: ${sortText} ▼`
                  }
                ),
jsxs(
                  "select",
                  {
                    id: mode === "war" ? "war-col-display-filter" : "factions-col-display-filter",
                    value: colDisplay,
                    onChange: onDisplayChange,
                    className: cls$1.displaySelect,
                    children: [
jsx("option", { value: "fair_fight", children: "Show: FF Score" }),
jsx("option", { value: "battle_stats", children: "Show: BS Estimate" }),
jsx("option", { value: "none", children: "Show: None (Hide)" })
                    ]
                  }
                ),
                mode === "war" && jsx(
                  "button",
                  {
                    type: "button",
                    id: "compare-faction-activity-btn",
                    className: cls$1.compareBtn,
                    onClick: onCompareActivity,
                    children: "Compare Activity"
                  }
                )
              ] })
            ] }),
jsxs("div", { className: `${cls$1.group} ${cls$1.groupActivity}`, children: [
jsx("strong", { children: "Activity" }),
jsx("div", { className: cls$1.options, children: [
                ["online", "Online"],
                ["idle", "Idle"],
                ["offline", "Offline"]
              ].map(([key, label]) => jsxs("label", { children: [
jsx(
                  "input",
                  {
                    type: "checkbox",
                    checked: s.activity[key],
                    onChange: (e) => onActivityChange(key, e.target.checked)
                  }
                ),
                label
              ] }, key)) })
            ] }),
jsxs("div", { className: `${cls$1.group} ${cls$1.groupStatus}`, children: [
jsx("strong", { children: "Status" }),
jsx("div", { className: cls$1.options, children: [
                ["okay", "Okay"],
                ["hospital", "Hospital"],
                ["jail", "Jail"],
                ["abroad", "Abroad"],
                ["traveling", "Traveling"],
                ["federal", "Fedded"],
                ["fallen", "Fallen"]
              ].filter(([key]) => mode !== "war" || key !== "fallen").map(([key, label]) => jsxs("label", { children: [
jsx(
                  "input",
                  {
                    type: "checkbox",
                    checked: s.status[key],
                    onChange: (e) => onStatusChange(key, e.target.checked)
                  }
                ),
                label
              ] }, key)) })
            ] }),
jsxs("div", { className: `${cls$1.group} ${cls$1.groupLevel}`, children: [
jsx("strong", { children: "Level Range" }),
jsxs("div", { className: cls$1.rangeInputs, children: [
jsx(
                  "input",
                  {
                    type: "number",
                    placeholder: "Min",
                    value: s.levelMin !== null ? String(s.levelMin) : "",
                    onChange: (e) => onLevelChange("min", e.target.value)
                  }
                ),
jsx("span", { children: "to" }),
jsx(
                  "input",
                  {
                    type: "number",
                    placeholder: "Max",
                    value: s.levelMax !== null ? String(s.levelMax) : "",
                    onChange: (e) => onLevelChange("max", e.target.value)
                  }
                )
              ] })
            ] }),
jsxs("div", { className: `${cls$1.group} ${cls$1.groupFf}`, children: [
jsx("strong", { children: "FF Range" }),
jsxs("div", { className: cls$1.rangeInputs, children: [
jsx(
                  "input",
                  {
                    type: "number",
                    step: "0.1",
                    placeholder: "Min",
                    value: s.ffMin !== null ? String(s.ffMin) : "",
                    onChange: (e) => onFFChange("min", e.target.value)
                  }
                ),
jsx("span", { children: "to" }),
jsx(
                  "input",
                  {
                    type: "number",
                    step: "0.1",
                    placeholder: "Max",
                    value: s.ffMax !== null ? String(s.ffMax) : "",
                    onChange: (e) => onFFChange("max", e.target.value)
                  }
                )
              ] })
            ] }),
jsxs("div", { className: `${cls$1.group} ${cls$1.groupStats}`, children: [
jsx("strong", { children: "Stats Range" }),
jsxs("div", { className: cls$1.rangeInputs, children: [
jsx(
                  "input",
                  {
                    type: "text",
                    placeholder: "Min",
                    value: s.statsMin !== null ? s.statsMin : "",
                    onChange: (e) => onStatsChange("min", e.target.value)
                  }
                ),
jsx("span", { children: "to" }),
jsx(
                  "input",
                  {
                    type: "text",
                    placeholder: "Max",
                    value: s.statsMax !== null ? s.statsMax : "",
                    onChange: (e) => onStatsChange("max", e.target.value)
                  }
                )
              ] })
            ] }),
            mode === "war" && hasLastActionData && jsxs("div", { className: `${cls$1.group} ${cls$1.groupLastAction}`, children: [
jsx("strong", { children: "Last Action Range" }),
jsxs("div", { className: cls$1.rangeInputs, children: [
jsx(
                  "input",
                  {
                    type: "text",
                    placeholder: "Min",
                    title: 'e.g. "10m", "1h", "4h2m15s"',
                    value: s.lastActionMin !== null ? s.lastActionMin : "",
                    onChange: (e) => onLastActionChange("min", e.target.value)
                  }
                ),
jsx("span", { children: "to" }),
jsx(
                  "input",
                  {
                    type: "text",
                    placeholder: "Max",
                    title: 'e.g. "10m", "1h", "4h2m15s"',
                    value: s.lastActionMax !== null ? s.lastActionMax : "",
                    onChange: (e) => onLastActionChange("max", e.target.value)
                  }
                )
              ] })
            ] }),
            mode === "war" && jsxs("div", { className: `${cls$1.group} ${cls$1.groupColumns}`, children: [
jsx("strong", { children: "Visible Columns" }),
jsx("div", { className: cls$1.options, children: [
                ["level", "Level"],
                ["status", "Status"],
                ["score", "Score"]
              ].map(([key, label]) => jsxs("label", { children: [
jsx(
                  "input",
                  {
                    type: "checkbox",
                    checked: !hiddenColumns[key],
                    onChange: (e) => onColumnVisibilityChange(key, !e.target.checked)
                  }
                ),
                label
              ] }, key)) })
            ] })
          ] })
        ]
      }
    );
  }
  function get_current_time_seconds() {
    if (typeof window.getCurrentTimestamp === "function") {
      return window.getCurrentTimestamp() / 1e3;
    }
    return Date.now() / 1e3;
  }
  const isApplying = new WeakMap();
  function is_applying(list) {
    return isApplying.get(list) ?? false;
  }
  function apply_filters_and_sort(membersList, filters) {
    if (isApplying.get(membersList)) return;
    isApplying.set(membersList, true);
    try {
      const tbody = membersList.querySelector(".table-body") || membersList.querySelector(".members-list") || membersList;
      const rows = Array.from(
        tbody.querySelectorAll(":scope > .table-row, .enemy, .your")
      );
      for (const row of rows) {
        if (filters.filterEnabled === false) {
          show_row(row);
          continue;
        }
        const activity = get_activity_status(row);
        const allActivityUnchecked = !filters.activity.online && !filters.activity.idle && !filters.activity.offline;
        const matchesActivity = allActivityUnchecked || activity === "unknown" || activity === "online" && filters.activity.online || activity === "idle" && filters.activity.idle || activity === "offline" && filters.activity.offline;
        if (!matchesActivity) {
          hide_row(row);
          continue;
        }
        let status = "okay";
        const statusCell = row.querySelector(".status");
        if (statusCell) {
          if (statusCell.classList.contains("traveling") || statusCell.querySelector(".traveling")) {
            status = "traveling";
          } else if (statusCell.classList.contains("hospital") || statusCell.querySelector(".hospital")) {
            status = "hospital";
          } else if (statusCell.classList.contains("jail") || statusCell.querySelector(".jail")) {
            status = "jail";
          } else if (statusCell.classList.contains("abroad") || statusCell.querySelector(".abroad")) {
            status = "abroad";
          } else if (statusCell.classList.contains("federal") || statusCell.querySelector(".federal")) {
            status = "federal";
          } else if (statusCell.classList.contains("fallen") || statusCell.querySelector(".fallen")) {
            status = "fallen";
          } else {
            status = "okay";
          }
        }
        const allStatusUnchecked = !filters.status.okay && !filters.status.traveling && !filters.status.hospital && !filters.status.jail && !filters.status.abroad && !filters.status.federal && !filters.status.fallen;
        const matchesStatus = allStatusUnchecked || status === "okay" && filters.status.okay || status === "traveling" && filters.status.traveling || status === "hospital" && filters.status.hospital || status === "jail" && filters.status.jail || status === "abroad" && filters.status.abroad || status === "federal" && filters.status.federal || status === "fallen" && filters.status.fallen;
        if (!matchesStatus) {
          hide_row(row);
          continue;
        }
        const levelCell = row.querySelector(".lvl:not(.ffscouter-cell), .level");
        const level = levelCell ? Number.parseInt(levelCell.textContent || "0", 10) : 0;
        const matchesLevel = (filters.levelMin === null || level >= filters.levelMin) && (filters.levelMax === null || level <= filters.levelMax);
        if (!matchesLevel) {
          hide_row(row);
          continue;
        }
        const ffVal = row.dataset["ffValue"] ? (
Number.parseFloat(row.dataset["ffValue"])
        ) : null;
        const matchesFF = ffVal === null || (filters.ffMin === null || ffVal >= filters.ffMin) && (filters.ffMax === null || ffVal <= filters.ffMax);
        if (!matchesFF) {
          hide_row(row);
          continue;
        }
        const estVal = row.dataset["estValue"] ? (
Number.parseInt(row.dataset["estValue"], 10)
        ) : null;
        const matchesStats = estVal === null || (filters.statsMin === void 0 || filters.statsMin === null || estVal >= filters.statsMin) && (filters.statsMax === void 0 || filters.statsMax === null || estVal <= filters.statsMax);
        if (!matchesStats) {
          hide_row(row);
          continue;
        }
        const lastActionRaw = row.dataset["twseLastActionTimestamp"];
        const lastActionTs = lastActionRaw ? Number.parseInt(lastActionRaw, 10) : null;
        const hasLastActionData = lastActionTs !== null && !Number.isNaN(lastActionTs) && lastActionTs !== 0;
        const lastActionAge = hasLastActionData ? get_current_time_seconds() - lastActionTs : null;
        const matchesLastAction = lastActionAge === null || (filters.lastActionMinSec === void 0 || filters.lastActionMinSec === null || lastActionAge >= filters.lastActionMinSec) && (filters.lastActionMaxSec === void 0 || filters.lastActionMaxSec === null || lastActionAge <= filters.lastActionMaxSec);
        if (!matchesLastAction) {
          hide_row(row);
          continue;
        }
        if (matchesActivity && matchesStatus && matchesLevel && matchesFF && matchesStats && matchesLastAction) {
          show_row(row);
        } else {
          hide_row(row);
        }
      }
      if (filters.sortBy !== "none") {
        const isEst = filters.colDisplay === FactionsColDisplay.BATTLE_STATS;
        const valKey = isEst ? "estValue" : "ffValue";
        rows.sort((a, b) => {
          const getVal = (row) => {
            const dataVal = row.dataset[valKey];
            return dataVal ? Number.parseFloat(dataVal) : -1;
          };
          const valA = getVal(a);
          const valB = getVal(b);
          if (filters.sortBy.endsWith("asc")) {
            return valA - valB;
          }
          return valB - valA;
        });
        for (const row of rows) {
          const extra_tt_rows = [];
          let next_sibling = row.nextElementSibling;
          while (next_sibling && !next_sibling?.classList.contains("table-row") && !next_sibling?.classList.contains("enemy") && !next_sibling?.classList.contains("your")) {
            if (next_sibling.classList.contains("tt-last-action") || next_sibling.classList.contains("tt-stats-estimate")) {
              extra_tt_rows.push(next_sibling);
            }
            next_sibling = next_sibling.nextElementSibling;
          }
          tbody.appendChild(row);
          for (const r of extra_tt_rows) {
            tbody.appendChild(r);
          }
        }
      }
      if (is_filter_active(filters)) {
        tbody.setAttribute("data-ffscouter-active-filter", "true");
      } else {
        tbody.removeAttribute("data-ffscouter-active-filter");
      }
    } finally {
      isApplying.set(membersList, false);
    }
  }
  function update_header_sort_indicator(list, sortBy) {
    const header = list.querySelector(".ffscouter-header");
    if (!header) return;
    if (sortBy === "none") {
      header.removeAttribute("data-ffscouter-sort");
      header.querySelector(".ffscouter-sort-icon")?.remove();
      return;
    }
    header.setAttribute(
      "data-ffscouter-sort",
      sortBy === "ff-asc" ? "asc" : "desc"
    );
    const classes = detect_sort_icon_classes(list);
    if (!classes) return;
    if (classes.tab) header.classList.add(classes.tab);
    let icon = header.querySelector(".ffscouter-sort-icon");
    if (!icon) {
      icon = document.createElement("div");
      icon.classList.add("ffscouter-sort-icon", classes.sortIcon);
      if (classes.activeIcon) icon.classList.add(classes.activeIcon);
      header.appendChild(icon);
    }
    icon.classList.remove(classes.asc, classes.desc);
    icon.classList.add(sortBy === "ff-asc" ? classes.asc : classes.desc);
  }
  function is_tt_extra_row(el) {
    return el.classList.contains("tt-last-action") || el.classList.contains("tt-stats-estimate");
  }
  function toggle_tt_siblings(row, hidden) {
    let next = row.nextElementSibling;
    while (next && !next.classList.contains("table-row") && !next.classList.contains("enemy") && !next.classList.contains("your")) {
      if (is_tt_extra_row(next)) {
        if (hidden) {
          next.setAttribute("data-ffscouter-hidden", "");
        } else {
          next.removeAttribute("data-ffscouter-hidden");
        }
      }
      next = next.nextElementSibling;
    }
  }
  function hide_row(row) {
    row.setAttribute("data-ffscouter-hidden", "");
    toggle_tt_siblings(row, true);
  }
  function show_row(row) {
    row.removeAttribute("data-ffscouter-hidden");
    toggle_tt_siblings(row, false);
  }
  function is_filter_active(filters) {
    if (filters.sortBy !== "none") return true;
    return false;
  }
  const log$b = logger.child("feature:faction");
  async function poll_traveling_flights(membersList) {
    const rows = Array.from(
      membersList.querySelectorAll(".enemy, .your")
    );
    const travelingPlayers = rows.map((row) => {
      const player_id = get_player_id_in_element(row);
      if (!player_id) return null;
      const statusCell = row.querySelector(".status");
      const statusText = statusCell?.textContent?.trim() || "";
      const isTraveling = statusText === "Traveling";
      return { row, player_id, isTraveling };
    }).filter((item) => item !== null);
    for (const p of travelingPlayers) {
      if (!p.isTraveling) {
        p.row.removeAttribute("data-earliest-arrival");
        p.row.removeAttribute("data-latest-arrival");
        ffscouter.clear_flight_cache(p.player_id);
      }
    }
    const traveling = travelingPlayers.filter((p) => p.isTraveling);
    if (traveling.length === 0) return;
    const isPremium = await check_key_status.is_premium();
    if (!isPremium) {
      for (const p of traveling) {
        p.row.removeAttribute("data-earliest-arrival");
        p.row.removeAttribute("data-latest-arrival");
      }
      return;
    }
    await Promise.all(
      traveling.map(async (p) => {
        try {
          const flights = await ffscouter.get_flights(p.player_id);
          const current = flights?.current;
          if (current) {
            const earliest = current.earliest_arrival_time;
            const latest = current.latest_arrival_time;
            p.row.setAttribute("data-earliest-arrival", String(earliest));
            p.row.setAttribute("data-latest-arrival", String(latest));
          } else {
            p.row.removeAttribute("data-earliest-arrival");
            p.row.removeAttribute("data-latest-arrival");
          }
        } catch (err) {
          log$b.error(`Failed to fetch flights for player ${p.player_id}`, err);
        }
      })
    );
  }
  async function apply_ff_columns(membersList) {
    const headerLvl = membersList.querySelector(".table-header > .lvl") || membersList.querySelector(".white-grad");
    if (!headerLvl) return;
    const isWar = membersList.closest(".faction-war") !== null;
    const colDisplay = isWar ? ffconfig.war_col_display : ffconfig.factions_col_display;
    const isEst = colDisplay === FactionsColDisplay.BATTLE_STATS;
    const isNone = colDisplay === FactionsColDisplay.NONE;
    const expectedText = isEst ? "Est" : "FF";
    const factionWar = membersList.closest(".faction-war");
    if (factionWar) {
      factionWar.setAttribute("data-ffscouter-col-display", colDisplay);
    }
    let headerLi = membersList.querySelector(
      ".ffscouter-header"
    );
    if (isNone) {
      if (headerLi) {
        headerLi.remove();
      }
    } else {
      if (headerLi && (isWar && headerLi.tagName !== "DIV" || !isWar && headerLi.tagName !== "LI")) {
        headerLi.remove();
        headerLi = null;
      }
      if (!headerLi) {
        if (isWar) {
          const headerLvlEl = membersList.querySelector(
            ".white-grad > .level"
          );
          if (headerLvlEl) {
            headerLi = document.createElement("div");
            headerLi.classList.add("left", "level", "ffscouter-header");
            headerLvlEl.after(headerLi);
          }
        } else {
          headerLi = document.createElement("li");
          headerLi.tabIndex = 0;
          headerLi.classList.add(
            "table-cell",
            "lvl",
            "torn-divider",
            "divider-vertical",
            "ffscouter-header"
          );
          headerLvl.after(headerLi);
        }
      }
      if (headerLi && headerLi.textContent !== expectedText) {
        headerLi.textContent = expectedText;
      }
    }
    const rows = Array.from(
      membersList.querySelectorAll(".table-body > .table-row, .enemy, .your")
    );
    const rowPlayers = rows.map((row) => {
      const memberDiv = row.querySelector(".member");
      if (!memberDiv) return null;
      const profileLink = memberDiv.querySelector('a[href^="/profiles"]');
      if (!profileLink || !(profileLink instanceof HTMLAnchorElement))
        return null;
      const url = profileLink.href;
      const match = url.match(/.*XID=(?<player_id>\d+)/);
      if (!match?.groups?.["player_id"]) return null;
      return {
        row,
player_id: Number.parseInt(match.groups["player_id"], 10),
        memberDiv
      };
    }).filter((item) => item !== null);
    if (rowPlayers.length === 0) return;
    const playerIds = rowPlayers.map((p) => p.player_id);
    const dataPromises = playerIds.map((id) => ffscouter.get(id));
    ffscouter.complete();
    const dataList = await Promise.all(dataPromises);
    const dataMap = new Map(dataList.map((d2) => [d2.player_id, d2]));
    for (const rp of rowPlayers) {
      let cell = rp.row.querySelector(".ffscouter-cell");
      if (isNone) {
        if (cell) {
          cell.remove();
        }
      } else {
        if (!cell) {
          cell = document.createElement("div");
          if (isWar) {
            cell.classList.add("left", "level", "ffscouter-cell");
            const levelEl = rp.row.querySelector(".level, [class*='level__']");
            if (levelEl) {
              levelEl.after(cell);
            } else {
              rp.memberDiv.after(cell);
            }
          } else {
            cell.classList.add("table-cell", "lvl", "ffscouter-cell");
            const rowLvl = rp.row.querySelector(".lvl");
            if (rowLvl) {
              rowLvl.after(cell);
            } else {
              rp.memberDiv.after(cell);
            }
          }
        }
        cell.style.cursor = "pointer";
        cell.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          const forceNewTab = e.ctrlKey || e.metaKey || e.button === 1;
          open_attack_link(rp.player_id, {
            openInNewTab: forceNewTab ? true : void 0
          });
        };
      }
      const data = dataMap.get(rp.player_id);
      if (data && !data.no_data) {
        rp.row.dataset["ffValue"] = String(extract_ff(data));
        rp.row.dataset["estValue"] = String(extract_bs_estimate(data));
        if (cell) {
          const text = isEst ? extract_bs_estimate_human(data) : format_ff_score(data);
          const bg_color = get_ff_colour(data);
          const text_color = get_contrast_color(bg_color);
          cell.style.backgroundColor = bg_color;
          cell.style.color = text_color;
          cell.style.fontWeight = "bold";
          cell.textContent = text;
          if (isEst && data.distribution) {
            const ageStr = format_relative_time(data.distribution.last_updated);
            const agePart = ageStr ? ` ${ageStr}` : "";
            cell.title = `Top Stats: ${data.distribution.distribution_human}${agePart}`;
          } else {
            cell.title = "";
          }
        }
      } else {
        rp.row.dataset["ffValue"] = "";
        rp.row.dataset["estValue"] = "";
        if (cell) {
          cell.textContent = "-";
          cell.style.backgroundColor = "";
          cell.style.color = "";
          cell.style.fontWeight = "";
          cell.title = "";
        }
      }
    }
    const boxEl = (membersList.closest(".faction-war") || membersList.parentNode)?.querySelector("[data-ff-filter-box]");
    const handle = getFilterBoxHandle(boxEl);
    if (handle?.activity) {
      apply_filters_and_sort(membersList, {
        ...handle.getFilterSnapshot(),
        colDisplay
      });
    }
    update_header_sort_indicator(membersList, handle?.sortBy ?? "none");
    poll_traveling_flights(membersList);
  }
  const log$a = logger.child("feature:faction");
  const FEATURE_NAME$4 = "faction";
  function cleanup_when_detached(el, dispose) {
    const cleanupInterval = setInterval(() => {
      if (!el.isConnected) {
        clearInterval(cleanupInterval);
        dispose();
      }
    }, 1e4);
  }
  function run_when_ready(root, isReady, onReady) {
    if (isReady()) {
      onReady();
      return;
    }
    const loadObserver = new MutationObserver((_mutations, obs) => {
      if (isReady()) {
        obs.disconnect();
        onReady();
      }
    });
    loadObserver.observe(root, { childList: true, subtree: true });
    cleanup_when_detached(root, () => loadObserver.disconnect());
  }
  const filterBoxRoots = new Map();
  function mountFilterBox(mode, onFilterChange) {
    filterBoxRoots.get(mode)?.unmount();
    const container = document.createElement("div");
    const filteringDisabled = mode === "war" ? !ffconfig.war_filter_enabled : !ffconfig.faction_filter_enabled;
    container.style.display = filteringDisabled ? "none" : "contents";
    container.setAttribute("data-ff-filter-box", "true");
    container.setAttribute("data-mode", mode);
    const ref = { current: null };
    let ready = false;
    let hasLastActionDataProp = false;
    const pending = [];
    const runOrBuffer = (fn) => {
      if (ready && ref.current) {
        fn(ref.current);
      } else {
        pending.push(fn);
      }
    };
    const onReady = () => {
      ready = true;
      if (ref.current && pending.length > 0) {
        for (const fn of pending) fn(ref.current);
        pending.length = 0;
      }
    };
    const handle = {
      get ready() {
        return ready;
      },
      get sortBy() {
        return ready ? ref.current?.sortBy ?? "none" : "none";
      },
      get activity() {
        return ready && ref.current ? ref.current.activity : { online: true, idle: true, offline: true };
      },
      get hasLastActionData() {
        return ready && ref.current ? ref.current.hasLastActionData : hasLastActionDataProp;
      },
      setSortBy: (val) => runOrBuffer((h2) => h2.setSortBy(val)),
      getFilterSnapshot: () => ready && ref.current ? ref.current.getFilterSnapshot() : {
        sortBy: "none",
        filterEnabled: !filteringDisabled,
        activity: { online: true, idle: true, offline: true },
        status: {
          okay: true,
          traveling: true,
          hospital: true,
          jail: true,
          abroad: true,
          federal: true,
          fallen: true
        },
        levelMin: null,
        levelMax: null,
        ffMin: null,
        ffMax: null,
        statsMin: null,
        statsMax: null,
        lastActionMinSec: null,
        lastActionMaxSec: null
      },
      setHasLastActionData: (val) => {
        hasLastActionDataProp = val;
        runOrBuffer((h2) => h2.setHasLastActionData(val));
      },
      setFilterState: (patch) => runOrBuffer((h2) => h2.setFilterState(patch)),
      dispatchChange: () => runOrBuffer((h2) => h2.dispatchChange())
    };
    container.__ffHandle = handle;
    const root = createRoot(container);
    filterBoxRoots.set(mode, root);
    root.render(
      createElement(FFFactionFilterBox, {
        mode,
        onFilterChange,
        ref,
        initialHasLastActionData: hasLastActionDataProp,
        filteringDisabled,
        onReady
      })
    );
    return container;
  }
  function update_last_action_visibility(list) {
    const scope = list.closest(".faction-war") || list;
    const boxEl = (list.closest(".faction-war") || list.parentNode)?.querySelector("[data-ff-filter-box]");
    const handle = getFilterBoxHandle(boxEl);
    if (!handle) return;
    handle.setHasLastActionData(
      !!scope.querySelector("[data-twse-last-action-timestamp]")
    );
  }
  function setup_reapply_watcher(list, observeTarget, getColDisplay) {
    update_last_action_visibility(list);
    let rafPending = false;
    const attributeObserver = new MutationObserver((mutations) => {
      if (is_applying(list)) return;
      let shouldReapply = false;
      for (const m2 of mutations) {
        if (m2.type === "attributes") {
          if (m2.attributeName === "aria-label" && m2.target instanceof HTMLElement && m2.target.closest('[class*="userStatusWrap"]')) {
            shouldReapply = true;
            break;
          }
          if (m2.attributeName === "class" && m2.target instanceof HTMLElement && m2.target.closest(".status")) {
            shouldReapply = true;
            break;
          }
          if (m2.attributeName === "data-twse-last-action-timestamp") {
            shouldReapply = true;
            break;
          }
        }
      }
      if (shouldReapply && !rafPending) {
        rafPending = true;
        requestAnimationFrame(() => {
          rafPending = false;
          update_last_action_visibility(list);
          const boxEl = (list.closest(".faction-war") || list.parentNode)?.querySelector("[data-ff-filter-box]");
          const handle = getFilterBoxHandle(boxEl);
          if (handle?.activity) {
            apply_filters_and_sort(list, {
              ...handle.getFilterSnapshot(),
              colDisplay: getColDisplay()
            });
          }
        });
      }
    });
    attributeObserver.observe(observeTarget, {
      attributes: true,
      attributeFilter: ["class", "aria-label", "data-twse-last-action-timestamp"],
      subtree: true
    });
    const flightInterval = setInterval(() => {
      poll_traveling_flights(list);
      update_last_action_visibility(list);
    }, 3e4);
    cleanup_when_detached(list, () => {
      clearInterval(flightInterval);
      attributeObserver.disconnect();
    });
  }
  function inject_filter_box(membersList) {
    const parent = membersList.parentNode;
    if (!parent) return;
    if (parent.querySelector("[data-ff-filter-box]")) return;
    const container = mountFilterBox("faction", (snapshot) => {
      apply_filters_and_sort(membersList, {
        ...snapshot,
        colDisplay: ffconfig.factions_col_display
      });
      update_header_sort_indicator(membersList, snapshot.sortBy);
    });
    parent.insertBefore(container, membersList);
  }
  function initialize_features(membersList) {
    if (membersList.hasAttribute("data-ffscouter-initialized")) return;
    membersList.setAttribute("data-ffscouter-initialized", "true");
    inject_filter_box(membersList);
    setup_header_click(membersList, ".table-header", "[role='button']");
    apply_ff_columns(membersList).catch((err) => {
      log$a.error(err);
    });
    const target = membersList.querySelector(".table-body") || membersList;
    setup_reapply_watcher(
      membersList,
      target,
      () => ffconfig.factions_col_display
    );
  }
  function setup_faction_features(membersList) {
    run_when_ready(
      membersList,
      () => !!membersList.querySelector(".table-body")?.querySelector(".table-row"),
      () => initialize_features(membersList)
    );
  }
  const monitor_member_list = (root = document.body, _dynamic = false) => {
    const membersList = root.classList.contains("members-list") ? root : root.querySelector(".members-list");
    if (membersList) {
      setup_faction_features(membersList);
    } else {
      apply_ff_members_list(root);
      const loadObserver = new MutationObserver((mutations, obs) => {
        const foundList = root.classList.contains("members-list") ? root : root.querySelector(".members-list");
        if (foundList) {
          obs.disconnect();
          setup_faction_features(foundList);
        } else {
          let shouldUpdate = false;
          for (const m2 of mutations) {
            for (const node of m2.addedNodes) {
              if (node instanceof HTMLElement && (node.querySelector(".honor-text-wrap") || node.querySelector(".member"))) {
                shouldUpdate = true;
                break;
              }
            }
            if (shouldUpdate) break;
          }
          if (shouldUpdate) {
            apply_ff_members_list(root);
          }
        }
      });
      loadObserver.observe(root, { childList: true, subtree: true });
      cleanup_when_detached(root, () => loadObserver.disconnect());
    }
  };
  const apply_ff_members_list = (root = document.body) => {
    const membersList = root.classList.contains("members-list") ? root : root.querySelector(".members-list");
    if (membersList) {
      setup_faction_features(membersList);
      return;
    }
    apply_ff_gauge_selector(
      root.querySelectorAll(".honor-text-wrap"),
      FEATURE_NAME$4,
      GaugeAttachMode.HONOR_BAR
    );
    apply_ff_gauge_selector(
      root.querySelectorAll(".member"),
      FEATURE_NAME$4,
      GaugeAttachMode.FALLBACK
    );
    for (const l of root.querySelectorAll(".members-list, .chain-attacks-list")) {
      if (l instanceof HTMLElement) {
        apply_ff_members_list(l);
      }
    }
  };
  function setup_header_click(list, headerAreaSelector, nativeTabSelector) {
    if (list.hasAttribute("data-ffscouter-header-click")) return;
    list.setAttribute("data-ffscouter-header-click", "true");
    list.addEventListener(
      "click",
      (e) => {
        const target = e.target;
        if (!target.closest(headerAreaSelector)) return;
        const scope = list.closest(".faction-war") ?? list.parentElement;
        const handle = getFilterBoxHandle(
          scope?.querySelector("[data-ff-filter-box]")
        );
        if (!handle) return;
        if (target.closest(".ffscouter-header")) {
          e.preventDefault();
          e.stopPropagation();
          const newSort = handle.sortBy === "ff-desc" ? "ff-asc" : "ff-desc";
          handle.setSortBy(newSort);
        } else if (target.closest(nativeTabSelector)) {
          if (handle.sortBy !== "none") {
            handle.setSortBy("none");
          }
        }
      },
      { capture: true }
    );
  }
  function setup_war_features(factionWar) {
    run_when_ready(
      factionWar,
      () => factionWar.querySelectorAll(".enemy-faction, .your-faction").length > 0,
      () => initialize_war_features(
        factionWar,
        Array.from(
          factionWar.querySelectorAll(".enemy-faction, .your-faction")
        )
      )
    );
  }
  function initialize_war_features(factionWar, lists) {
    if (factionWar.hasAttribute("data-ffscouter-initialized")) return;
    factionWar.setAttribute("data-ffscouter-initialized", "true");
    if (!factionWar.querySelector("[data-ff-filter-box][data-mode='war']")) {
      const container = mountFilterBox("war", (snapshot) => {
        const currentLists = Array.from(
          factionWar.querySelectorAll(".enemy-faction, .your-faction")
        );
        const colDisplay = ffconfig.war_col_display;
        for (const list of currentLists) {
          apply_filters_and_sort(list, { ...snapshot, colDisplay });
          update_header_sort_indicator(list, snapshot.sortBy);
        }
      });
      factionWar.insertBefore(container, factionWar.firstChild);
    }
    for (const list of lists) {
      setup_war_list(list);
    }
  }
  function setup_war_list(list) {
    run_when_ready(
      list,
      () => !!list.querySelector(".enemy, .your"),
      () => initialize_war_list(list)
    );
  }
  function initialize_war_list(list) {
    setup_header_click(list, ".white-grad", "[class*='tab___']");
    apply_ff_columns(list).catch((err) => {
      log$a.error(err);
    });
    setup_reapply_watcher(list, list, () => ffconfig.war_col_display);
  }
  const process_page = () => {
    wait_for_element(".members-list", 1e4).then((node) => {
      if (node instanceof HTMLElement) {
        log$a.debug("Found members-list!");
        monitor_member_list(node);
      }
    }).catch((err) => {
      log$a.error(err);
    });
    wait_for_element(".chain-attacks-list", 1e4).then((node) => {
      if (node instanceof HTMLElement) {
        log$a.debug("Found chain-attacks-list!");
        monitor_member_list(node, true);
      }
    }).catch((err) => {
      log$a.error(err);
    });
    wait_for_element("#faction_war_list_id", 1e4).then(async (node) => {
      if (!node) {
        return;
      }
      log$a.debug("Found faction_war_list_id");
      const descriptions_observer = new MutationObserver(async (mutations) => {
        try {
          for (const mutation of mutations) {
            for (const node2 of mutation.addedNodes) {
              if (node2 instanceof HTMLElement && node2.classList.contains("descriptions")) {
                log$a.debug(
                  "Observed mutation that included adding descriptions",
                  node2
                );
                const faction_war = await wait_for_element(
                  ".faction-war",
                  1e4
                );
                if (faction_war instanceof HTMLElement) {
                  setup_war_features(faction_war);
                }
              }
            }
          }
        } catch (err) {
          log$a.error(err);
        }
      });
      descriptions_observer.observe(node, { childList: true });
      log$a.debug(
        `Set up descriptions observer on <${node.tagName.toLowerCase()}> .${[...node.classList].join(".")}`
      );
      const existing_descriptions = node.querySelector(".descriptions");
      if (existing_descriptions) {
        const faction_war = await wait_for_element(
          " .faction-war",
          1e4,
          existing_descriptions
        );
        if (faction_war instanceof HTMLElement) {
          setup_war_features(faction_war);
        }
      }
    }).catch((err) => {
      log$a.error(err);
    });
  };
  function should_run_faction() {
    if (torn_page("factions", { step: "profile" })) {
      return true;
    }
    if (torn_page("factions", { step: "your" })) {
      if (window.location.hash === "" || window.location.hash === "#" || window.location.hash === "#/" || window.location.hash.startsWith("#/war/") || window.location.hash === "#/tab=info") {
        return true;
      }
    }
    return false;
  }
  const index$c = {
    name: "Faction page FF display",
    description: "Shows FF arrows on both your faction and other faction pages.",
    executionTime: StartTime.DocumentBody,
    async shouldRun() {
      return torn_page("factions");
    },
    async run() {
      on_navigation(() => {
        if (should_run_faction()) {
          process_page();
        }
      });
      window.addEventListener("ff-config-updated", () => {
        if (should_run_faction()) {
          const lists = document.querySelectorAll(
            ".members-list, .chain-attacks-list, .enemy-faction, .your-faction"
          );
          for (const list of lists) {
            if (list instanceof HTMLElement) {
              apply_ff_columns(list).catch((err) => {
                log$a.error(err);
              });
            }
          }
        }
      });
      if (should_run_faction()) {
        process_page();
      }
    }
  };
  const __vite_glob_0_2 = Object.freeze( Object.defineProperty({
    __proto__: null,
    default: index$c,
    getFilterBoxHandle,
    initialize_features,
    setup_war_features,
    should_run_faction
  }, Symbol.toStringTag, { value: "Module" }));
  const log$9 = logger.child("feature:fallback");
  const FEATURE_NAME_HONOR_BAR = "fallback-honor-bar";
  const FEATURE_NAME_USER_NAME = "fallback-user-name";
  const FEATURE_NAME$3 = "fallback";
  function is_excluded_page() {
    switch (true) {
      case torn_page("gym"):
      case torn_page("item"):
      case torn_page("city"):
      case torn_page("casino"):
      case torn_page("calendar"):
      case torn_page("preferences"):
      case torn_page("estateagents"):
      case torn_page("profiles"):
      case torn_page("pc"):
      case torn_page("citystats"):
      case torn_page("usersonline"):
      case torn_page("displaycase"):
      case torn_page("bank"):
      case torn_page("loan"):
      case torn_page("donator"):
      case torn_page("token_shop"):
      case torn_page("freebies"):
      case torn_page("bigalgunshop"):
      case torn_page("shops"):
      case torn_page("joblisting"):
      case torn_page("messageinc"):
      case torn_page("comics"):
      case torn_page("archives"):
      case torn_page("rules"):
      case torn_page("credits"):
      case torn_page("committee"):
      case torn_page("church"):
      case torn_page("christmas_town"):
      case torn_page("index", { page: "hunting" }):
      case torn_page("index", { page: "bank" }):
      case torn_page("page", { sid: "slotsLastRolls" }):
      case torn_page("page", { sid: "rouletteLastSpins" }):
      case torn_page("page", { sid: "highlowLastGames" }):
      case torn_page("page", { sid: "kenoLastGames" }):
      case torn_page("page", { sid: "crapsLastRolls" }):
      case torn_page("page", { sid: "blackjackLastGames" }):
      case torn_page("page", { sid: "spinTheWheelLastSpins" }):
      case torn_page("page", { sid: "bunker" }):
      case torn_page("page", { sid: "points" }):
      case torn_page("page", { sid: "itemsMods" }):
      case torn_page("page", { sid: "keepsakes" }):
      case torn_page("page", { sid: "ammo" }):
      case torn_page("page", { sid: "awards" }):
      case torn_page("page", { sid: "log" }):
      case torn_page("page", { sid: "events" }):
      case torn_page("page", { sid: "crimes" }):
      case torn_page("page", { sid: "crimesRecord" }):
      case torn_page("page", { sid: "factionWarfare" }):
      case torn_page("page", { sid: "travel" }):
      case torn_page("page", { sid: "missions" }):
      case torn_page("page", { sid: "stocks" }):
      case torn_page("page", { sid: "slots" }):
      case torn_page("page", { sid: "roulette" }):
      case torn_page("page", { sid: "highlow" }):
      case torn_page("page", { sid: "keno" }):
      case torn_page("page", { sid: "craps" }):
      case torn_page("page", { sid: "bookie" }):
      case torn_page("page", { sid: "blackjack" }):
      case torn_page("page", { sid: "spinTheWheel" }):
      case torn_page("page", { sid: "education" }):
      case torn_page("page", { sid: "itemMarket" }):
        return true;
      default:
        if (torn_page("factions", { step: "your" })) {
          const hash = window.location.hash;
          if (!(hash.startsWith("#/war/") || hash === "#/tab=info" || hash.startsWith("#/tab=controls"))) {
            return true;
          }
        }
        return false;
    }
  }
  async function find_mutation_target() {
    const content_wrapper = await wait_for_element(".content-wrapper", 1e4);
    if (content_wrapper) {
      return content_wrapper;
    }
    await wait_for_body(1e4);
    return document.body;
  }
  const index$b = {
    name: "Fallback mutation observer",
    description: "Catch all mutations and see if we can apply FF data",
    executionTime: StartTime.DocumentBody,
    async shouldRun() {
      return true;
    },
    async run() {
      const IGNORED_TAGS = new Set([
        "SCRIPT",
        "STYLE",
        "LINK",
        "META",
        "SVG",
        "PATH",
        "BR",
        "HR",
        "HEAD",
        "TITLE"
      ]);
      const get_page_selectors = () => {
        const href = window.location.href;
        let page_specific = [];
        if (href.startsWith("https://www.torn.com/companies.php")) {
          page_specific = [".employee", ".director"];
        } else if (href.startsWith("https://www.torn.com/page.php?sid=competition#/team")) {
          page_specific = ['[class*="name__"]'];
        } else if (href.startsWith("https://www.torn.com/joblist.php")) {
          page_specific = [".employee", ".director"];
        } else if (torn_page("messages") || torn_page("index") || torn_page("page", { sid: "UserList" })) {
          page_specific = [".name"];
        } else if (href.startsWith("https://www.torn.com/bounties.php")) {
          page_specific = [".target, .listed"];
        } else if (href.startsWith("https://www.torn.com/page.php?sid=attackLog")) {
          page_specific = ["ul.participants-list li"];
        } else if (href.startsWith("https://www.torn.com/forums.php")) {
          page_specific = [".last-poster, .starter, .last-post, .poster"];
        } else if (href.includes("page.php?sid=hof") || torn_page("factions", { step: "profile" }) || torn_page("factions", { step: "your" }, [
          "",
          "#",
          "#/",
          "#/tab=info",
          "#/war/*"
        ])) {
          page_specific = ['[class*="userInfoBox__"]'];
        }
        if (page_specific.length > 0) {
          const combined = [".honor-text-wrap", ...page_specific].join(", ");
          return {
            has_page_specific: true,
            page_specific_selectors: page_specific,
            combined_selector: combined
          };
        }
        return {
          has_page_specific: false,
          page_specific_selectors: [],
          combined_selector: ".honor-text-wrap, .user-wrap.user-name, .user.name"
        };
      };
      let current_config = get_page_selectors();
      let is_observing = false;
      const check_mutation = async (node) => {
        if (!node.querySelectorAll || IGNORED_TAGS.has(node.tagName)) {
          return;
        }
        if (!node.matches(current_config.combined_selector) && !node.querySelector(current_config.combined_selector)) {
          return;
        }
        const honor_bars = node.querySelectorAll(
          ".honor-text-wrap"
        );
        if (honor_bars.length > 0) {
          apply_ff_gauge_selector(
            honor_bars,
            FEATURE_NAME_HONOR_BAR,
            GaugeAttachMode.HONOR_BAR
          );
        } else if (current_config.has_page_specific) {
          for (const selector of current_config.page_specific_selectors) {
            apply_ff_gauge_selector(
              node.querySelectorAll(selector),
              FEATURE_NAME$3,
              GaugeAttachMode.FALLBACK
            );
          }
        } else {
          const userwrap = node.querySelectorAll(
            ".user-wrap.user-name"
          );
          if (userwrap.length > 0) {
            apply_ff_gauge_selector(
              userwrap,
              FEATURE_NAME_USER_NAME,
              GaugeAttachMode.FALLBACK
            );
            return;
          }
          const username = node.querySelectorAll(
            ".user.name"
          );
          if (username.length > 0) {
            apply_ff_gauge_selector(
              username,
              FEATURE_NAME_USER_NAME,
              GaugeAttachMode.FALLBACK
            );
          }
        }
        ffscouter.complete();
      };
      const ff_gauge_observer = new MutationObserver(async (mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node instanceof Element) {
              check_mutation(node);
            }
          }
        }
      });
      const update_observer_state = async () => {
        const excluded = is_excluded_page();
        if (excluded) {
          if (is_observing) {
            ff_gauge_observer.disconnect();
            is_observing = false;
            log$9.debug("Disconnected fallback MutationObserver (excluded page)");
          }
        } else {
          current_config = get_page_selectors();
          if (!is_observing) {
            const target = await find_mutation_target();
            ff_gauge_observer.observe(target, {
              attributes: false,
              childList: true,
              characterData: false,
              subtree: true
            });
            is_observing = true;
            log$9.debug("Connected fallback MutationObserver (included page)");
            if (target) {
              check_mutation(target);
            }
          }
        }
      };
      on_navigation(() => {
        log$9.debug("Navigation detected, re-evaluating fallback observer state");
        update_observer_state();
      });
      update_observer_state();
    },
    httpIntercept: {
      before(_url, _init) {
        return void 0;
      },
      after(_bodyText, _response, _ctx) {
        return void 0;
      }
    }
  };
  const __vite_glob_0_3 = Object.freeze( Object.defineProperty({
    __proto__: null,
    default: index$b
  }, Symbol.toStringTag, { value: "Module" }));
  const log$8 = logger.child("ui");
  var TOAST_LEVEL = ((TOAST_LEVEL2) => {
    TOAST_LEVEL2[TOAST_LEVEL2["DEBUG"] = 0] = "DEBUG";
    TOAST_LEVEL2[TOAST_LEVEL2["INFO"] = 1] = "INFO";
    TOAST_LEVEL2[TOAST_LEVEL2["WARNING"] = 2] = "WARNING";
    TOAST_LEVEL2[TOAST_LEVEL2["ERROR"] = 3] = "ERROR";
    return TOAST_LEVEL2;
  })(TOAST_LEVEL || {});
  const TOAST_COLOURS = {
    [
      0
]: "blue",
    [
      1
]: "green",
    [
      2
]: "orange",
    [
      3
]: "#c62828"
  };
  function get_toast_colour(level) {
    return TOAST_COLOURS[level];
  }
  function toast(message, level = 1) {
    const existing = document.getElementById("ffscouter-toast");
    if (existing) existing.remove();
    const toast2 = document.createElement("div");
    toast2.id = "ffscouter-toast";
    toast2.style.position = "fixed";
    toast2.style.bottom = "30px";
    toast2.style.left = "50%";
    toast2.style.transform = "translateX(-50%)";
    toast2.style.color = "#fff";
    toast2.style.padding = "8px 16px";
    toast2.style.borderRadius = "8px";
    toast2.style.fontSize = "14px";
    toast2.style.boxShadow = "0 2px 12px rgba(0,0,0,0.2)";
    toast2.style.zIndex = "2147483647";
    toast2.style.opacity = "1";
    toast2.style.transition = "opacity 0.5s";
    toast2.style.display = "flex";
    toast2.style.alignItems = "center";
    toast2.style.gap = "10px";
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "×";
    closeBtn.style.cursor = "pointer";
    closeBtn.style.marginLeft = "8px";
    closeBtn.style.fontWeight = "bold";
    closeBtn.style.fontSize = "18px";
    closeBtn.style.background = "none";
    closeBtn.style.border = "none";
    closeBtn.style.color = "inherit";
    closeBtn.style.padding = "0";
    closeBtn.style.lineHeight = "1";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.onclick = () => toast2.remove();
    toast2.style.background = get_toast_colour(level);
    const msg = document.createElement("span");
    if (message === "Invalid API key. Please sign up at ffscouter.com to use this service") {
      msg.innerHTML = 'FairFight Scouter V2: Invalid API key. Please sign up at <a href="https://ffscouter.com" target="_blank" style="color: #fff; text-decoration: underline; font-weight: bold;">ffscouter.com</a> to use this service. Register the API key with the script.';
    } else {
      msg.textContent = `FairFight Scouter V2: ${message}`;
    }
    log$8.info("[FF Scouter V2] Toast: ", message);
    toast2.appendChild(msg);
    toast2.appendChild(closeBtn);
    document.body.appendChild(toast2);
    setTimeout(() => {
      if (toast2.parentNode) {
        toast2.style.opacity = "0";
        setTimeout(() => toast2.remove(), 500);
      }
    }, 4e3);
  }
  const log$7 = logger.child("feature:ff-button");
  const CACHE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1e3;
  const POLL_INTERVAL_MS = 24 * 60 * 60 * 1e3;
  function get_active_filters() {
    return {
      minlevel: ffconfig.chain_min_level,
      maxlevel: ffconfig.chain_max_level,
      minff: ffconfig.chain_min_ff,
      maxff: ffconfig.chain_max_ff,
      inactive: ffconfig.chain_inactive,
      factionless: ffconfig.chain_factionless
    };
  }
  function filters_changed(a, b) {
    return a.minlevel !== b.minlevel || a.maxlevel !== b.maxlevel || a.minff !== b.minff || a.maxff !== b.maxff || a.inactive !== b.inactive || a.factionless !== b.factionless;
  }
  async function update_ff_targets(force = false) {
    const key = ffconfig.key;
    if (!key) {
      log$7.debug("API key not set, skipping target fetch");
      return;
    }
    const currentFilters = get_active_filters();
    const cached = ffconfig.chain_targets;
    const hasNoCacheOrExpired = !cached || Date.now() > cached.expiry;
    const filtersChanged = cached && filters_changed(cached.filters, currentFilters);
    const timeToRefresh = cached && (!cached.last_updated || Date.now() - cached.last_updated > POLL_INTERVAL_MS);
    if (!force && !hasNoCacheOrExpired && !filtersChanged && !timeToRefresh) {
      log$7.debug(
        "Using cached targets, not expired, filters match, and not time to poll yet"
      );
      return;
    }
    try {
      const response = await query_targets(key, {
        minlevel: currentFilters.minlevel,
        maxlevel: currentFilters.maxlevel,
        minff: currentFilters.minff,
        maxff: currentFilters.maxff,
        inactiveonly: currentFilters.inactive ? 1 : 0,
        factionless: currentFilters.factionless ? 1 : 0,
        limit: 50
      });
      if (response?.targets) {
        ffconfig.chain_targets = {
          targets: response.targets,
          expiry: Date.now() + CACHE_LIFETIME_MS,
          last_updated: Date.now(),
          filters: currentFilters
        };
        ffconfig.chain_target_index = 0;
        log$7.info(
          `Chain targets updated successfully: ${response.targets.length} targets found`
        );
      }
    } catch (err) {
      log$7.error("Failed to update chain targets:", err);
    }
  }
  function get_next_target_index(maxLen) {
    const val = ffconfig.chain_target_index;
    let nextVal = val + 1;
    if (nextVal >= maxLen) {
      nextVal = 0;
    }
    ffconfig.chain_target_index = nextVal;
    return val < maxLen ? val : 0;
  }
  function get_random_chain_target() {
    const cached = ffconfig.chain_targets;
    if (!cached || !cached.targets || cached.targets.length === 0) {
      return null;
    }
    const index2 = get_next_target_index(cached.targets.length);
    return cached.targets[index2] ?? null;
  }
  function remove_chain_button() {
    const button = document.getElementById("ff-scouter-chain-btn");
    if (button) {
      button.remove();
    }
  }
  function update_anchor_attributes(anchor) {
    const cached = ffconfig.chain_targets;
    if (!cached || !cached.targets || cached.targets.length === 0) {
      anchor.href = "#";
      anchor.removeAttribute("target");
      return;
    }
    const idx = ffconfig.chain_target_index;
    const currentTarget = cached.targets[idx < cached.targets.length ? idx : 0];
    if (!currentTarget) {
      anchor.href = "#";
      anchor.removeAttribute("target");
      return;
    }
    const linkType = ffconfig.chain_link_type;
    anchor.href = linkType === "profile" ? `https://www.torn.com/profiles.php?XID=${currentTarget.player_id}` : get_attack_url(currentTarget.player_id);
    anchor.target = ffconfig.chain_tab_type === "sametab" ? "_self" : "_blank";
  }
  function create_chain_button() {
    if (!ffconfig.chain_button_enabled || !ffconfig.key) {
      remove_chain_button();
      return;
    }
    const existing = document.getElementById(
      "ff-scouter-chain-btn"
    );
    if (existing) {
      update_anchor_attributes(existing);
      return;
    }
    const anchor = document.createElement("a");
    anchor.id = "ff-scouter-chain-btn";
    anchor.innerHTML = "FF";
    anchor.style.position = "fixed";
    anchor.style.top = "32%";
    anchor.style.right = "0%";
    anchor.style.zIndex = "9999";
    anchor.style.backgroundColor = "green";
    anchor.style.color = "white";
    anchor.style.border = "none";
    anchor.style.padding = "6px";
    anchor.style.borderRadius = "6px";
    anchor.style.cursor = "pointer";
    anchor.style.display = "block";
    anchor.style.textDecoration = "none";
    update_anchor_attributes(anchor);
    const handler = async (e) => {
      if (e instanceof KeyboardEvent) {
        if (e.key !== "Enter") {
          return;
        }
      } else if (e instanceof MouseEvent) {
        if (e.button !== 0 && e.button !== 1 && e.button !== 2) {
          return;
        }
      }
      const cached = ffconfig.chain_targets;
      if (!cached || !cached.targets || cached.targets.length === 0) {
        e.preventDefault();
        const isPrimary = e instanceof MouseEvent && e.button === 0 || e instanceof KeyboardEvent;
        if (isPrimary) {
          toast("No cached targets found. Fetching...", TOAST_LEVEL.WARNING);
          update_ff_targets(true).then(() => {
            const newCached = ffconfig.chain_targets;
            if (!newCached || !newCached.targets || newCached.targets.length === 0) {
              toast(
                "No targets available matching your criteria.",
                TOAST_LEVEL.ERROR
              );
              return;
            }
            update_anchor_attributes(anchor);
            toast("Targets loaded. Click to navigate!", TOAST_LEVEL.INFO);
          });
        }
        return;
      }
      get_next_target_index(cached.targets.length);
      update_anchor_attributes(anchor);
    };
    anchor.addEventListener("mousedown", handler);
    anchor.addEventListener("keydown", handler);
    document.body.appendChild(anchor);
  }
  const index$a = {
    name: "FF Target Finder Button",
    description: "Renders the floating green FF button to cycle through potential targets",
    executionTime: StartTime.DocumentBody,
    async shouldRun() {
      return true;
    },
    async run() {
      if (!ffconfig.chain_button_enabled || !ffconfig.key) {
        remove_chain_button();
        return;
      }
      update_ff_targets().then(() => {
        const button = document.getElementById(
          "ff-scouter-chain-btn"
        );
        if (button) {
          update_anchor_attributes(button);
        }
      });
      create_chain_button();
      window.addEventListener("ff-config-updated", async () => {
        if (!ffconfig.chain_button_enabled || !ffconfig.key) {
          remove_chain_button();
          return;
        }
        const cached = ffconfig.chain_targets;
        const currentFilters = get_active_filters();
        if (!cached || filters_changed(cached.filters, currentFilters)) {
          log$7.info("Target filters changed, refetching targets immediately");
          await update_ff_targets(true);
        }
        create_chain_button();
      });
    }
  };
  const __vite_glob_0_4 = Object.freeze( Object.defineProperty({
    __proto__: null,
    CACHE_LIFETIME_MS,
    POLL_INTERVAL_MS,
    create_chain_button,
    default: index$a,
    filters_changed,
    get_active_filters,
    get_next_target_index,
    get_random_chain_target,
    remove_chain_button,
    update_anchor_attributes,
    update_ff_targets
  }, Symbol.toStringTag, { value: "Module" }));
  const FEATURE_NAME$2 = "item_market";
  const log$6 = logger.child(`feature:${FEATURE_NAME$2}`);
  const index$9 = {
    name: "Item market FF display",
    description: "Shows FF on the item market page",
    executionTime: StartTime.DocumentBody,
    async shouldRun() {
      return torn_page("page", { sid: "ItemMarket" });
    },
    async run() {
      const root = await wait_for_element('[class*="marketWrapper__"', 1e4);
      if (!root) {
        return;
      }
      log$6.info("Found item list wrapper!");
      log$6.debug("Root element:", root);
      const process = () => {
        apply_ff_gauge_selector(
          root.querySelectorAll(
            "div.bazaar-listing-card div:first-child div:first-child > a"
          ),
          FEATURE_NAME$2,
          GaugeAttachMode.FALLBACK
        );
        apply_ff_gauge_selector(
          root.querySelectorAll(".bazaar-card a"),
          FEATURE_NAME$2,
          GaugeAttachMode.FALLBACK
        );
        apply_ff_gauge_selector(
          root.querySelectorAll(".bazaar-card .bazaar-card-name"),
          FEATURE_NAME$2,
          GaugeAttachMode.FALLBACK
        );
        apply_ff_gauge_selector(
          root.querySelectorAll(".honor-text-wrap"),
          FEATURE_NAME$2,
          GaugeAttachMode.HONOR_BAR
        );
        apply_ff_gauge_selector(
          root.querySelectorAll('[class*="userInfoWrapper__"]'),
          FEATURE_NAME$2,
          GaugeAttachMode.FALLBACK
        );
      };
      const observer = new MutationObserver(process);
      observer.observe(root, {
        childList: true,
        subtree: true
      });
    },
    httpIntercept: {
      before(_url, _init) {
        return void 0;
      },
      after(_bodyText, _response, _ctx) {
        return void 0;
      }
    }
  };
  const __vite_glob_0_5 = Object.freeze( Object.defineProperty({
    __proto__: null,
    default: index$9
  }, Symbol.toStringTag, { value: "Module" }));
  const log$5 = logger.child("ui");
  const PREMIUM_UPGRADE_URL = "https://ffscouter.com/premium";
  function format_duration_human(totalSeconds, compact) {
    const clampedSeconds = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(clampedSeconds / 3600);
    const minutes = Math.floor(clampedSeconds % 3600 / 60);
    const seconds = clampedSeconds % 60;
    const parts = [];
    if (hours > 0) {
      parts.push(`${hours}h`);
    }
    if (hours > 0 || minutes > 0) {
      parts.push(`${minutes}m`);
    }
    parts.push(`${seconds}s`);
    if (compact) {
      return parts.join("");
    }
    return parts.join(" ");
  }
  function format_tct_time(unixSeconds) {
    if (!Number.isFinite(unixSeconds)) return null;
    const d2 = new Date(unixSeconds * 1e3);
    const hours = String(d2.getUTCHours()).padStart(2, "0");
    const minutes = String(d2.getUTCMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }
  function FFFlightProfileStatus({ playerId, compact = false }) {
    const [data, setData] = useState(null);
    const [isPremium, setIsPremium] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentTimeSeconds, setCurrentTimeSeconds] = useState(
      get_current_time_seconds
    );
    const [prevPlayerId, setPrevPlayerId] = useState(playerId);
    if (playerId !== prevPlayerId) {
      setPrevPlayerId(playerId);
      setData(null);
      setError(null);
      setLoading(true);
      setIsPremium(null);
    }
    const dataRef = useRef(null);
    dataRef.current = data;
    useEffect(() => {
      if (!playerId) return;
      let active = true;
      const fetchData = async () => {
        if (!active) return;
        let isPremiumResult;
        try {
          isPremiumResult = await check_key_status.is_premium();
        } catch (err) {
          log$5.error("Failed to check premium status", err);
          if (active) setLoading(false);
          return;
        }
        if (!active) return;
        setIsPremium(isPremiumResult);
        if (!isPremiumResult) {
          setLoading(false);
          return;
        }
        try {
          const result = await ffscouter.get_flights(playerId);
          if (!active) return;
          setData(result);
          setError(null);
        } catch (err) {
          if (!active) return;
          log$5.error("Failed to fetch flight data", err);
          if (err instanceof FFApiError) {
            const code = err.ff_api_error?.code;
            if (code === 19) {
              setIsPremium(false);
            } else if (code === 2 || code === 10 || code === 12) {
              setError("Invalid API key");
            } else if (code === 20) {
              setError("Rate limit exceeded. Retrying...");
            } else {
              setError(
                err.ff_api_error?.error ?? err.message ?? "Flight tracking unavailable"
              );
            }
          } else {
            setError(
              err instanceof Error ? err.message : "Flight tracking unavailable"
            );
          }
        } finally {
          if (active) setLoading(false);
        }
      };
      fetchData();
      const tick = setInterval(() => {
        setCurrentTimeSeconds(get_current_time_seconds());
        const d2 = dataRef.current;
        if (d2?.rechecking && d2.next_retry_at && Date.now() >= d2.next_retry_at) {
          fetchData();
        }
      }, 1e3);
      const fetchInterval = setInterval(() => {
        if (!dataRef.current?.rechecking) {
          fetchData();
        }
      }, 3e4);
      return () => {
        active = false;
        clearInterval(tick);
        clearInterval(fetchInterval);
      };
    }, [playerId]);
    if (!playerId) return null;
    if (isPremium === false) {
      return jsx("div", { className: "ff-scouter-profile-flight-info", children: jsx(
        "a",
        {
          href: PREMIUM_UPGRADE_URL,
          target: "_blank",
          rel: "noopener noreferrer",
          style: { fontWeight: "bold", textDecoration: "underline" },
          children: "Upgrade to FFScouter Flight Tracking"
        }
      ) });
    }
    let content;
    if (error) {
      content = jsxs("span", { style: { color: "#ff6b6b" }, children: [
        "Error: ",
        error
      ] });
    } else if (loading && !data) {
      content = compact ? "Estimating..." : "Landing: estimating...";
    } else {
      const current = data?.current;
      if (data?.rechecking) {
        const next = data.next_retry_at ?? 0;
        const seconds = Math.max(0, Math.ceil((next - Date.now()) / 1e3));
        content = compact ? jsxs(Fragment, { children: [
          "No data.",
jsx("br", {}),
          "Rechecking..."
        ] }) : `No data. Rechecking in ${seconds} seconds.`;
      } else if (!current || !current.earliest_arrival_time && !current.latest_arrival_time) {
        content = compact ? "Unavailable" : "Landing: unavailable for current route";
      } else {
        const earliest = Number(current.earliest_arrival_time);
        const latest = Number(current.latest_arrival_time);
        if (!Number.isFinite(earliest) || !Number.isFinite(latest)) {
          content = compact ? "Unavailable" : "Landing: unavailable for current route";
        } else {
          const earliestRemaining = earliest - currentTimeSeconds;
          const latestRemaining = latest - currentTimeSeconds;
          const earliestTct = format_tct_time(earliest);
          const latestTct = format_tct_time(latest);
          if (latestRemaining <= -5 * 60) {
            content = compact ? "Late" : jsxs(Fragment, { children: [
              "Landing: Late, probably flight delayed.",
jsx("br", {}),
              "(",
              latestTct,
              " TCT latest)"
            ] });
          } else if (latestRemaining <= 0) {
            content = compact ? jsxs(Fragment, { children: [
              "Just landed",
jsx("br", {}),
              "(Latest: ",
              latestTct,
              " TCT)"
            ] }) : jsxs(Fragment, { children: [
              "Landing: just landed",
jsx("br", {}),
              "(",
              latestTct,
              " TCT latest)"
            ] });
          } else if (earliestRemaining <= 0) {
            content = compact ? jsxs(Fragment, { children: [
              "Imminent",
jsx("br", {}),
              format_duration_human(latestRemaining, compact),
jsx("br", {})
            ] }) : jsxs(Fragment, { children: [
              "Landing: imminent -",
              " ",
              format_duration_human(latestRemaining, compact),
jsx("br", {}),
              "(Latest: ",
              latestTct,
              " TCT)"
            ] });
          } else {
            content = compact ? jsxs(Fragment, { children: [
              format_duration_human(earliestRemaining, compact),
jsx("br", {}),
              format_duration_human(latestRemaining, compact)
            ] }) : jsxs(Fragment, { children: [
              "Landing: ",
              format_duration_human(earliestRemaining, compact),
              " -",
              " ",
              format_duration_human(latestRemaining, compact),
jsx("br", {}),
              "(",
              earliestTct,
              " - ",
              latestTct,
              " TCT)"
            ] });
          }
        }
      }
    }
    return jsx("div", { className: "ff-scouter-profile-flight-info", children: content });
  }
  const log$4 = logger.child("feature:mini-profile-flights");
  const FLIGHT_CONTAINER_CLASS = "ff-flight-element";
  function is_flying$1(status) {
    return status.classList.contains("travelling");
  }
  const monitor_mini_profile_root$1 = () => {
    const miniprofile = document.querySelector("#profile-mini-root");
    if (miniprofile) {
      log$4.debug("profile-mini-root already exists.");
      setup_mini_flight_observer();
      return;
    }
    const mini_body_observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement && node.id === "profile-mini-root") {
            setup_mini_flight_observer();
            mini_body_observer.disconnect();
          }
        }
      }
    });
    mini_body_observer.observe(document.body, { childList: true });
  };
  const setup_mini_flight_observer = async () => {
    const miniroot = document.querySelector("#profile-mini-root");
    if (!miniroot) {
      return;
    }
    const container = document.createElement("div");
    container.classList.add(FLIGHT_CONTAINER_CLASS);
    let root = null;
    let lastPlayerId = null;
    const renderForPlayer = (player_id2) => {
      if (!root) {
        root = createRoot(container);
      }
      root.render(
        createElement(FFFlightProfileStatus, {
          playerId: player_id2,
          compact: true
        })
      );
    };
    const mp_observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (Array.from(mutation.addedNodes).some(
          (node) => node instanceof HTMLElement && (node.classList.contains(FLIGHT_CONTAINER_CLASS) || node.classList.contains("ff-scouter-profile-flight-info"))
        )) {
          return;
        }
      }
      const player_id2 = get_player_id_in_element(miniroot);
      if (!player_id2) {
        lastPlayerId = null;
        return;
      }
      if (player_id2 === lastPlayerId) {
        return;
      }
      lastPlayerId = player_id2;
      const status2 = miniroot.querySelector(".profile-container");
      if (!status2) {
        return;
      }
      renderForPlayer(player_id2);
      if (is_flying$1(status2)) {
        const description = status2.querySelector(".description");
        if (description && !description.contains(container)) {
          log$4.debug(
            `Player ${player_id2} is flying, adding flight tracker to mini-profile`
          );
          description.appendChild(container);
        }
      } else {
        container.remove();
        ffscouter.clear_flight_cache(player_id2);
      }
    });
    mp_observer.observe(miniroot, { childList: true, subtree: true });
    const player_id = get_player_id_in_element(miniroot);
    const status = miniroot.querySelector(".profile-status");
    if (player_id && status) {
      renderForPlayer(player_id);
      lastPlayerId = player_id;
      if (is_flying$1(status)) {
        const description = status.querySelector(".description");
        if (description && !description.contains(container)) {
          description.appendChild(container);
        }
      }
    }
  };
  const index$8 = {
    name: "Mini profile flight tracking",
    description: "Display flight estimates on player mini-profiles if they're flying",
    executionTime: StartTime.DocumentBody,
    async shouldRun() {
      return true;
    },
    async run() {
      monitor_mini_profile_root$1();
      log$4.debug("mini-profile-flights installed");
    },
    httpIntercept: {
      before(_url, _init) {
        return void 0;
      },
      after(_bodyText, _response, _ctx) {
        return void 0;
      }
    }
  };
  const __vite_glob_0_6 = Object.freeze( Object.defineProperty({
    __proto__: null,
    default: index$8
  }, Symbol.toStringTag, { value: "Module" }));
  const log$3 = logger.child("feature:mini-profile");
  const FEATURE_NAME$1 = "mini-profile";
  const monitor_mini_profile_root = () => {
    const miniprofile = document.querySelector("#profile-mini-root");
    if (miniprofile) {
      log$3.debug("profile-mini-root already exists.");
      setup_mini_observer();
      return;
    }
    const mini_body_observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement && node.id === "profile-mini-root") {
            setup_mini_observer();
            mini_body_observer.disconnect();
          }
        }
      }
    });
    mini_body_observer.observe(document.body, { childList: true });
  };
  const setup_mini_observer = () => {
    const miniroot = document.querySelector("#profile-mini-root");
    if (!miniroot) {
      return;
    }
    let lastPlayerId = null;
    const mp_observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.target instanceof HTMLElement && mutation.target.classList.contains("ffscouter-gauge")) {
          return;
        }
        if (Array.from(mutation.addedNodes).some(
          (node) => node instanceof HTMLElement && node.classList.contains("ffscouter-mini-desc")
        )) {
          return;
        }
      }
      const player_id = get_player_id_in_element(miniroot);
      if (!player_id) {
        lastPlayerId = null;
        return;
      }
      if (player_id === lastPlayerId) {
        return;
      }
      lastPlayerId = player_id;
      ffscouter.get(player_id).then(async (d2) => {
        const current_player_id = get_player_id_in_element(miniroot);
        if (current_player_id !== player_id) {
          return;
        }
        if (d2.no_data) {
          return;
        }
        log$3.debug(`Found mini profile update for ${player_id}, adding ff data`);
        for (const bar of miniroot.querySelectorAll(".honor-text-wrap")) {
          apply_ff_gauge(bar, FEATURE_NAME$1, GaugeAttachMode.HONOR_BAR);
        }
        miniroot.querySelector(".ffscouter-mini-desc")?.remove();
        const ff_string = format_ff_score(d2);
        const fresh = format_relative_time(extract_last_updated(d2));
        const marker = get_source_marker(extract_source(d2));
        const desc = document.createElement("span");
        desc.classList.add("ffscouter-mini-desc");
        desc.append(`FF ${ff_string}`);
        if (marker) {
          desc.appendChild(
            make_source_marker_svg(marker, "ffscouter-inline-source-marker")
          );
        }
        desc.append(` ${fresh}`);
        const lastaction = miniroot.querySelector(".last-action");
        lastaction?.appendChild(document.createElement("br"));
        lastaction?.appendChild(desc);
      }).catch((err) => {
        log$3.error(err);
      });
      ffscouter.complete();
    });
    mp_observer.observe(miniroot, { childList: true, subtree: true });
  };
  const index$7 = {
    name: "Fill mini profile",
    description: "Add FF data to mini profile",
    executionTime: StartTime.DocumentBody,
    async shouldRun() {
      return true;
    },
    async run() {
      monitor_mini_profile_root();
      log$3.debug("mini-profile installed");
    },
    httpIntercept: {
      before(_url, _init) {
        return void 0;
      },
      after(_bodyText, _response, _ctx) {
        return void 0;
      }
    }
  };
  const __vite_glob_0_7 = Object.freeze( Object.defineProperty({
    __proto__: null,
    default: index$7
  }, Symbol.toStringTag, { value: "Module" }));
  function is_flying(status) {
    return status.classList.contains("travelling");
  }
  const index$6 = {
    name: "Profile flight tracking",
    description: "Display flight estimates on player profiles if they're flying",
    executionTime: StartTime.DocumentBody,
    async shouldRun() {
      return torn_page("profiles");
    },
    async run() {
      const player_id = extract_id_from_url(window.location.href);
      if (!player_id) {
        return;
      }
      const status = await wait_for_element(".profile-status", 1e4);
      if (!status) {
        return;
      }
      const container = document.createElement("div");
      container.classList.add("ff-flight-element");
      createRoot(container).render(
        createElement(FFFlightProfileStatus, { playerId: player_id })
      );
      const check_and_update = () => {
        if (is_flying(status)) {
          const description = status.querySelector(".description");
          if (description === null) {
            return;
          }
          if (!description.contains(container)) {
            description.appendChild(container);
          }
        } else {
          container.remove();
          ffscouter.clear_flight_cache(player_id);
        }
      };
      const status_observer = new MutationObserver(check_and_update);
      status_observer.observe(status, {
        attributes: true,
        attributeFilter: ["class"]
      });
      check_and_update();
    },
    httpIntercept: {
      before(_url, _init) {
        return void 0;
      },
      after(_bodyText, _response, _ctx) {
        return void 0;
      }
    }
  };
  const __vite_glob_0_8 = Object.freeze( Object.defineProperty({
    __proto__: null,
    default: index$6
  }, Symbol.toStringTag, { value: "Module" }));
  const index$5 = {
    name: "Profile FF history",
    description: "Add a button to all user's profiles to link to ffscouter.com",
    executionTime: StartTime.DocumentBody,
    async shouldRun() {
      return torn_page("profiles");
    },
    async run() {
      const player_id = extract_id_from_url(window.location.href);
      if (!player_id) {
        return;
      }
      if (!ffconfig.ff_history_enabled) return;
      if (document.querySelector(".ff-scouter-history-btn")) return;
      const buttonsList = await wait_for_element(
        ".profile-buttons.profile-action .buttons-list",
        1e4
      );
      if (!buttonsList) return;
      const btn = document.createElement("a");
      btn.href = `https://ffscouter.com/player-view?player_id=${player_id}`;
      btn.target = "_blank";
      btn.rel = "noopener noreferrer";
      btn.className = "profile-button ff-scouter-history-btn";
      btn.title = "View Stats History on FFScouter";
      const container = document.createElement("div");
      container.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" viewBox="640 178 46 46" class="icon___GP196">
  <g fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <!-- Clock face outline representing history/time -->
    <circle cx="663" cy="201" r="17" />
    <!-- Clock hands pointing to 10:10 -->
    <path d="M663,201 L663,191 M663,201 L671,197" />
  </g>
  <g fill="none" stroke-width="1">
    <text x="657" y="212">FF</text>
  </g>
</svg>`;
      for (const node of container.children) {
        btn.appendChild(node);
      }
      const label = document.createElement("span");
      label.className = "ff-history-label";
      label.textContent = "FF\nHistory";
      buttonsList.appendChild(btn);
    },
    httpIntercept: {
      before(_url, _init) {
        return void 0;
      },
      after(_bodyText, _response, _ctx) {
        return void 0;
      }
    }
  };
  const __vite_glob_0_9 = Object.freeze( Object.defineProperty({
    __proto__: null,
    default: index$5
  }, Symbol.toStringTag, { value: "Module" }));
  async function inject_info_line(info_line) {
    const h4 = await wait_for_element("h4", 1e4);
    if (!h4) {
      return;
    }
    const links_top_wrap = h4.parentNode?.querySelector(".links-top-wrap");
    if (links_top_wrap?.parentNode) {
      links_top_wrap.parentNode.insertBefore(
        info_line,
        links_top_wrap.nextSibling
      );
    } else {
      h4.after(info_line);
    }
  }
  const index$4 = {
    name: "Profile FF display",
    description: "Shows FF on top left of any profile page",
    executionTime: StartTime.DocumentBody,
    async shouldRun() {
      return torn_page("profiles");
    },
    async run() {
      const info_line = create_info_line();
      if (!ffconfig.key) {
        info_line.innerHTML = "[FF Scouter V2]: Limited API key needed - enter in FF Scouter Settings below";
        inject_info_line(info_line);
        return;
      }
      const player_id = extract_id_from_url(window.location.href);
      if (!player_id) {
        return;
      }
      mountComponent(
        createElement(FFHeaderLine, { playerId: player_id }),
        info_line
      );
      inject_info_line(info_line);
    },
    httpIntercept: {
      before(_url, _init) {
        return void 0;
      },
      after(_bodyText, _response, _ctx) {
        return void 0;
      }
    }
  };
  const __vite_glob_0_10 = Object.freeze( Object.defineProperty({
    __proto__: null,
    default: index$4
  }, Symbol.toStringTag, { value: "Module" }));
  const FEATURE_NAME = "rr";
  const index$3 = {
    name: "Russian Roulette FF display",
    description: "Shows FF on the Russian Roulette page",
    executionTime: StartTime.DocumentBody,
    async shouldRun() {
      return torn_page("page", { sid: "russianRoulette" });
    },
    async run() {
      const rows_wrapper = await wait_for_element(
        '[class*="rowsWrap__"]',
        2e4
      );
      if (!rows_wrapper || !(rows_wrapper instanceof HTMLElement)) {
        return;
      }
      const row_matcher = (node) => {
        const user_info_wrapper = node.querySelector(
          '.honor-text-wrap, [class*="userInfoBlock__"]'
        );
        return user_info_wrapper !== null;
      };
      const row_handler = (options) => {
        if (!options.added) {
          return;
        }
        const honor_bar = options.added.querySelector(".honor-text-wrap");
        if (honor_bar) {
          apply_ff_gauge(honor_bar, FEATURE_NAME, GaugeAttachMode.HONOR_BAR);
          return;
        }
        const user_info_wrapper = options.added.querySelector(
          '[class*="userInfoBlock__"]'
        );
        if (user_info_wrapper) {
          apply_ff_gauge(
            user_info_wrapper,
            FEATURE_NAME,
            GaugeAttachMode.FALLBACK
          );
          return;
        }
      };
      const rows_monitor = new MonitorElements(
        row_matcher,
        row_handler,
        rows_wrapper,
        true,
        { added: true },
        0
      );
      rows_monitor.start();
    }
  };
  const __vite_glob_0_11 = Object.freeze( Object.defineProperty({
    __proto__: null,
    default: index$3
  }, Symbol.toStringTag, { value: "Module" }));
  const styles = {
    "ff-settings-panel__accordion": "_ff-settings-panel__accordion_6bhvd_1",
    "ff-settings-panel__accordion--glow": "_ff-settings-panel__accordion--glow_6bhvd_10",
    "ff-settings-panel__body": "_ff-settings-panel__body_6bhvd_20",
    "ff-settings-panel__input-row": "_ff-settings-panel__input-row_6bhvd_24",
    "ff-settings-panel__range-row": "_ff-settings-panel__range-row_6bhvd_32",
    "ff-settings-panel__blur": "_ff-settings-panel__blur_6bhvd_38",
    "ff-settings-panel__error-msg": "_ff-settings-panel__error-msg_6bhvd_48",
    "ff-settings-panel__number": "_ff-settings-panel__number_6bhvd_67",
    "ff-settings-panel__api-explanation": "_ff-settings-panel__api-explanation_6bhvd_94",
    "ff-settings-panel__premium-badge": "_ff-settings-panel__premium-badge_6bhvd_107",
    "ff-settings-panel__premium-badge--enabled": "_ff-settings-panel__premium-badge--enabled_6bhvd_117",
    "ff-settings-panel__premium-badge--disabled": "_ff-settings-panel__premium-badge--disabled_6bhvd_121",
    "ff-settings-panel__premium-badge--unknown": "_ff-settings-panel__premium-badge--unknown_6bhvd_125",
    "ff-settings-panel__section": "_ff-settings-panel__section_6bhvd_138",
    "ff-settings-panel__span": "_ff-settings-panel__span_6bhvd_152",
    "ff-settings-panel__cell": "_ff-settings-panel__cell_6bhvd_160",
    "ff-settings-panel__cell--checkbox": "_ff-settings-panel__cell--checkbox_6bhvd_169",
    "ff-settings-panel__api-block": "_ff-settings-panel__api-block_6bhvd_193",
    "ff-settings-panel__api-status-row": "_ff-settings-panel__api-status-row_6bhvd_203",
    "ff-settings-panel__chain-suboptions": "_ff-settings-panel__chain-suboptions_6bhvd_213",
    "ff-settings-panel__chain-wide": "_ff-settings-panel__chain-wide_6bhvd_218",
    "ff-settings-panel__group": "_ff-settings-panel__group_6bhvd_242",
    "ff-settings-panel__marker-size": "_ff-settings-panel__marker-size_6bhvd_256",
    "ff-settings-panel__marker-border-width": "_ff-settings-panel__marker-border-width_6bhvd_257",
    "ff-settings-panel__marker-size-controls": "_ff-settings-panel__marker-size-controls_6bhvd_263",
    "ff-settings-panel__color-scheme": "_ff-settings-panel__color-scheme_6bhvd_276",
    "ff-settings-panel__color-scheme-controls": "_ff-settings-panel__color-scheme-controls_6bhvd_282",
    "ff-settings-panel__actions": "_ff-settings-panel__actions_6bhvd_295",
    "ff-settings-panel__saved-msg": "_ff-settings-panel__saved-msg_6bhvd_304"
  };
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
    savedMsg: styles["ff-settings-panel__saved-msg"]
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
    warFilterEnabled: CONFIG_DEFAULTS.war_filter_enabled,
    isPremium: null
  };
  function SettingsPanelComponent({
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
    onRendered
  }) {
    useEffect(() => {
      onRendered();
    });
    const previewColor = get_palette_for_scheme(drafts.colorScheme)[5] ?? "#888888";
    const previewSourceMarker = get_source_marker("spies");
    return jsxs(
      "details",
      {
        className: `${cls.accordion}${!props.apiKey ? ` ${cls.accordionGlow}` : ""} cont-gray border-round`,
        children: [
jsx("summary", { children: "FF Scouter Settings" }),
jsxs("div", { className: cls.body, children: [
jsxs("div", { className: cls.group, children: [
jsx("h4", { children: "API Key & Premium" }),
jsxs("div", { className: cls.section, children: [
jsxs("div", { className: `${cls.apiExplanation} ${cls.span}`, children: [
jsx("strong", { children: "Important:" }),
                  " You must use the SAME exact API key that you use on",
                  " ",
jsx("a", { href: "https://ffscouter.com/", target: "_blank", rel: "noreferrer", children: "ffscouter.com" }),
                  ". ",
jsx("br", {}),
jsx("br", {}),
                  "If you're not sure which API key you used, go to",
                  " ",
jsx(
                    "a",
                    {
                      href: "https://www.torn.com/preferences.php#tab=api",
                      target: "_blank",
                      rel: "noreferrer",
                      children: "your API preferences"
                    }
                  ),
                  " ",
                  'and look for "FFScouter3" in your API key history comments.'
                ] }),
jsxs("div", { className: `${cls.span} ${cls.apiBlock}`, children: [
jsxs("div", { className: cls.cell, children: [
jsx("label", { htmlFor: "api-key", children: "API Key:" }),
jsx(
                      "input",
                      {
                        id: "api-key",
                        type: "text",
                        className: props.apiKey ? cls.blur : "",
                        placeholder: "Paste your key here...",
                        value: drafts.apiKey,
                        onChange,
                        onBlur: onApiKeyBlur
                      }
                    )
                  ] }),
jsxs("div", { className: cls.apiStatusRow, children: [
jsx("label", { htmlFor: "ff-premium-badge", children: "FF Scouter Premium:" }),
jsx(
                      "span",
                      {
                        id: "ff-premium-badge",
                        className: `${cls.premiumBadge} ${isPremium === null ? cls.premiumBadgeUnknown : isPremium ? cls.premiumBadgeEnabled : cls.premiumBadgeDisabled}`,
                        children: isPremium === null ? "Unknown" : isPremium ? "Enabled" : "Disabled"
                      }
                    ),
jsx(
                      "button",
                      {
                        type: "button",
                        className: "torn-btn btn-save",
                        onClick: onVerify,
                        children: "Verify"
                      }
                    )
                  ] })
                ] })
              ] })
            ] }),
jsxs("div", { className: cls.group, children: [
jsx("h4", { children: "Gauge Marker Settings" }),
jsxs("div", { className: cls.section, children: [
jsxs("div", { className: cls.cell, children: [
jsx("label", { htmlFor: "gauge-marker-type", children: "Gauge Marker Style:" }),
jsxs(
                    "select",
                    {
                      id: "gauge-marker-type",
                      value: drafts.gaugeMarkerType,
                      onChange,
                      children: [
jsx("option", { value: "arrow", children: "Arrow (Default)" }),
jsx("option", { value: "bubble_ff", children: "Bubble (FF Score)" }),
jsx("option", { value: "bubble_estimate", children: "Bubble (BS Estimate)" })
                      ]
                    }
                  )
                ] }),
jsxs("div", { className: `${cls.span} ${cls.markerSize}`, children: [
jsx("label", { htmlFor: "gauge-marker-scale", children: "Marker Size:" }),
jsxs("div", { className: cls.markerSizeControls, children: [
jsx(
                      "input",
                      {
                        id: "gauge-marker-scale",
                        type: "range",
                        min: "50",
                        max: "200",
                        step: "5",
                        value: drafts.gaugeMarkerScale,
                        onChange
                      }
                    ),
jsx(
                      "input",
                      {
                        id: "gauge-marker-scale-number",
                        type: "number",
                        min: "50",
                        max: "200",
                        step: "5",
                        className: cls.number,
                        value: drafts.gaugeMarkerScale,
                        onChange
                      }
                    ),
jsx("span", { children: "%" })
                  ] })
                ] }),
jsxs("div", { className: `${cls.span} ${cls.markerBorderWidth}`, children: [
jsx("label", { htmlFor: "gauge-marker-border-width", children: "Border Thickness:" }),
jsxs("div", { className: cls.markerSizeControls, children: [
jsx(
                      "input",
                      {
                        id: "gauge-marker-border-width",
                        type: "range",
                        min: "0",
                        max: "3",
                        step: "0.5",
                        value: drafts.gaugeMarkerBorderWidth,
                        onChange
                      }
                    ),
jsx(
                      "input",
                      {
                        id: "gauge-marker-border-width-number",
                        type: "number",
                        min: "0",
                        max: "3",
                        step: "0.5",
                        className: cls.number,
                        value: drafts.gaugeMarkerBorderWidth,
                        onChange
                      }
                    ),
jsx("span", { children: "px" }),
jsxs(
                      "div",
                      {
                        className: "ffscouter-marker-preview",
                        style: {
                          "--ffscouter-marker-scale": drafts.gaugeMarkerScale / 100
                        },
                        children: [
jsxs("span", { className: "ffscouter-preview-marker-slot", children: [
jsxs(
                              "svg",
                              {
                                className: "ffscouter-preview-arrow",
                                viewBox: FF_ARROW_VIEWBOX,
                                children: [
jsx("title", { children: "Preview Gauge Marker" }),
jsx(
                                    "path",
                                    {
                                      fillRule: "evenodd",
                                      fill: previewColor,
                                      stroke: "#000000",
                                      strokeWidth: drafts.gaugeMarkerBorderWidth,
                                      d: FF_ARROW_PATH_D
                                    }
                                  )
                                ]
                              }
                            ),
                            previewSourceMarker && jsx(
                              SourceMarkerIcon,
                              {
                                marker: previewSourceMarker,
                                className: "ffscouter-source-marker"
                              }
                            )
                          ] }),
jsxs("span", { className: "ffscouter-preview-marker-slot", children: [
jsx(
                              "div",
                              {
                                className: "ffscouter-preview-bubble",
                                style: {
                                  backgroundColor: previewColor,
                                  color: get_contrast_color(previewColor),
                                  borderWidth: `${drafts.gaugeMarkerBorderWidth * (drafts.gaugeMarkerScale / 100)}px`
                                },
                                children: "2.34"
                              }
                            ),
                            previewSourceMarker && jsx(
                              SourceMarkerIcon,
                              {
                                marker: previewSourceMarker,
                                className: "ffscouter-source-marker"
                              }
                            )
                          ] })
                        ]
                      }
                    )
                  ] })
                ] }),
jsxs("div", { className: `${cls.span} ${cls.colorScheme}`, children: [
jsx("label", { htmlFor: "color-scheme", children: "Color Scheme:" }),
jsxs("div", { className: cls.colorSchemeControls, children: [
jsxs(
                      "select",
                      {
                        id: "color-scheme",
                        value: drafts.colorScheme,
                        onChange,
                        children: [
jsx("option", { value: "classic", children: "Classic (Default)" }),
jsx("option", { value: "cool_diverging", children: "Cool Diverging" }),
jsx("option", { value: "neon", children: "Neon" }),
jsx("option", { value: "colorblind_safe", children: "Colorblind-Safe" }),
jsx("option", { value: "grayscale", children: "Grayscale" }),
jsx("option", { value: "green_yellow_red", children: "Green-Yellow-Red" }),
jsx("option", { value: "blue_yellow_red", children: "Blue-Yellow-Red" }),
jsx("option", { value: "plasma", children: "Plasma" })
                        ]
                      }
                    ),
jsx("div", { className: "ffscouter-swatch-row", children: get_palette_for_scheme(drafts.colorScheme).map((color) => jsxs(
                      "svg",
                      {
                        className: "ffscouter-swatch",
                        viewBox: FF_ARROW_VIEWBOX,
                        children: [
jsxs("title", { children: [
                            color,
                            " swatch"
                          ] }),
jsx(
                            "path",
                            {
                              fillRule: "evenodd",
                              fill: color,
                              stroke: "#000000",
                              strokeWidth: "1.5",
                              d: FF_ARROW_PATH_D
                            }
                          )
                        ]
                      },
                      color
                    )) })
                  ] })
                ] }),
jsxs("div", { className: `${cls.inputRow} ${cls.span}`, children: [
jsx("label", { htmlFor: "ff-range-low", children: "FF Ranges (Low, High, Max):" }),
jsxs("div", { className: cls.rangeRow, children: [
jsx(
                      "input",
                      {
                        id: "ff-range-low",
                        type: "number",
                        step: "0.1",
                        className: cls.number,
                        value: drafts.lowRange,
                        onChange
                      }
                    ),
jsx("span", { children: "<" }),
jsx(
                      "input",
                      {
                        id: "ff-range-high",
                        type: "number",
                        step: "0.1",
                        className: cls.number,
                        value: drafts.highRange,
                        onChange
                      }
                    ),
jsx("span", { children: "<" }),
jsx(
                      "input",
                      {
                        id: "ff-range-max",
                        type: "number",
                        step: "0.1",
                        className: cls.number,
                        value: drafts.maxRange,
                        onChange
                      }
                    )
                  ] }),
                  rangeError && jsx("div", { className: cls.errorMsg, children: rangeError })
                ] })
              ] })
            ] }),
jsxs("div", { className: cls.group, children: [
jsx("h4", { children: "Feature Toggles" }),
jsxs("div", { className: cls.section, children: [
jsxs("div", { className: `${cls.span} ff-chain-block`, children: [
jsxs("div", { className: `${cls.cell} ${cls.cellCheckbox}`, children: [
jsx(
                      "input",
                      {
                        id: "chain-button-toggle",
                        type: "checkbox",
                        checked: drafts.chainButtonEnabled,
                        onChange
                      }
                    ),
jsx("label", { htmlFor: "chain-button-toggle", children: "Enable Chain Button (Green FF Button)" })
                  ] }),
                  drafts.chainButtonEnabled && jsxs("div", { className: `${cls.section} ${cls.chainSuboptions}`, children: [
jsxs("div", { className: `${cls.cell} ${cls.chainWide}`, children: [
jsx("label", { htmlFor: "chain-link-type", children: "Chain button opens:" }),
jsxs(
                        "select",
                        {
                          id: "chain-link-type",
                          value: drafts.chainLinkType,
                          onChange,
                          children: [
jsx("option", { value: "attack", children: "Attack page" }),
jsx("option", { value: "profile", children: "Profile page" })
                          ]
                        }
                      )
                    ] }),
jsxs("div", { className: `${cls.cell} ${cls.chainWide}`, children: [
jsx("label", { htmlFor: "chain-tab-type", children: "Open in:" }),
jsxs(
                        "select",
                        {
                          id: "chain-tab-type",
                          value: drafts.chainTabType,
                          onChange,
                          children: [
jsx("option", { value: "newtab", children: "New tab" }),
jsx("option", { value: "sametab", children: "Same tab" })
                          ]
                        }
                      )
                    ] }),
jsxs("div", { className: cls.cell, children: [
jsx("label", { htmlFor: "chain-min-level", children: "Min Level:" }),
jsx(
                        "input",
                        {
                          id: "chain-min-level",
                          type: "number",
                          className: cls.number,
                          placeholder: "No min",
                          value: drafts.chainMinLevel === null ? "" : drafts.chainMinLevel,
                          onChange
                        }
                      )
                    ] }),
jsxs("div", { className: cls.cell, children: [
jsx("label", { htmlFor: "chain-max-level", children: "Max Level:" }),
jsx(
                        "input",
                        {
                          id: "chain-max-level",
                          type: "number",
                          className: cls.number,
                          placeholder: "No max",
                          value: drafts.chainMaxLevel === null ? "" : drafts.chainMaxLevel,
                          onChange
                        }
                      )
                    ] }),
jsxs("div", { className: cls.cell, children: [
jsx("label", { htmlFor: "chain-min-ff", children: "Min FF:" }),
jsx(
                        "input",
                        {
                          id: "chain-min-ff",
                          type: "number",
                          step: "0.1",
                          className: cls.number,
                          placeholder: "No min",
                          value: drafts.chainMinFF === null ? "" : drafts.chainMinFF,
                          onChange
                        }
                      )
                    ] }),
jsxs("div", { className: cls.cell, children: [
jsx("label", { htmlFor: "chain-max-ff", children: "Max FF:" }),
jsx(
                        "input",
                        {
                          id: "chain-max-ff",
                          type: "number",
                          step: "0.1",
                          className: cls.number,
                          placeholder: "No max",
                          value: drafts.chainMaxFF,
                          onChange
                        }
                      )
                    ] }),
jsxs(
                      "div",
                      {
                        className: `${cls.cell} ${cls.cellCheckbox} ${cls.chainWide}`,
                        children: [
jsx(
                            "input",
                            {
                              id: "chain-inactive",
                              type: "checkbox",
                              checked: drafts.chainInactive,
                              onChange
                            }
                          ),
jsx("label", { htmlFor: "chain-inactive", children: "Inactive Only (14+ days offline)" })
                        ]
                      }
                    ),
jsxs(
                      "div",
                      {
                        className: `${cls.cell} ${cls.cellCheckbox} ${cls.chainWide}`,
                        children: [
jsx(
                            "input",
                            {
                              id: "chain-factionless",
                              type: "checkbox",
                              checked: drafts.chainFactionless,
                              onChange
                            }
                          ),
jsx("label", { htmlFor: "chain-factionless", children: "Factionless Only" })
                        ]
                      }
                    )
                  ] })
                ] }),
jsxs("div", { className: cls.cell, children: [
jsx("label", { htmlFor: "factions-col-display", children: "Faction Page Shows:" }),
jsxs(
                    "select",
                    {
                      id: "factions-col-display",
                      value: drafts.factionsColDisplay,
                      onChange,
                      children: [
jsx("option", { value: "fair_fight", children: "FF Score" }),
jsx("option", { value: "battle_stats", children: "BS Estimate" }),
jsx("option", { value: "none", children: "None (Hide Column)" })
                      ]
                    }
                  )
                ] }),
jsxs("div", { className: `${cls.cell} ${cls.cellCheckbox}`, children: [
jsx(
                    "input",
                    {
                      id: "faction-filter-toggle",
                      type: "checkbox",
                      checked: drafts.factionFilterEnabled,
                      onChange
                    }
                  ),
jsx("label", { htmlFor: "faction-filter-toggle", children: "Show faction filter box" })
                ] }),
jsxs("div", { className: cls.cell, children: [
jsx("label", { htmlFor: "war-col-display", children: "War Page Shows:" }),
jsxs(
                    "select",
                    {
                      id: "war-col-display",
                      value: drafts.warColDisplay,
                      onChange,
                      children: [
jsx("option", { value: "fair_fight", children: "FF Score" }),
jsx("option", { value: "battle_stats", children: "BS Estimate" }),
jsx("option", { value: "none", children: "None (Hide Column)" })
                      ]
                    }
                  )
                ] }),
jsxs("div", { className: `${cls.cell} ${cls.cellCheckbox}`, children: [
jsx(
                    "input",
                    {
                      id: "war-filter-toggle",
                      type: "checkbox",
                      checked: drafts.warFilterEnabled,
                      onChange
                    }
                  ),
jsx("label", { htmlFor: "war-filter-toggle", children: "Show war filter box" })
                ] }),
jsxs("div", { className: `${cls.cell} ${cls.cellCheckbox}`, children: [
jsx(
                    "input",
                    {
                      id: "status-attack-links-toggle",
                      type: "checkbox",
                      checked: drafts.statusAttackLinksEnabled,
                      onChange
                    }
                  ),
jsx("label", { htmlFor: "status-attack-links-toggle", children: "Enable online status indicator quick attack links" })
                ] }),
jsxs("div", { className: cls.cell, children: [
jsx("label", { htmlFor: "war-quick-attack-action", children: "Quick Attack Action:" }),
jsxs(
                    "select",
                    {
                      id: "war-quick-attack-action",
                      value: drafts.warQuickAttackAction,
                      onChange,
                      children: [
jsx("option", { value: "new_tab", children: "New Tab" }),
jsx("option", { value: "current", children: "Same Tab" })
                      ]
                    }
                  )
                ] }),
jsxs("div", { className: `${cls.cell} ${cls.cellCheckbox}`, children: [
jsx(
                    "input",
                    {
                      id: "ff-history-toggle",
                      type: "checkbox",
                      checked: drafts.ffHistoryEnabled,
                      onChange
                    }
                  ),
jsx("label", { htmlFor: "ff-history-toggle", children: "Enable FF History button on profile pages" })
                ] }),
jsxs("div", { className: `${cls.cell} ${cls.cellCheckbox}`, children: [
jsx(
                    "input",
                    {
                      id: "settings-panel-own-profile-only-toggle",
                      type: "checkbox",
                      checked: drafts.settingsPanelOwnProfileOnly,
                      onChange
                    }
                  ),
jsx("label", { htmlFor: "settings-panel-own-profile-only-toggle", children: "Only show FF Scouter Settings on my own profile" })
                ] }),
jsx("div", { className: `${cls.span} ff-deprecation-note`, children: jsxs("span", { children: [
                  "War Monitor is no longer supported. Use",
                  " ",
jsx(
                    "a",
                    {
                      target: "_blank",
                      href: "https://greasyfork.org/en/scripts/529238-torn-war-stuff-enhanced",
                      rel: "noreferrer",
                      children: "Torn War Stuff Enhanced"
                    }
                  ),
                  " ",
                  "instead."
                ] }) })
              ] })
            ] }),
jsxs("div", { className: cls.group, children: [
jsx("h4", { children: "Debug Settings" }),
jsxs("div", { className: cls.section, children: [
jsxs("div", { className: `${cls.cell} ${cls.cellCheckbox}`, children: [
jsx(
                    "input",
                    {
                      id: "debug-logs",
                      type: "checkbox",
                      checked: drafts.debugLogs,
                      onChange
                    }
                  ),
jsx("label", { htmlFor: "debug-logs", children: "Enable debug logging" })
                ] }),
jsxs("div", { className: `${cls.cell} ${cls.cellCheckbox}`, children: [
jsx(
                    "input",
                    {
                      id: "analytics-toggle",
                      type: "checkbox",
                      checked: drafts.analyticsEnabled,
                      onChange
                    }
                  ),
jsx("label", { htmlFor: "analytics-toggle", children: "Enable local analytics logging (last 30 days)" })
                ] }),
jsxs("div", { className: `${cls.cell} ${cls.cellCheckbox}`, children: [
jsx(
                    "input",
                    {
                      id: "network-interception-toggle",
                      type: "checkbox",
                      checked: drafts.networkInterceptionEnabled,
                      onChange
                    }
                  ),
jsx("label", { htmlFor: "network-interception-toggle", children: "Enable network request interception (Fetch/XHR/WS)" })
                ] }),
jsxs("div", { className: `${cls.cell} ${cls.cellCheckbox}`, children: [
jsx(
                    "input",
                    {
                      id: "debug-disable-pda-http",
                      type: "checkbox",
                      checked: drafts.debugDisablePdaHttp,
                      onChange
                    }
                  ),
jsx("label", { htmlFor: "debug-disable-pda-http", children: "Disable PDA native HTTP (use GM_xmlhttpRequest instead)" })
                ] }),
jsxs("div", { className: `${cls.cell} ${cls.cellCheckbox}`, children: [
jsx(
                    "input",
                    {
                      id: "debug-force-react-fallback",
                      type: "checkbox",
                      checked: drafts.debugForceReactFallback,
                      onChange
                    }
                  ),
jsx("label", { htmlFor: "debug-force-react-fallback", children: "Force React fallback (fetch/evaluate Torn's own react-dom bundle instead of using unsafeWindow.React/ReactDOM)" })
                ] })
              ] })
            ] }),
jsxs("div", { className: cls.actions, children: [
jsx("button", { type: "button", className: "torn-btn btn-save", onClick: onSave, children: "Save Settings" }),
jsx(
                "button",
                {
                  type: "button",
                  className: "torn-btn btn-secondary",
                  onClick: onReset,
                  children: "Reset to Defaults"
                }
              ),
jsx(
                "button",
                {
                  type: "button",
                  className: "torn-btn btn-secondary",
                  onClick: onClearCache,
                  children: "Clear FF Cache"
                }
              ),
              showSavedMessage && jsx("span", { className: cls.savedMsg, children: "✓ Saved!" })
            ] })
          ] })
        ]
      }
    );
  }
  class FFSettingsPanel extends HTMLElement {
    constructor() {
      super();
      this._props = { ...DEFAULT_VALUES };
      this._drafts = { ...DEFAULT_VALUES };
      this._rangeError = "";
      this._showSavedMessage = false;
      this._root = null;
      this._updatePromise = Promise.resolve();
      this._resolveUpdate = null;
      this.handleChange = (e) => {
        const target = e.target;
        if (!target) return;
        this._showSavedMessage = false;
        const id = target.id;
        if (id === "api-key") {
          this._drafts.apiKey = target.value;
        } else if (id === "gauge-marker-scale" || id === "gauge-marker-scale-number") {
          const raw = Number(target.value);
          if (!Number.isNaN(raw)) {
            this._drafts.gaugeMarkerScale = Math.min(200, Math.max(50, raw));
          }
        } else if (id === "gauge-marker-border-width" || id === "gauge-marker-border-width-number") {
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
          this._drafts.chainMinLevel = target.value === "" ? null : Number(target.value);
        } else if (id === "chain-max-level") {
          this._drafts.chainMaxLevel = target.value === "" ? null : Number(target.value);
        } else if (id === "chain-min-ff") {
          this._drafts.chainMinFF = target.value === "" ? null : Number(target.value);
        } else if (id === "chain-max-ff") {
          const num = Number(target.value);
          this._drafts.chainMaxFF = num;
          this._drafts.chainFFTarget = num;
        } else if (id === "gauge-marker-type") {
          this._drafts.gaugeMarkerType = target.value;
        } else if (id === "color-scheme") {
          this._drafts.colorScheme = target.value;
        } else if (id === "chain-link-type") {
          this._drafts.chainLinkType = target.value;
        } else if (id === "chain-tab-type") {
          this._drafts.chainTabType = target.value;
        } else if (id === "war-quick-attack-action") {
          this._drafts.warQuickAttackAction = target.value;
        } else if (id === "factions-col-display") {
          this._drafts.factionsColDisplay = target.value;
        } else if (id === "war-col-display") {
          this._drafts.warColDisplay = target.value;
        } else if (id === "chain-button-toggle") {
          this._drafts.chainButtonEnabled = target.checked;
        } else if (id === "chain-inactive") {
          this._drafts.chainInactive = target.checked;
        } else if (id === "chain-factionless") {
          this._drafts.chainFactionless = target.checked;
        } else if (id === "status-attack-links-toggle") {
          this._drafts.statusAttackLinksEnabled = target.checked;
        } else if (id === "ff-history-toggle") {
          this._drafts.ffHistoryEnabled = target.checked;
        } else if (id === "debug-logs") {
          this._drafts.debugLogs = target.checked;
        } else if (id === "analytics-toggle") {
          this._drafts.analyticsEnabled = target.checked;
        } else if (id === "network-interception-toggle") {
          this._drafts.networkInterceptionEnabled = target.checked;
        } else if (id === "debug-disable-pda-http") {
          this._drafts.debugDisablePdaHttp = target.checked;
        } else if (id === "debug-force-react-fallback") {
          this._drafts.debugForceReactFallback = target.checked;
        } else if (id === "settings-panel-own-profile-only-toggle") {
          this._drafts.settingsPanelOwnProfileOnly = target.checked;
        } else if (id === "faction-filter-toggle") {
          this._drafts.factionFilterEnabled = target.checked;
        } else if (id === "war-filter-toggle") {
          this._drafts.warFilterEnabled = target.checked;
        }
        this.render();
      };
      this.handleApiKeyBlur = (e) => {
        this._showSavedMessage = false;
        const val = e.target.value.trim();
        this._drafts.apiKey = val;
        this.dispatchEvent(
          new CustomEvent("ff-save-key", {
            detail: { apiKey: val },
            bubbles: true,
            composed: true
          })
        );
        this.render();
      };
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
    get updateComplete() {
      return this._updatePromise;
    }
    resetDrafts() {
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
        warFilterEnabled: this._props.warFilterEnabled
      };
    }
    render() {
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
                composed: true
              })
            );
          },
          onSave: () => {
            this.handleSave();
          },
          onReset: () => {
            if (confirm("Are you sure you want to reset all settings to defaults?")) {
              this.dispatchEvent(
                new CustomEvent("ff-reset", {
                  bubbles: true,
                  composed: true
                })
              );
            }
          },
          onClearCache: () => {
            if (confirm("Are you sure you want to clear all FF Scouter cache?")) {
              this.dispatchEvent(
                new CustomEvent("ff-clear-cache", {
                  bubbles: true,
                  composed: true
                })
              );
            }
          },
          onRendered: () => {
            if (this._resolveUpdate) {
              this._resolveUpdate();
              this._resolveUpdate = null;
            }
          }
        })
      );
    }
    handleSave() {
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
        this._rangeError = "FF ranges must be in ascending order: low < high < max";
        this.render();
        return;
      }
      this._rangeError = "";
      this._showSavedMessage = true;
      this.render();
      setTimeout(() => {
        this._showSavedMessage = false;
        this.render();
      }, 3e3);
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
            warFilterEnabled: this._drafts.warFilterEnabled
          },
          bubbles: true,
          composed: true
        })
      );
    }
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
    get draftWarFilterEnabled() {
      return this._drafts.warFilterEnabled;
    }
    set draftWarFilterEnabled(val) {
      this._drafts.warFilterEnabled = val;
      this.render();
    }
  }
  if (!customElements.get("ff-settings-panel")) {
    customElements.define("ff-settings-panel", FFSettingsPanel);
  }
  const V2_PREFIX = "ffscouterv2-";
  const V3_PREFIX = "ffsv3-config";
  const V2_IDB_NAME = "ffscouter-cache";
  function v2_get(key) {
    return localStorage.getItem(V2_PREFIX + key);
  }
  function v3_has(key) {
    return localStorage.getItem(V3_PREFIX + key) !== null;
  }
  function v3_set(key, value) {
    localStorage.setItem(
      V3_PREFIX + key,
      JSON.stringify({ value, expiration: null })
    );
  }
  function migrate_bool(old_key, new_key) {
    if (v3_has(new_key)) return;
    const v = v2_get(old_key);
    if (v !== null) v3_set(new_key, v === "true");
  }
  function migrate_string(old_key, new_key, valid) {
    if (v3_has(new_key)) return;
    const v = v2_get(old_key);
    if (v !== null && valid.includes(v)) v3_set(new_key, v);
  }
  function migrate_float(old_key, new_key) {
    if (v3_has(new_key)) return;
    const v = v2_get(old_key);
    if (v !== null) {
      const n = parseFloat(v);
      if (!Number.isNaN(n)) v3_set(new_key, n);
    }
  }
  function run_migration() {
    if (!v3_has("key")) {
      const old_key = localStorage.getItem("limited_key");
      if (old_key) v3_set("key", old_key);
    }
    migrate_bool("debug-logs", "debug_logs");
    migrate_bool("ff-history-enabled", "ff_history_enabled");
    migrate_bool("chain-button-enabled", "chain_button_enabled");
    migrate_string("factions-col-display", "factions_col_display", [
      "fair_fight",
      "battle_stats",
      "none"
    ]);
    migrate_string("chain-link-type", "chain_link_type", ["attack", "profile"]);
    migrate_string("chain-tab-type", "chain_tab_type", ["newtab", "sametab"]);
    migrate_float("chain-ff-target", "chain_ff_target");
    if (!v3_has("low_ff_range") && !v3_has("high_ff_range") && !v3_has("max_ff_range")) {
      const raw = localStorage.getItem("ffscouterv2-ranges");
      if (raw) {
        try {
          const { low, high, max } = JSON.parse(raw);
          if (typeof low === "number") v3_set("low_ff_range", low);
          if (typeof high === "number") v3_set("high_ff_range", high);
          if (typeof max === "number") v3_set("max_ff_range", max);
        } catch {
        }
      }
    }
    if (!v3_has("faction_filter_state")) {
      const col_display = v2_get("factions-col-display") ?? "battle_stats";
      const sort_key = col_display === "fair_fight" ? "factions-ff-sort-order" : "factions-est-sort-order";
      const sort_order = v2_get(sort_key);
      if (sort_order === "asc" || sort_order === "desc") {
        v3_set("faction_filter_state", {
          sortBy: sort_order === "asc" ? "ff-asc" : "ff-desc"
        });
      }
    }
  }
  function clear_v2_data() {
    localStorage.removeItem("limited_key");
    const to_delete = Object.keys(localStorage).filter(
      (k) => k.startsWith(V2_PREFIX)
    );
    for (const key of to_delete) {
      localStorage.removeItem(key);
    }
    try {
      indexedDB.deleteDatabase(V2_IDB_NAME);
    } catch {
    }
  }
  const index$2 = {
    name: "FF Scouter settings panel",
    description: "Give users a FF Scouter settings box injected on the profile page",
    executionTime: StartTime.DocumentBody,
    async shouldRun() {
      return torn_page("profiles");
    },
    async run() {
      if (ffconfig.settings_panel_own_profile_only) {
        const viewedId = extract_id_from_url(window.location.href);
        if (viewedId === null) {
          return;
        }
        const localIdStr = await getLocalUserId();
        const localId = localIdStr !== null ? parseInt(localIdStr, 10) : null;
        if (localId !== null && !Number.isNaN(localId) && viewedId !== localId) {
          return;
        }
      }
      const panel = await create_ff_element("ff-settings-panel");
      if (!panel) {
        toast(
          "FF Scouter settings failed to load. This may be caused by a conflicting browser extension (e.g. AdBlocker Ultimate).",
          TOAST_LEVEL.ERROR
        );
        return;
      }
      panel.apiKey = ffconfig.key || "";
      panel.lowRange = ffconfig.low_ff_range;
      panel.highRange = ffconfig.high_ff_range;
      panel.maxRange = ffconfig.max_ff_range;
      panel.chainButtonEnabled = ffconfig.chain_button_enabled;
      panel.chainLinkType = ffconfig.chain_link_type;
      panel.chainTabType = ffconfig.chain_tab_type;
      panel.chainFFTarget = ffconfig.chain_ff_target;
      panel.chainMinLevel = ffconfig.chain_min_level;
      panel.chainMaxLevel = ffconfig.chain_max_level;
      panel.chainInactive = ffconfig.chain_inactive;
      panel.chainMinFF = ffconfig.chain_min_ff;
      panel.chainMaxFF = ffconfig.chain_max_ff;
      panel.chainFactionless = ffconfig.chain_factionless;
      panel.ffHistoryEnabled = ffconfig.ff_history_enabled;
      panel.factionsColDisplay = ffconfig.factions_col_display;
      panel.warColDisplay = ffconfig.war_col_display;
      panel.debugLogs = ffconfig.debug_logs;
      panel.analyticsEnabled = ffconfig.analytics_enabled;
      panel.networkInterceptionEnabled = ffconfig.network_interception_enabled;
      panel.gaugeMarkerType = ffconfig.gauge_marker_type;
      panel.gaugeMarkerScale = ffconfig.gauge_marker_scale;
      panel.gaugeMarkerBorderWidth = ffconfig.gauge_marker_border_width;
      panel.colorScheme = ffconfig.color_scheme;
      panel.warQuickAttackAction = ffconfig.war_quick_attack_action;
      panel.statusAttackLinksEnabled = ffconfig.status_attack_links_enabled;
      panel.debugDisablePdaHttp = ffconfig.debug_disable_pda_http;
      panel.debugForceReactFallback = ffconfig.debug_force_react_fallback;
      panel.settingsPanelOwnProfileOnly = ffconfig.settings_panel_own_profile_only;
      panel.factionFilterEnabled = ffconfig.faction_filter_enabled;
      panel.warFilterEnabled = ffconfig.war_filter_enabled;
      panel.addEventListener("ff-save", async (e) => {
        const detail = e.detail;
        ffconfig.key = detail.apiKey;
        ffconfig.low_ff_range = detail.lowRange;
        ffconfig.high_ff_range = detail.highRange;
        ffconfig.max_ff_range = detail.maxRange;
        ffconfig.chain_button_enabled = detail.chainButtonEnabled;
        ffconfig.chain_link_type = detail.chainLinkType;
        ffconfig.chain_tab_type = detail.chainTabType;
        ffconfig.chain_ff_target = detail.chainFFTarget;
        ffconfig.chain_min_level = detail.chainMinLevel;
        ffconfig.chain_max_level = detail.chainMaxLevel;
        ffconfig.chain_inactive = detail.chainInactive;
        ffconfig.chain_min_ff = detail.chainMinFF;
        ffconfig.chain_max_ff = detail.chainMaxFF;
        ffconfig.chain_factionless = detail.chainFactionless;
        ffconfig.ff_history_enabled = detail.ffHistoryEnabled;
        ffconfig.factions_col_display = detail.factionsColDisplay;
        ffconfig.war_col_display = detail.warColDisplay;
        ffconfig.debug_logs = detail.debugLogs;
        if (detail.debugLogs) {
          logger.setLevel(LogLevel.DEBUG);
        } else {
          logger.setLevel(LogLevel.INFO);
        }
        ffconfig.analytics_enabled = detail.analyticsEnabled;
        ffconfig.network_interception_enabled = detail.networkInterceptionEnabled;
        ffconfig.gauge_marker_type = detail.gaugeMarkerType;
        ffconfig.gauge_marker_scale = detail.gaugeMarkerScale;
        ffconfig.gauge_marker_border_width = detail.gaugeMarkerBorderWidth;
        document.body.style.setProperty(
          "--ffscouter-marker-scale",
          `${detail.gaugeMarkerScale / 100}`
        );
        ffconfig.color_scheme = detail.colorScheme;
        ffconfig.war_quick_attack_action = detail.warQuickAttackAction;
        ffconfig.status_attack_links_enabled = detail.statusAttackLinksEnabled;
        ffconfig.debug_disable_pda_http = detail.debugDisablePdaHttp;
        ffconfig.debug_force_react_fallback = detail.debugForceReactFallback;
        ffconfig.settings_panel_own_profile_only = detail.settingsPanelOwnProfileOnly;
        ffconfig.faction_filter_enabled = detail.factionFilterEnabled;
        ffconfig.war_filter_enabled = detail.warFilterEnabled;
        panel.isPremium = await check_key_status.is_premium(true);
        toast("Settings saved successfully!");
        window.dispatchEvent(new CustomEvent("ff-config-updated"));
      });
      panel.addEventListener("ff-reset", () => {
        ffconfig.reset();
        panel.apiKey = ffconfig.key || "";
        panel.lowRange = ffconfig.low_ff_range;
        panel.highRange = ffconfig.high_ff_range;
        panel.maxRange = ffconfig.max_ff_range;
        panel.chainButtonEnabled = ffconfig.chain_button_enabled;
        panel.chainLinkType = ffconfig.chain_link_type;
        panel.chainTabType = ffconfig.chain_tab_type;
        panel.chainFFTarget = ffconfig.chain_ff_target;
        panel.chainMinLevel = ffconfig.chain_min_level;
        panel.chainMaxLevel = ffconfig.chain_max_level;
        panel.chainInactive = ffconfig.chain_inactive;
        panel.chainMinFF = ffconfig.chain_min_ff;
        panel.chainMaxFF = ffconfig.chain_max_ff;
        panel.chainFactionless = ffconfig.chain_factionless;
        panel.ffHistoryEnabled = ffconfig.ff_history_enabled;
        panel.factionsColDisplay = ffconfig.factions_col_display;
        panel.warColDisplay = ffconfig.war_col_display;
        panel.debugLogs = ffconfig.debug_logs;
        panel.analyticsEnabled = ffconfig.analytics_enabled;
        panel.networkInterceptionEnabled = ffconfig.network_interception_enabled;
        panel.gaugeMarkerType = ffconfig.gauge_marker_type;
        panel.gaugeMarkerScale = ffconfig.gauge_marker_scale;
        panel.gaugeMarkerBorderWidth = ffconfig.gauge_marker_border_width;
        document.body.style.setProperty(
          "--ffscouter-marker-scale",
          `${ffconfig.gauge_marker_scale / 100}`
        );
        panel.colorScheme = ffconfig.color_scheme;
        panel.warQuickAttackAction = ffconfig.war_quick_attack_action;
        panel.statusAttackLinksEnabled = ffconfig.status_attack_links_enabled;
        panel.debugDisablePdaHttp = ffconfig.debug_disable_pda_http;
        panel.debugForceReactFallback = ffconfig.debug_force_react_fallback;
        panel.settingsPanelOwnProfileOnly = ffconfig.settings_panel_own_profile_only;
        panel.factionFilterEnabled = ffconfig.faction_filter_enabled;
        panel.warFilterEnabled = ffconfig.war_filter_enabled;
        toast("Settings reset to defaults!");
        window.dispatchEvent(new CustomEvent("ff-config-updated"));
      });
      panel.addEventListener("ff-clear-cache", async () => {
        try {
          ffscouter.clear_cache();
          clear_v2_data();
          toast("FF Scouter cache cleared successfully!");
        } catch (err) {
          logger.error("Failed to delete IndexedDB cache", err);
          toast("Failed to clear cache database", TOAST_LEVEL.ERROR);
        }
      });
      panel.addEventListener("ff-save-key", async (e) => {
        const detail = e.detail;
        ffconfig.key = detail.apiKey;
        panel.apiKey = detail.apiKey;
        panel.isPremium = await check_key_status.is_premium(true);
        toast("API key saved successfully!");
        window.dispatchEvent(new CustomEvent("ff-config-updated"));
      });
      panel.addEventListener("ff-verify", async (e) => {
        const detail = e.detail;
        if (!detail.apiKey) {
          toast("Please enter an API key.", TOAST_LEVEL.ERROR);
          return;
        }
        panel.isPremium = null;
        let result = null;
        try {
          result = await check_key(detail.apiKey);
        } catch (err) {
          panel.isPremium = null;
          toast(`${err}`, TOAST_LEVEL.ERROR);
          return;
        }
        if (result == null || result.blank) {
          panel.isPremium = null;
          toast(
            "Problem querying ffscouter.com API. Please wait a few seconds and try again.",
            TOAST_LEVEL.WARNING
          );
          return;
        }
        let message = `FF Scouter not configured. API key (${result.result.key}) not registered.`;
        let level = TOAST_LEVEL.ERROR;
        if (result.result.is_registered) {
          message = `FF Scouter successfully configured. API key (${result.result.key}) was registered on ${format_timestamp(result.result.registered_at)} and last used ${format_timestamp(result.result.last_used)}.`;
          level = TOAST_LEVEL.INFO;
          ffconfig.key = detail.apiKey;
          panel.apiKey = detail.apiKey;
          panel.isPremium = result.result.is_premium;
          check_key_status.clear();
        } else {
          panel.isPremium = false;
        }
        toast(message, level);
      });
      const profileWrapper = await wait_for_element(".profile-wrapper", 15e3);
      if (!profileWrapper) {
        logger.error("Could not find profile wrapper for settings panel");
        return;
      }
      profileWrapper.parentNode?.insertBefore(panel, profileWrapper.nextSibling);
      check_key_status.is_premium(true).then((result) => {
        panel.isPremium = result;
      });
    },
    httpIntercept: {
      before(_url, _init) {
        return void 0;
      },
      after(_bodyText, _response, _ctx) {
        return void 0;
      }
    }
  };
  const __vite_glob_0_12 = Object.freeze( Object.defineProperty({
    __proto__: null,
    default: index$2
  }, Symbol.toStringTag, { value: "Module" }));
  const log$2 = logger.child("feature:status-attack");
  function updateBodyClass() {
    const isEnabled = ffconfig.status_attack_links_enabled;
    if (isEnabled) {
      document.body.setAttribute("data-ff-status-attack-enabled", "true");
    } else {
      document.body.removeAttribute("data-ff-status-attack-enabled");
    }
  }
  function isForumStatusIcon(el) {
    const title = (el.getAttribute("title") || "").toLowerCase();
    const ariaLabel = (el.querySelector("a")?.getAttribute("aria-label") || "").toLowerCase();
    return title.includes("online") || title.includes("offline") || title.includes("away") || title.includes("idle") || ariaLabel.includes("online") || ariaLabel.includes("offline") || ariaLabel.includes("away") || ariaLabel.includes("idle");
  }
  function labelForumStatuses(root = document.body) {
    const elements = root.querySelectorAll(
      'li[id^="icon"][id*="___"].iconShow:not(.ffscouter-forum-status)'
    );
    for (const el of elements) {
      if (el instanceof HTMLElement && isForumStatusIcon(el)) {
        el.classList.add("ffscouter-forum-status");
      }
    }
  }
  let forumObserver = null;
  function setupForumObserver() {
    if (forumObserver) {
      forumObserver.disconnect();
      forumObserver = null;
    }
    if (!torn_page("forums")) return;
    labelForumStatuses();
    forumObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof Element) {
            labelForumStatuses(node);
          }
        }
      }
    });
    const content = document.querySelector(".content-wrapper") || document.body;
    forumObserver.observe(content, {
      childList: true,
      subtree: true
    });
    log$2.debug("Forum status observer connected");
  }
  let localUserId = null;
  async function fetchLocalUserId() {
    try {
      const idStr = await getLocalUserId();
      if (idStr) {
        localUserId = parseInt(idStr, 10);
        log$2.debug("Logged-in user ID cached:", localUserId);
      }
    } catch (err) {
      log$2.error("Failed to retrieve logged-in user ID", err);
    }
  }
  function handleStatusClick(e) {
    if (!ffconfig.status_attack_links_enabled) return;
    const target = e.target;
    const statusEl = target.closest(`
    [class*="userStatusWrap__"],
    li[id^="icon"][id*="-profile-"].user-status-16-Online,
    li[id^="icon"][id*="-profile-"].user-status-16-Away,
    li[id^="icon"][id*="-profile-"].user-status-16-Offline,
    #profile-mini-root li[id^="icon"][id*="-mini-profile-"].user-status-16-Online,
    #profile-mini-root li[id^="icon"][id*="-mini-profile-"].user-status-16-Away,
    #profile-mini-root li[id^="icon"][id*="-mini-profile-"].user-status-16-Offline,
    li[id^="icon"][id*="___"].iconShow.ffscouter-forum-status
  `);
    if (!statusEl) return;
    let playerId = null;
    const idAttr = statusEl.id || "";
    if (idAttr?.includes("-profile-")) {
      const match = idAttr.match(/profile-(\d+)$/);
      if (match?.[1]) {
        playerId = parseInt(match[1], 10);
      }
    }
    if (!playerId && idAttr && idAttr.includes("-mini-profile-")) {
      const match = idAttr.match(/mini-profile-(\d+)$/);
      if (match?.[1]) {
        playerId = parseInt(match[1], 10);
      }
    }
    if (!playerId && torn_page("factions")) {
      const row = statusEl.closest(".table-row, .enemy, .your, .member");
      if (row) {
        playerId = get_player_id_in_element(row);
      }
    }
    if (!playerId && torn_page("forums")) {
      const container = statusEl.closest(`
      [class*="poster"], .poster,
      [class*="lastPost"], .lastPost,
      [class*="last-poster"], .last-poster,
      [class*="last-post"], .last-post,
      [class*="starter"], .starter
    `);
      if (container) {
        playerId = get_player_id_in_element(container);
      }
    }
    if (!playerId && torn_page("profiles")) {
      const match = window.location.href.match(/XID=(\d+)/);
      if (match?.[1]) {
        playerId = parseInt(match[1], 10);
      }
    }
    if (!playerId) {
      const miniRoot = document.getElementById("profile-mini-root");
      if (miniRoot?.contains(statusEl)) {
        playerId = get_player_id_in_element(miniRoot);
      }
    }
    if (!playerId) {
      const container = statusEl.closest('[class*="userInfoBox__"]');
      if (container) {
        playerId = get_player_id_in_element(container);
      }
    }
    if (!playerId) {
      log$2.debug("Failed to extract playerId from status icon click");
      return;
    }
    if (localUserId && playerId === localUserId) {
      log$2.debug("Bypassing click-to-attack: clicked own status icon.");
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    log$2.debug("Initiating attack on user:", playerId);
    const forceNewTab = e.ctrlKey || e.metaKey || e.button === 1;
    open_attack_link(playerId, {
      openInNewTab: forceNewTab ? true : void 0
    });
  }
  const index$1 = {
    name: "Online Status Attack Links",
    description: "Converts online/idle/offline status indicators into clickable quick-attack links.",
    executionTime: StartTime.DocumentBody,
    async shouldRun() {
      return true;
    },
    async run() {
      updateBodyClass();
      fetchLocalUserId();
      const initPage = () => {
        setupForumObserver();
      };
      document.body.addEventListener("click", handleStatusClick, true);
      window.addEventListener("ff-config-updated", () => {
        updateBodyClass();
      });
      if (typeof window !== "undefined") {
        const originalPushState = window.history.pushState;
        const originalReplaceState = window.history.replaceState;
        window.history.pushState = function(...args) {
          originalPushState.apply(this, args);
          setTimeout(initPage, 100);
        };
        window.history.replaceState = function(...args) {
          originalReplaceState.apply(this, args);
          setTimeout(initPage, 100);
        };
        window.addEventListener("popstate", () => {
          setTimeout(initPage, 100);
        });
      }
      initPage();
      log$2.debug("Online Status Attack Links feature installed successfully.");
    }
  };
  const __vite_glob_0_13 = Object.freeze( Object.defineProperty({
    __proto__: null,
    default: index$1
  }, Symbol.toStringTag, { value: "Module" }));
  const log$1 = logger.child("feature:test-feature");
  const index = {
    name: "Test Feature!",
    description: "It's literally a test feature :P",
    executionTime: StartTime.DocumentStart,
    async shouldRun() {
      return true;
    },
    async run() {
      log$1.info("hello world but from feature");
    },
    httpIntercept: {
      before(_url, _init) {
        return void 0;
      },
      after(_bodyText, _response, _ctx) {
        return void 0;
      }
    }
  };
  const __vite_glob_0_14 = Object.freeze( Object.defineProperty({
    __proto__: null,
    default: index
  }, Symbol.toStringTag, { value: "Module" }));
  const modules = Object.assign({
    "./attack/index.ts": __vite_glob_0_0,
    "./deprecation-notice/index.ts": __vite_glob_0_1,
    "./faction/index.ts": __vite_glob_0_2,
    "./fallback/index.ts": __vite_glob_0_3,
    "./ff-button/index.ts": __vite_glob_0_4,
    "./item_market/index.ts": __vite_glob_0_5,
    "./mini-profile-flights/index.ts": __vite_glob_0_6,
    "./mini-profile/index.ts": __vite_glob_0_7,
    "./profile-flights/index.ts": __vite_glob_0_8,
    "./profile-history/index.ts": __vite_glob_0_9,
    "./profile/index.ts": __vite_glob_0_10,
    "./rr/index.ts": __vite_glob_0_11,
    "./settings/index.ts": __vite_glob_0_12,
    "./status-attack/index.ts": __vite_glob_0_13,
    "./test-feature/index.ts": __vite_glob_0_14
  });
  const Features = Object.values(modules).map((mod) => mod.default).filter(
    (feat) => !!feat && "name" in feat && feat.name !== "Test Feature!"
  );
  const httpInterceptors = [];
  function registerHttpInterceptor(interceptor) {
    httpInterceptors.push(interceptor);
    httpInterceptors.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }
  const stylesCss = ".ffscouter-gauge{position:relative;display:block;padding:0}.ffscouter-arrow,.ffscouter-preview-arrow{width:var(--ffscouter-arrow-width);object-fit:cover;pointer-events:none}.ffscouter-arrow{display:block;padding:0}.ffscouter-preview-arrow{display:inline-block;vertical-align:middle}.ffscouter-marker-wrapper{position:absolute;display:inline-block;pointer-events:none;line-height:0;transform:translate(var(--ffscouter-marker-tx, -50%),var(--ffscouter-marker-ty, -30%));z-index:10}.ffscouter-gauge[data-ffscouter-band-side=left]>.ffscouter-marker-wrapper{left:calc(var(--ffscouter-marker-actual-width, var(--ffscouter-arrow-width)) / 2 + var(--band-percent) * (100% - var(--ffscouter-marker-actual-width, var(--ffscouter-arrow-width))) / 100);--ffscouter-marker-tx: -50%}.ffscouter-gauge[data-ffscouter-band-side=right]>.ffscouter-marker-wrapper{right:calc(var(--ffscouter-marker-actual-width, var(--ffscouter-arrow-width)) / 2 + (100 - var(--band-percent)) * (100% - var(--ffscouter-marker-actual-width, var(--ffscouter-arrow-width))) / 100 + .35 * var(--ffscouter-source-marker-size));--ffscouter-marker-tx: 50%}.ffscouter-gauge[data-ffscouter-attach-mode=honor-bar]>.ffscouter-marker-wrapper{top:0;--ffscouter-marker-ty: -30%}.ffscouter-gauge[data-ffscouter-attach-mode=fallback]>.ffscouter-marker-wrapper{top:0;bottom:0;margin:auto 0;--ffscouter-marker-ty: 0%}.ffscouter-bubble,.ffscouter-preview-bubble{min-width:2.5882em;height:1.6471em;line-height:1.4118;border:1px solid rgba(0,0,0,.4);border-radius:999px;font-size:var(--ffscouter-bubble-font-size);font-weight:700;font-family:Geneva,Arial,sans-serif;text-align:center;padding:0 .4706em;box-sizing:border-box;white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;text-shadow:0 1px 1px rgba(0,0,0,.5);box-shadow:0 1px 2px #0000004d}.ffscouter-bubble{pointer-events:none}.ffscouter-preview-bubble{vertical-align:middle}.ffscouter-source-marker{position:absolute;top:calc(-.35 * var(--ffscouter-source-marker-size));right:calc(-.35 * var(--ffscouter-source-marker-size));width:var(--ffscouter-source-marker-size);height:var(--ffscouter-source-marker-size);pointer-events:auto;overflow:visible}.ffscouter-preview-marker-slot{position:relative;display:inline-block}.ffscouter-inline-source-marker{display:inline-block!important;float:none!important;position:static!important;width:16px!important;height:16px!important;vertical-align:middle!important;margin:0 0 0 4px!important}.ffscouter-marker-preview{display:inline-flex;align-items:center;gap:10px;--ffscouter-arrow-width: calc(20px * var(--ffscouter-marker-scale));--ffscouter-bubble-font-size: calc(8.5px * var(--ffscouter-marker-scale));--ffscouter-source-marker-size: calc(12px * var(--ffscouter-marker-scale))}.ffscouter-mini-desc{padding:0 5px}.ffscouter-swatch-row{display:inline-flex;gap:3px}.ffscouter-swatch{display:inline-block;width:20px;height:13px}body{--ffscouter-bg-color: #f0f0f0;--ffscouter-alt-bg-color: #fff;--ffscouter-border-color: #ccc;--ffscouter-input-color: #ccc;--ffscouter-text-color: #000;--ffscouter-hover-color: #ddd;--ffscouter-glow-color: #4caf50;--ffscouter-success-color: #4caf50;--ffscouter-marker-scale: 1;--ffscouter-arrow-width: calc(20px * var(--ffscouter-marker-scale));--ffscouter-bubble-font-size: calc(8.5px * var(--ffscouter-marker-scale));--ffscouter-source-marker-size: calc(12px * var(--ffscouter-marker-scale))}body.dark-mode{--ffscouter-bg-color: #333;--ffscouter-alt-bg-color: #383838;--ffscouter-border-color: #444;--ffscouter-input-color: #504f4f;--ffscouter-text-color: #ccc;--ffscouter-hover-color: #555;--ffscouter-glow-color: #4caf50;--ffscouter-success-color: #4caf50}ff-settings-panel{display:block}.profile-status{position:relative}.ff-flight-element{position:absolute;right:10px;bottom:2px;z-index:2}.ff-scouter-profile-flight-info{display:inline-block;text-align:right;font-size:11px;line-height:1.25;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.85)}.profile-status .ff-scouter-profile-flight-info a{color:#fff;text-decoration:underline}.faction-war .ffscouter-cell{float:left!important;width:32px!important;height:20px!important;font-size:11px!important;font-weight:700!important;border-radius:3px!important;box-sizing:border-box!important;margin:7px 4px!important;padding:0!important;text-align:center!important;line-height:20px!important;z-index:10!important}.ffscouter-cell{cursor:pointer!important}.faction-war .ffscouter-header,.table-header .ffscouter-header{float:left!important;width:38px!important;font-size:12px!important;font-weight:700!important;padding:0!important;text-align:center!important;background-color:transparent!important;cursor:pointer!important}.faction-war:has(.ffscouter-header[data-ffscouter-sort]) [class*=sortIcon___]:not(.ffscouter-sort-icon),.members-list:has(.ffscouter-header[data-ffscouter-sort]) [class*=sortIcon___]:not(.ffscouter-sort-icon){visibility:hidden!important}[data-ffscouter-hidden]{display:none!important}.faction-war[data-ffscouter-hide-level=true] .level:not(.ffscouter-cell):not(.ffscouter-header){display:none!important}.faction-war[data-ffscouter-hide-status=true] .status,.faction-war[data-ffscouter-hide-score=true] .points{display:none!important}.faction-war[data-ffscouter-col-display=fair_fight]:not([data-ffscouter-hide-level=true]) .level:not(.ffscouter-cell):not(.ffscouter-header),.faction-war[data-ffscouter-col-display=battle_stats]:not([data-ffscouter-hide-level=true]) .level:not(.ffscouter-cell):not(.ffscouter-header){width:29px!important}.faction-war[data-ffscouter-col-display=fair_fight]:not([data-ffscouter-hide-level=true]) .status,.faction-war[data-ffscouter-col-display=battle_stats]:not([data-ffscouter-hide-level=true]) .status{width:50px!important}.faction-war[data-ffscouter-col-display=fair_fight]:not([data-ffscouter-hide-level=true]) .points,.faction-war[data-ffscouter-col-display=battle_stats]:not([data-ffscouter-hide-level=true]) .points{width:38px!important}.members-list li.enemy:has(>.tt-stats-estimate),.members-list li.your:has(>.tt-stats-estimate),.members-list li.enemy:has(>div.clear~*),.members-list li.your:has(>div.clear~*){padding-bottom:22px!important;position:relative!important}.members-list li.enemy>.tt-stats-estimate,.members-list li.your>.tt-stats-estimate,.members-list li.enemy>div.clear~*,.members-list li.your>div.clear~*{position:absolute!important;bottom:2px!important;left:10px!important;height:18px!important;line-height:18px!important;font-size:11px!important;width:calc(100% - 20px)!important;display:block!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}body[data-ff-status-attack-enabled=true] [class*=userStatusWrap__],body[data-ff-status-attack-enabled=true] li[id^=icon][id*=-profile-].user-status-16-Online,body[data-ff-status-attack-enabled=true] li[id^=icon][id*=-profile-].user-status-16-Away,body[data-ff-status-attack-enabled=true] li[id^=icon][id*=-profile-].user-status-16-Offline,body[data-ff-status-attack-enabled=true] #profile-mini-root li[id^=icon][id*=-mini-profile-].user-status-16-Online,body[data-ff-status-attack-enabled=true] #profile-mini-root li[id^=icon][id*=-mini-profile-].user-status-16-Away,body[data-ff-status-attack-enabled=true] #profile-mini-root li[id^=icon][id*=-mini-profile-].user-status-16-Offline,body[data-ff-status-attack-enabled=true] li[id^=icon][id*=___].iconShow.ffscouter-forum-status{cursor:crosshair!important}.d .job-lists-wrap .item>li.company,.d .job-lists-wrap .item>li.director,.d .job-lists-wrap .item>li.salary,.d .job-lists-wrap .item>li.ranks{margin-bottom:0!important;padding-bottom:0!important}.d .users-list.links .user-wrap.ffscouter-gauge{margin-top:0!important;margin-bottom:0!important;padding-top:0!important;padding-bottom:0!important}";
  importCSS(stylesCss);
  const log = logger.child("boot");
  const INJECTION_KEY = "__FF_SCOUTER_V2_INJECTED__";
  async function safeShouldRun(feat) {
    try {
      return await feat.shouldRun();
    } catch (err) {
      log.error(`shouldRun() threw for feature "${feat.name}"`, err);
      return false;
    }
  }
  function safeRun(feat) {
    feat.run().catch((err) => {
      log.error(`run() threw for feature "${feat.name}"`, err);
    });
  }
  async function main() {
    if (document.documentElement.hasAttribute(INJECTION_KEY)) {
      log.info("Script already injected");
      return;
    }
    document.documentElement.setAttribute(INJECTION_KEY, "1");
    log.info("Initializing", "3.2-beta1");
    run_migration();
    if (ffscouter.analytics_enabled) {
      if (typeof unsafeWindow !== "undefined") {
        unsafeWindow.ffscouter = ffscouter;
      }
      window.ffscouter = ffscouter;
    }
    for (const feat of Features) {
      if (feat.executionTime === StartTime.DocumentStart && await safeShouldRun(feat)) {
        if (feat.httpIntercept) {
          feat.httpIntercept.name = feat.name;
          registerHttpInterceptor(feat.httpIntercept);
        }
        safeRun(feat);
      }
    }
    await wait_for_body(1e4);
    for (const feat of Features) {
      if (feat.executionTime === StartTime.DocumentBody && await safeShouldRun(feat)) {
        if (feat.httpIntercept) {
          feat.httpIntercept.name = feat.name;
          registerHttpInterceptor(feat.httpIntercept);
        }
        safeRun(feat);
      }
    }
  }
  main();

})();