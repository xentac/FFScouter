// ==UserScript==
// @name         FF Scouter V2 beta
// @namespace    xentac-beta
// @version      3.0-beta3
// @author       xentac [3354782], MAVRI [2402357], rDacted [2670953], Weav3r [1853324], Glasnost [1844049]
// @description  Shows the expected Fair Fight score against targets and faction war status
// @license      GPLv3
// @copyright    2026, xentac
// @match        https://www.torn.com/*
// @connect      ffscouter.com
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const n=new Set;const importCSS = async e=>{n.has(e)||(n.add(e),(d=>{const t=document.createElement("style");t.textContent=d,(document.head||document.documentElement).appendChild(t);})(e));};

  var StartTime = ((StartTime2) => {
    StartTime2[StartTime2["DocumentStart"] = 0] = "DocumentStart";
    StartTime2[StartTime2["DocumentBody"] = 1] = "DocumentBody";
    StartTime2[StartTime2["DocumentEnd"] = 2] = "DocumentEnd";
    return StartTime2;
  })(StartTime || {});
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
      if (typeof window !== "undefined") {
        if (window.flutter_inappwebview) {
          this.isPDA = true;
        }
        window.addEventListener("flutterInAppWebViewPlatformReady", () => {
          window.flutter_inappwebview.callHandler("isTornPDA").then((response) => {
            if (response?.isTornPDA) {
              this.isPDA = true;
            }
          }).catch(() => {
          });
        });
      }
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
        if (typeof arg === "object" && arg !== null) {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return arg;
      });
    }
  }
  const logger = new Logger(
    "FFSV3",
    0
);
  const log$g = logger.child("storage");
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
        log$g.error(`Error storing item '${key}':`, error);
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
          log$g.warn(`Key '${key}' has invalid JSON in it.`);
          this.remove(key);
          return null;
        }
        if (item.expiration && Date.now() > item.expiration) {
          this.remove(key);
          log$g.debug(`Key ${key} has expired.`);
          return null;
        }
        return item.value;
      } catch (error) {
        log$g.error(`Error retrieving item '${key}':`, error);
        return null;
      }
    }
remove(key) {
      try {
        localStorage.removeItem(this.prefix + key);
      } catch (error) {
        log$g.error(`Error removing item [${key}]:`, error);
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
        log$g.error("Error clearing storage:", error);
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
    war_quick_attack_action: "new_tab",
    network_interception_enabled: false,
    status_attack_links_enabled: true
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
    get gauge_marker_type() {
      return this.storage.get(
        "gauge_marker_type"
) ?? CONFIG_DEFAULTS.gauge_marker_type;
    }
    set gauge_marker_type(val) {
      this.storage.set("gauge_marker_type", val);
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
        "war_quick_attack_action"
);
      this.storage.remove(
        "status_attack_links_enabled"
);
    }
  }
  const ffconfig = new FFConfig("ffsv3-config");
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
      function generateErrorString(e2) {
        switch (typeof e2) {
          case "string":
            return e2;
          case "object": {
            if (e2 instanceof Error)
              return e2.message;
            return JSON.stringify(e2);
          }
          default:
            return e2.toString();
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
    defaultComment: "FFScouterV3",
    defaultTimeout: 30
});
  async function gmRequest(options) {
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
      throw new FFApiError(
        `API request failed. Couldn't parse response. HTTP status code: ${resp.status}`,
        { ff_api_limits: limits }
      );
    }
    if (ff_response == null) {
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
      throw new FFApiError(
        `API request failed. Couldn't parse response. HTTP status code: ${resp.status}`,
        { ff_api_limits: limits }
      );
    }
    if (ff_response == null) {
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
      throw new FFApiError(
        `API request failed. Couldn't parse response. HTTP status code: ${resp.status}`,
        { ff_api_limits: limits }
      );
    }
    if (ff_response == null) {
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
  const log$f = logger.child("api");
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
          log$f.error(
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
        const status = await this.check_key_status(force);
        if (!status) {
          return false;
        }
        return status.is_premium;
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
  const instanceOfAny = (object, constructors) => constructors.some((c2) => object instanceof c2);
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
  const log$e = logger.child("storage");
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
          (db, _2) => {
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
          (db, _2) => {
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
          (db, _2) => {
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
                log$e.info("Need to upgrade from", oldVersion, "to", newVersion);
                for (let i2 = (oldVersion ?? 0) + 1; i2 <= cache.db_version; i2++) {
                  log$e.debug(`Migration: ${i2}`);
                  const m2 = cache.migrations.get(i2);
                  if (m2) {
                    m2(db2, transaction);
                  } else {
                    log$e.debug(`Migration not found: ${i2}`);
                  }
                  log$e.debug(`Migration complete: ${i2}`);
                }
              },
              blocking(currentVersion, blockedVersion, event) {
                log$e.debug(
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
              log$e.debug("deleteDB blocked callback called!");
            }
          });
          log$e.info(`Successfully deleted ${this.db_name} IndexedDB.`);
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
              const r2 = await index2.getAllKeys(range);
              log$e.info(`Found ${r2.length} expired values to delete from cache.`);
              await Promise.all(r2.map((id) => tx.store.delete(id)));
              await tx.done;
            }
            {
              const tx = db.transaction(STORES.FLIGHTS, "readwrite");
              const index2 = tx.store.index("expiry");
              const range = IDBKeyRange.upperBound(Date.now());
              const r2 = await index2.getAllKeys(range);
              log$e.info(`Found ${r2.length} expired values to delete from flights.`);
              await Promise.all(r2.map((id) => tx.store.delete(id)));
              await tx.done;
            }
            {
              const tx = db.transaction(STORES.ANALYTICS, "readwrite");
              const index2 = tx.store.index("timestamp");
              const thirty_days_ago = Date.now() - 30 * 24 * 60 * 60 * 1e3;
              const range = IDBKeyRange.upperBound(thirty_days_ago);
              const r2 = await index2.getAllKeys(range);
              log$e.info(
                `Found ${r2.length} expired values to delete from analytics.`
              );
              await Promise.all(r2.map((id) => tx.store.delete(id)));
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
  const log$d = logger.child("api");
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
        const p2 = this.pending.get(player_id);
        if (p2) {
          return p2.promise;
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
          log$d.error("Failed to delete flight from cache", err);
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
          log$d.warn(
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
        log$d.debug(`Querying paced flight API for player ${player_id}`);
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
              log$d.error("Failed to update flight cache", err);
            }
          } else {
            log$d.debug(`Start rechecking cycle for player ${player_id}`);
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
              log$d.error("Failed to update flight cache during recheck", err);
            }
            finalResult = rechecking_response;
          }
          for (const job of pending) {
            job.resolve(finalResult);
          }
        } catch (err) {
          log$d.error(`Paced flight API query failed for ${player_id}:`, err);
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
            log$d.error("Failed to clean expired cache entries", err);
          }
          if (this.flight_queue.length > 0) {
            this.schedule_flight_processor(FLIGHT_PACING_DELAY);
          }
        }
      };
      this.get_flights = async (player_id) => {
        log$d.debug(`get_flights called for ${player_id}`);
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
          log$d.error("Failed to query flight cache", err);
        }
        if (cached) {
          log$d.debug(`Flight cache hit for player ${player_id}`);
          if (cached.rechecking) {
            const now = Date.now();
            if (cached.recheck_until && now >= cached.recheck_until) {
              log$d.debug(
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
                log$d.error("Failed to finalize flight cache", err);
              }
              return final_response;
            }
            if (cached.next_retry_at && now >= cached.next_retry_at) {
              log$d.debug(
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
        log$d.debug(`Flight cache miss for player ${player_id}. Querying API paced.`);
        const result = await this.enqueue_flight_api(player_id);
        return result;
      };
      this.complete = () => {
        this.process_cache();
      };
      this.enqueue_cache = (player_id) => {
        log$d.debug(`Enqueuing cache ${player_id}`);
        this.cache_queue.add(player_id);
        this.schedule_cache();
      };
      this.schedule_cache = () => {
        if (this.cache_timer) {
          log$d.debug(`schedule_cache called but job already scheduled`);
          return;
        }
        log$d.debug(
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
        } catch (_2) {
          results = new Map();
        }
        log$d.debug("Received results", results);
        for (const id of ids) {
          const v2 = results.get(id);
          if (v2) {
            log$d.debug("Id", id, "found in cache. Resolving value.");
            this.resolve(id, v2);
          } else {
            log$d.debug("Id", id, "not found in cache. Scheduling api call.");
            this.enqueue_api(id);
          }
        }
      };
      this.clear_cache = () => {
        this.cache.delete_db();
        check_key_status.clear();
      };
      this.enqueue_api = (player_id) => {
        log$d.debug(`Enqueuing api ${player_id}`);
        this.api_queue.add(player_id);
        this.schedule_api();
      };
      this.schedule_api = (delay = this.api_initial_delay) => {
        if (this.api_timer) {
          log$d.debug(`schedule_api called but job already scheduled`);
          return;
        }
        log$d.debug(`schedule_api called and job scheduled for ${delay} ms`);
        this.api_timer = this.schedule(this.process_api, delay);
      };
      this.process_api = async () => {
        log$d.debug("process_api called");
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
        log$d.debug(`Processing ${ids} api requests`);
        if (ids.length <= 0) {
          log$d.debug("No ids found to query");
          return;
        }
        let next_run = this.api_default_delay;
        let results;
        try {
          log$d.debug("Calling query_stats with", this.config.key, ",", ids);
          results = await query_stats(this.config.key, ids);
        } catch (err) {
          log$d.error("Received error response querying ffscouter api:", err);
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
        log$d.debug("Received results", results);
        if (results.blank) {
          for (const id of ids) {
            this.requeue_api(id);
          }
        } else {
          try {
            await this.cache.update(Array.from(results.result.values()));
          } catch (err) {
            log$d.error("Failed to update cache", err);
          }
          for (const id of ids) {
            const v2 = results.result.get(id);
            if (v2) {
              log$d.debug("Id", id, "found in results. Resolving value.");
              this.resolve(id, v2);
            } else {
              log$d.debug("Id", id, "not found in results. Resolving no_data.");
              this.resolve(id, { player_id: id, no_data: true });
            }
          }
        }
        if (results.limits) {
          this.last_limits = results.limits;
          next_run = this.calculate_next_api_run(results.limits);
        }
        this.schedule_api(next_run);
        await this.cache.clean_expired();
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
          log$d.error("Failed to add analytics entry", err);
        }
      };
      this.get_analytics_entries = async () => {
        try {
          return await this.cache.get_analytics();
        } catch (err) {
          log$d.error("Failed to get analytics entries", err);
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
          log$d.error("Failed to clear analytics entries", err);
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
  const HOUR = 60 * 60;
  const DAY = HOUR * 24;
  const OLD_ESTIMATE_INTERVAL = 14 * DAY;
  function format_ff_score(d2) {
    const ff = d2.fair_fight.toFixed(2);
    const now = Date.now() / 1e3;
    const age = now - d2.last_updated;
    var suffix = "";
    if (age > OLD_ESTIMATE_INTERVAL) {
      suffix = "?";
    }
    return `${ff}${suffix}`;
  }
  function format_difficulty_text(d2) {
    if (d2.fair_fight <= 1) {
      return "Extremely easy";
    } else if (d2.fair_fight <= 2) {
      return "Easy";
    } else if (d2.fair_fight <= 3.5) {
      return "Moderately difficult";
    } else if (d2.fair_fight <= 4.5) {
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
  const arrow_gradient3 = [
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
  ];
  function get_ff_arrow_colour(d2) {
    if (d2.no_data) {
      return "#000000";
    }
    let ff = d2.fair_fight;
    if (ff < 1) {
      ff = 1;
    } else if (ff > 5) {
      ff = 5;
    }
    const ratio = Math.floor((ff - 1) / 4 * 10);
    const r2 = arrow_gradient3[ratio];
    return r2 ?? "#000000";
  }
  function get_contrast_color(hex) {
    const r2 = parseInt(hex.slice(1, 3), 16);
    const g2 = parseInt(hex.slice(3, 5), 16);
    const b2 = parseInt(hex.slice(5, 7), 16);
    const brightness = r2 * 0.299 + g2 * 0.587 + b2 * 0.114;
    return brightness > 126 ? "black" : "white";
  }
  function ff_to_percent(d2) {
    const low_ff = ffconfig.low_ff_range;
    const high_ff = ffconfig.high_ff_range;
    const max_ff = ffconfig.max_ff_range;
    const low_mid_percent = 33;
    const mid_high_percent = 66;
    const ff_lower = Math.min(d2.fair_fight, max_ff);
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
  const log$c = logger.child("dom");
  const ID_PARAMS = ["XID", "user2ID"];
  function extract_id_from_url(url) {
    const parsed = new URL(url);
    const search = new URLSearchParams(parsed.search);
    for (const param of ID_PARAMS) {
      const v2 = search.get(param);
      if (v2) {
        return parseInt(v2, 10);
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
    div.innerHTML = `<svg version="1.2" id="Layer_1" x="0px" y="0px" width="20" height="13" viewBox="0 0 20 13" xml:space="preserve" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg">
	<path fill-rule="evenodd" fill="${fill}" stroke="#000000" d="M 0,0 H 13 20 L 10,12 Z" id="path1" style="display:inline;stroke-width:1.50;"/>
</svg>`;
    if (!div.firstChild || !(div.firstChild instanceof SVGElement)) {
      throw new Error(
        "Wasn't able to extract just created SVG out of div element"
      );
    }
    const svg = div.firstChild;
    svg.classList.add("ffsv3-arrow");
    return svg;
  }
  function make_marker(d2) {
    const markerType = ffconfig.gauge_marker_type;
    if (markerType === GaugeMarkerType.BUBBLE_FF || markerType === GaugeMarkerType.BUBBLE_ESTIMATE) {
      const fill = get_ff_arrow_colour(d2);
      const contrastColor = get_contrast_color(fill);
      const bubble = document.createElement("div");
      bubble.classList.add("ffsv3-bubble");
      bubble.style.backgroundColor = fill;
      bubble.style.color = contrastColor;
      if (markerType === GaugeMarkerType.BUBBLE_FF) {
        bubble.textContent = d2.fair_fight.toFixed(2);
      } else {
        bubble.textContent = d2.bs_estimate_human || "N/A";
      }
      return bubble;
    }
    return make_arrow(d2);
  }
  function add_ff_arrow(element, featureName = "Unknown") {
    const player_id = get_player_id_in_element(element);
    if (!player_id) {
      return;
    }
    if (element.querySelector(".ffsv3-gauge") || element.classList.contains("ffsv3-gauge")) {
      ffscouter.add_analytics_entry(featureName, player_id, "ignored");
      return;
    }
    ffscouter.get(player_id).then((d2) => {
      if (d2.no_data) {
        return;
      }
      if (element.querySelector(".ffsv3-gauge") || element.classList.contains("ffsv3-gauge")) {
        ffscouter.add_analytics_entry(featureName, player_id, "ignored");
        return;
      }
      const percent = ff_to_percent(d2);
      element.classList.add("ffsv3-gauge");
      element.style.setProperty("--band-percent", `${percent}`);
      const a2 = element.querySelector(".ffsv3-arrow, .ffsv3-bubble");
      if (a2) {
        a2.remove();
      }
      element.appendChild(make_marker(d2));
      ffscouter.add_analytics_entry(featureName, player_id, "applied");
    });
  }
  function has_href(el) {
    return el instanceof HTMLAnchorElement;
  }
  function extract_target_id(href, r2) {
    const match = href.match(r2);
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
  function apply_ff_gauge_selector(node_list, featureName = "Unknown") {
    for (const node of node_list) {
      add_ff_arrow(node, featureName);
    }
  }
  function apply_ff_gauge(element, featureName = "Unknown") {
    if (!(element instanceof HTMLElement)) {
      return;
    }
    add_ff_arrow(element, featureName);
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
      log$c.debug("Failed to find the XID element.");
      return null;
    }
    try {
      const params = new URL(name.href).searchParams;
      return params.get("XID");
    } catch {
      log$c.debug("User XID is malformed");
      return null;
    }
  }
  function create_info_line() {
    const info_line = document.createElement("div");
    info_line.className = "ffsv3-info-line";
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
    const sortIcon = Array.from(existing.classList).find((c2) => c2.startsWith("sortIcon___")) ?? "";
    const classes = SORT_ICON_CLASS_SETS[sortIcon];
    if (!classes) return null;
    const tab = Array.from(existing.parentElement?.classList ?? []).find(
      (c2) => c2.startsWith("tab___")
    ) ?? "";
    return { ...classes, tab };
  }
  const t$2 = globalThis, e$2 = t$2.ShadowRoot && (void 0 === t$2.ShadyCSS || t$2.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, s$2 = Symbol(), o$4 = new WeakMap();
  let n$3 = class n {
    constructor(t2, e2, o2) {
      if (this._$cssResult$ = true, o2 !== s$2) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
      this.cssText = t2, this.t = e2;
    }
    get styleSheet() {
      let t2 = this.o;
      const s2 = this.t;
      if (e$2 && void 0 === t2) {
        const e2 = void 0 !== s2 && 1 === s2.length;
        e2 && (t2 = o$4.get(s2)), void 0 === t2 && ((this.o = t2 = new CSSStyleSheet()).replaceSync(this.cssText), e2 && o$4.set(s2, t2));
      }
      return t2;
    }
    toString() {
      return this.cssText;
    }
  };
  const r$4 = (t2) => new n$3("string" == typeof t2 ? t2 : t2 + "", void 0, s$2), S$1 = (s2, o2) => {
    if (e$2) s2.adoptedStyleSheets = o2.map((t2) => t2 instanceof CSSStyleSheet ? t2 : t2.styleSheet);
    else for (const e2 of o2) {
      const o3 = document.createElement("style"), n3 = t$2.litNonce;
      void 0 !== n3 && o3.setAttribute("nonce", n3), o3.textContent = e2.cssText, s2.appendChild(o3);
    }
  }, c$2 = e$2 ? (t2) => t2 : (t2) => t2 instanceof CSSStyleSheet ? ((t3) => {
    let e2 = "";
    for (const s2 of t3.cssRules) e2 += s2.cssText;
    return r$4(e2);
  })(t2) : t2;
  const { is: i$2, defineProperty: e$1, getOwnPropertyDescriptor: h$1, getOwnPropertyNames: r$3, getOwnPropertySymbols: o$3, getPrototypeOf: n$2 } = Object, a$1 = globalThis, c$1 = a$1.trustedTypes, l$1 = c$1 ? c$1.emptyScript : "", p$1 = a$1.reactiveElementPolyfillSupport, d$1 = (t2, s2) => t2, u$1 = { toAttribute(t2, s2) {
    switch (s2) {
      case Boolean:
        t2 = t2 ? l$1 : null;
        break;
      case Object:
      case Array:
        t2 = null == t2 ? t2 : JSON.stringify(t2);
    }
    return t2;
  }, fromAttribute(t2, s2) {
    let i2 = t2;
    switch (s2) {
      case Boolean:
        i2 = null !== t2;
        break;
      case Number:
        i2 = null === t2 ? null : Number(t2);
        break;
      case Object:
      case Array:
        try {
          i2 = JSON.parse(t2);
        } catch (t3) {
          i2 = null;
        }
    }
    return i2;
  } }, f$1 = (t2, s2) => !i$2(t2, s2), b$1 = { attribute: true, type: String, converter: u$1, reflect: false, useDefault: false, hasChanged: f$1 };
  Symbol.metadata ??= Symbol("metadata"), a$1.litPropertyMetadata ??= new WeakMap();
  let y$1 = class y extends HTMLElement {
    static addInitializer(t2) {
      this._$Ei(), (this.l ??= []).push(t2);
    }
    static get observedAttributes() {
      return this.finalize(), this._$Eh && [...this._$Eh.keys()];
    }
    static createProperty(t2, s2 = b$1) {
      if (s2.state && (s2.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t2) && ((s2 = Object.create(s2)).wrapped = true), this.elementProperties.set(t2, s2), !s2.noAccessor) {
        const i2 = Symbol(), h2 = this.getPropertyDescriptor(t2, i2, s2);
        void 0 !== h2 && e$1(this.prototype, t2, h2);
      }
    }
    static getPropertyDescriptor(t2, s2, i2) {
      const { get: e2, set: r2 } = h$1(this.prototype, t2) ?? { get() {
        return this[s2];
      }, set(t3) {
        this[s2] = t3;
      } };
      return { get: e2, set(s3) {
        const h2 = e2?.call(this);
        r2?.call(this, s3), this.requestUpdate(t2, h2, i2);
      }, configurable: true, enumerable: true };
    }
    static getPropertyOptions(t2) {
      return this.elementProperties.get(t2) ?? b$1;
    }
    static _$Ei() {
      if (this.hasOwnProperty(d$1("elementProperties"))) return;
      const t2 = n$2(this);
      t2.finalize(), void 0 !== t2.l && (this.l = [...t2.l]), this.elementProperties = new Map(t2.elementProperties);
    }
    static finalize() {
      if (this.hasOwnProperty(d$1("finalized"))) return;
      if (this.finalized = true, this._$Ei(), this.hasOwnProperty(d$1("properties"))) {
        const t3 = this.properties, s2 = [...r$3(t3), ...o$3(t3)];
        for (const i2 of s2) this.createProperty(i2, t3[i2]);
      }
      const t2 = this[Symbol.metadata];
      if (null !== t2) {
        const s2 = litPropertyMetadata.get(t2);
        if (void 0 !== s2) for (const [t3, i2] of s2) this.elementProperties.set(t3, i2);
      }
      this._$Eh = new Map();
      for (const [t3, s2] of this.elementProperties) {
        const i2 = this._$Eu(t3, s2);
        void 0 !== i2 && this._$Eh.set(i2, t3);
      }
      this.elementStyles = this.finalizeStyles(this.styles);
    }
    static finalizeStyles(s2) {
      const i2 = [];
      if (Array.isArray(s2)) {
        const e2 = new Set(s2.flat(1 / 0).reverse());
        for (const s3 of e2) i2.unshift(c$2(s3));
      } else void 0 !== s2 && i2.push(c$2(s2));
      return i2;
    }
    static _$Eu(t2, s2) {
      const i2 = s2.attribute;
      return false === i2 ? void 0 : "string" == typeof i2 ? i2 : "string" == typeof t2 ? t2.toLowerCase() : void 0;
    }
    constructor() {
      super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
    }
    _$Ev() {
      this._$ES = new Promise((t2) => this.enableUpdating = t2), this._$AL = new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t2) => t2(this));
    }
    addController(t2) {
      (this._$EO ??= new Set()).add(t2), void 0 !== this.renderRoot && this.isConnected && t2.hostConnected?.();
    }
    removeController(t2) {
      this._$EO?.delete(t2);
    }
    _$E_() {
      const t2 = new Map(), s2 = this.constructor.elementProperties;
      for (const i2 of s2.keys()) this.hasOwnProperty(i2) && (t2.set(i2, this[i2]), delete this[i2]);
      t2.size > 0 && (this._$Ep = t2);
    }
    createRenderRoot() {
      const t2 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
      return S$1(t2, this.constructor.elementStyles), t2;
    }
    connectedCallback() {
      this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t2) => t2.hostConnected?.());
    }
    enableUpdating(t2) {
    }
    disconnectedCallback() {
      this._$EO?.forEach((t2) => t2.hostDisconnected?.());
    }
    attributeChangedCallback(t2, s2, i2) {
      this._$AK(t2, i2);
    }
    _$ET(t2, s2) {
      const i2 = this.constructor.elementProperties.get(t2), e2 = this.constructor._$Eu(t2, i2);
      if (void 0 !== e2 && true === i2.reflect) {
        const h2 = (void 0 !== i2.converter?.toAttribute ? i2.converter : u$1).toAttribute(s2, i2.type);
        this._$Em = t2, null == h2 ? this.removeAttribute(e2) : this.setAttribute(e2, h2), this._$Em = null;
      }
    }
    _$AK(t2, s2) {
      const i2 = this.constructor, e2 = i2._$Eh.get(t2);
      if (void 0 !== e2 && this._$Em !== e2) {
        const t3 = i2.getPropertyOptions(e2), h2 = "function" == typeof t3.converter ? { fromAttribute: t3.converter } : void 0 !== t3.converter?.fromAttribute ? t3.converter : u$1;
        this._$Em = e2;
        const r2 = h2.fromAttribute(s2, t3.type);
        this[e2] = r2 ?? this._$Ej?.get(e2) ?? r2, this._$Em = null;
      }
    }
    requestUpdate(t2, s2, i2, e2 = false, h2) {
      if (void 0 !== t2) {
        const r2 = this.constructor;
        if (false === e2 && (h2 = this[t2]), i2 ??= r2.getPropertyOptions(t2), !((i2.hasChanged ?? f$1)(h2, s2) || i2.useDefault && i2.reflect && h2 === this._$Ej?.get(t2) && !this.hasAttribute(r2._$Eu(t2, i2)))) return;
        this.C(t2, s2, i2);
      }
      false === this.isUpdatePending && (this._$ES = this._$EP());
    }
    C(t2, s2, { useDefault: i2, reflect: e2, wrapped: h2 }, r2) {
      i2 && !(this._$Ej ??= new Map()).has(t2) && (this._$Ej.set(t2, r2 ?? s2 ?? this[t2]), true !== h2 || void 0 !== r2) || (this._$AL.has(t2) || (this.hasUpdated || i2 || (s2 = void 0), this._$AL.set(t2, s2)), true === e2 && this._$Em !== t2 && (this._$Eq ??= new Set()).add(t2));
    }
    async _$EP() {
      this.isUpdatePending = true;
      try {
        await this._$ES;
      } catch (t3) {
        Promise.reject(t3);
      }
      const t2 = this.scheduleUpdate();
      return null != t2 && await t2, !this.isUpdatePending;
    }
    scheduleUpdate() {
      return this.performUpdate();
    }
    performUpdate() {
      if (!this.isUpdatePending) return;
      if (!this.hasUpdated) {
        if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
          for (const [t4, s3] of this._$Ep) this[t4] = s3;
          this._$Ep = void 0;
        }
        const t3 = this.constructor.elementProperties;
        if (t3.size > 0) for (const [s3, i2] of t3) {
          const { wrapped: t4 } = i2, e2 = this[s3];
          true !== t4 || this._$AL.has(s3) || void 0 === e2 || this.C(s3, void 0, i2, e2);
        }
      }
      let t2 = false;
      const s2 = this._$AL;
      try {
        t2 = this.shouldUpdate(s2), t2 ? (this.willUpdate(s2), this._$EO?.forEach((t3) => t3.hostUpdate?.()), this.update(s2)) : this._$EM();
      } catch (s3) {
        throw t2 = false, this._$EM(), s3;
      }
      t2 && this._$AE(s2);
    }
    willUpdate(t2) {
    }
    _$AE(t2) {
      this._$EO?.forEach((t3) => t3.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t2)), this.updated(t2);
    }
    _$EM() {
      this._$AL = new Map(), this.isUpdatePending = false;
    }
    get updateComplete() {
      return this.getUpdateComplete();
    }
    getUpdateComplete() {
      return this._$ES;
    }
    shouldUpdate(t2) {
      return true;
    }
    update(t2) {
      this._$Eq &&= this._$Eq.forEach((t3) => this._$ET(t3, this[t3])), this._$EM();
    }
    updated(t2) {
    }
    firstUpdated(t2) {
    }
  };
  y$1.elementStyles = [], y$1.shadowRootOptions = { mode: "open" }, y$1[d$1("elementProperties")] = new Map(), y$1[d$1("finalized")] = new Map(), p$1?.({ ReactiveElement: y$1 }), (a$1.reactiveElementVersions ??= []).push("2.1.2");
  const t$1 = globalThis, i$1 = (t2) => t2, s$1 = t$1.trustedTypes, e = s$1 ? s$1.createPolicy("lit-html", { createHTML: (t2) => t2 }) : void 0, h = "$lit$", o$2 = `lit$${Math.random().toFixed(9).slice(2)}$`, n$1 = "?" + o$2, r$2 = `<${n$1}>`, l = document, c = () => l.createComment(""), a = (t2) => null === t2 || "object" != typeof t2 && "function" != typeof t2, u = Array.isArray, d = (t2) => u(t2) || "function" == typeof t2?.[Symbol.iterator], f = "[ 	\n\f\r]", v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, _ = /-->/g, m = />/g, p = RegExp(`>|${f}(?:([^\\s"'>=/]+)(${f}*=${f}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), g = /'/g, $ = /"/g, y2 = /^(?:script|style|textarea|title)$/i, x = (t2) => (i2, ...s2) => ({ _$litType$: t2, strings: i2, values: s2 }), b = x(1), E = Symbol.for("lit-noChange"), A = Symbol.for("lit-nothing"), C = new WeakMap(), P = l.createTreeWalker(l, 129);
  function V(t2, i2) {
    if (!u(t2) || !t2.hasOwnProperty("raw")) throw Error("invalid template strings array");
    return void 0 !== e ? e.createHTML(i2) : i2;
  }
  const N = (t2, i2) => {
    const s2 = t2.length - 1, e2 = [];
    let n3, l2 = 2 === i2 ? "<svg>" : 3 === i2 ? "<math>" : "", c2 = v;
    for (let i3 = 0; i3 < s2; i3++) {
      const s3 = t2[i3];
      let a2, u2, d2 = -1, f2 = 0;
      for (; f2 < s3.length && (c2.lastIndex = f2, u2 = c2.exec(s3), null !== u2); ) f2 = c2.lastIndex, c2 === v ? "!--" === u2[1] ? c2 = _ : void 0 !== u2[1] ? c2 = m : void 0 !== u2[2] ? (y2.test(u2[2]) && (n3 = RegExp("</" + u2[2], "g")), c2 = p) : void 0 !== u2[3] && (c2 = p) : c2 === p ? ">" === u2[0] ? (c2 = n3 ?? v, d2 = -1) : void 0 === u2[1] ? d2 = -2 : (d2 = c2.lastIndex - u2[2].length, a2 = u2[1], c2 = void 0 === u2[3] ? p : '"' === u2[3] ? $ : g) : c2 === $ || c2 === g ? c2 = p : c2 === _ || c2 === m ? c2 = v : (c2 = p, n3 = void 0);
      const x2 = c2 === p && t2[i3 + 1].startsWith("/>") ? " " : "";
      l2 += c2 === v ? s3 + r$2 : d2 >= 0 ? (e2.push(a2), s3.slice(0, d2) + h + s3.slice(d2) + o$2 + x2) : s3 + o$2 + (-2 === d2 ? i3 : x2);
    }
    return [V(t2, l2 + (t2[s2] || "<?>") + (2 === i2 ? "</svg>" : 3 === i2 ? "</math>" : "")), e2];
  };
  class S {
    constructor({ strings: t2, _$litType$: i2 }, e2) {
      let r2;
      this.parts = [];
      let l2 = 0, a2 = 0;
      const u2 = t2.length - 1, d2 = this.parts, [f2, v2] = N(t2, i2);
      if (this.el = S.createElement(f2, e2), P.currentNode = this.el.content, 2 === i2 || 3 === i2) {
        const t3 = this.el.content.firstChild;
        t3.replaceWith(...t3.childNodes);
      }
      for (; null !== (r2 = P.nextNode()) && d2.length < u2; ) {
        if (1 === r2.nodeType) {
          if (r2.hasAttributes()) for (const t3 of r2.getAttributeNames()) if (t3.endsWith(h)) {
            const i3 = v2[a2++], s2 = r2.getAttribute(t3).split(o$2), e3 = /([.?@])?(.*)/.exec(i3);
            d2.push({ type: 1, index: l2, name: e3[2], strings: s2, ctor: "." === e3[1] ? I : "?" === e3[1] ? L : "@" === e3[1] ? z : H }), r2.removeAttribute(t3);
          } else t3.startsWith(o$2) && (d2.push({ type: 6, index: l2 }), r2.removeAttribute(t3));
          if (y2.test(r2.tagName)) {
            const t3 = r2.textContent.split(o$2), i3 = t3.length - 1;
            if (i3 > 0) {
              r2.textContent = s$1 ? s$1.emptyScript : "";
              for (let s2 = 0; s2 < i3; s2++) r2.append(t3[s2], c()), P.nextNode(), d2.push({ type: 2, index: ++l2 });
              r2.append(t3[i3], c());
            }
          }
        } else if (8 === r2.nodeType) if (r2.data === n$1) d2.push({ type: 2, index: l2 });
        else {
          let t3 = -1;
          for (; -1 !== (t3 = r2.data.indexOf(o$2, t3 + 1)); ) d2.push({ type: 7, index: l2 }), t3 += o$2.length - 1;
        }
        l2++;
      }
    }
    static createElement(t2, i2) {
      const s2 = l.createElement("template");
      return s2.innerHTML = t2, s2;
    }
  }
  function M(t2, i2, s2 = t2, e2) {
    if (i2 === E) return i2;
    let h2 = void 0 !== e2 ? s2._$Co?.[e2] : s2._$Cl;
    const o2 = a(i2) ? void 0 : i2._$litDirective$;
    return h2?.constructor !== o2 && (h2?._$AO?.(false), void 0 === o2 ? h2 = void 0 : (h2 = new o2(t2), h2._$AT(t2, s2, e2)), void 0 !== e2 ? (s2._$Co ??= [])[e2] = h2 : s2._$Cl = h2), void 0 !== h2 && (i2 = M(t2, h2._$AS(t2, i2.values), h2, e2)), i2;
  }
  class R {
    constructor(t2, i2) {
      this._$AV = [], this._$AN = void 0, this._$AD = t2, this._$AM = i2;
    }
    get parentNode() {
      return this._$AM.parentNode;
    }
    get _$AU() {
      return this._$AM._$AU;
    }
    u(t2) {
      const { el: { content: i2 }, parts: s2 } = this._$AD, e2 = (t2?.creationScope ?? l).importNode(i2, true);
      P.currentNode = e2;
      let h2 = P.nextNode(), o2 = 0, n3 = 0, r2 = s2[0];
      for (; void 0 !== r2; ) {
        if (o2 === r2.index) {
          let i3;
          2 === r2.type ? i3 = new k(h2, h2.nextSibling, this, t2) : 1 === r2.type ? i3 = new r2.ctor(h2, r2.name, r2.strings, this, t2) : 6 === r2.type && (i3 = new Z(h2, this, t2)), this._$AV.push(i3), r2 = s2[++n3];
        }
        o2 !== r2?.index && (h2 = P.nextNode(), o2++);
      }
      return P.currentNode = l, e2;
    }
    p(t2) {
      let i2 = 0;
      for (const s2 of this._$AV) void 0 !== s2 && (void 0 !== s2.strings ? (s2._$AI(t2, s2, i2), i2 += s2.strings.length - 2) : s2._$AI(t2[i2])), i2++;
    }
  }
  class k {
    get _$AU() {
      return this._$AM?._$AU ?? this._$Cv;
    }
    constructor(t2, i2, s2, e2) {
      this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t2, this._$AB = i2, this._$AM = s2, this.options = e2, this._$Cv = e2?.isConnected ?? true;
    }
    get parentNode() {
      let t2 = this._$AA.parentNode;
      const i2 = this._$AM;
      return void 0 !== i2 && 11 === t2?.nodeType && (t2 = i2.parentNode), t2;
    }
    get startNode() {
      return this._$AA;
    }
    get endNode() {
      return this._$AB;
    }
    _$AI(t2, i2 = this) {
      t2 = M(this, t2, i2), a(t2) ? t2 === A || null == t2 || "" === t2 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t2 !== this._$AH && t2 !== E && this._(t2) : void 0 !== t2._$litType$ ? this.$(t2) : void 0 !== t2.nodeType ? this.T(t2) : d(t2) ? this.k(t2) : this._(t2);
    }
    O(t2) {
      return this._$AA.parentNode.insertBefore(t2, this._$AB);
    }
    T(t2) {
      this._$AH !== t2 && (this._$AR(), this._$AH = this.O(t2));
    }
    _(t2) {
      this._$AH !== A && a(this._$AH) ? this._$AA.nextSibling.data = t2 : this.T(l.createTextNode(t2)), this._$AH = t2;
    }
    $(t2) {
      const { values: i2, _$litType$: s2 } = t2, e2 = "number" == typeof s2 ? this._$AC(t2) : (void 0 === s2.el && (s2.el = S.createElement(V(s2.h, s2.h[0]), this.options)), s2);
      if (this._$AH?._$AD === e2) this._$AH.p(i2);
      else {
        const t3 = new R(e2, this), s3 = t3.u(this.options);
        t3.p(i2), this.T(s3), this._$AH = t3;
      }
    }
    _$AC(t2) {
      let i2 = C.get(t2.strings);
      return void 0 === i2 && C.set(t2.strings, i2 = new S(t2)), i2;
    }
    k(t2) {
      u(this._$AH) || (this._$AH = [], this._$AR());
      const i2 = this._$AH;
      let s2, e2 = 0;
      for (const h2 of t2) e2 === i2.length ? i2.push(s2 = new k(this.O(c()), this.O(c()), this, this.options)) : s2 = i2[e2], s2._$AI(h2), e2++;
      e2 < i2.length && (this._$AR(s2 && s2._$AB.nextSibling, e2), i2.length = e2);
    }
    _$AR(t2 = this._$AA.nextSibling, s2) {
      for (this._$AP?.(false, true, s2); t2 !== this._$AB; ) {
        const s3 = i$1(t2).nextSibling;
        i$1(t2).remove(), t2 = s3;
      }
    }
    setConnected(t2) {
      void 0 === this._$AM && (this._$Cv = t2, this._$AP?.(t2));
    }
  }
  class H {
    get tagName() {
      return this.element.tagName;
    }
    get _$AU() {
      return this._$AM._$AU;
    }
    constructor(t2, i2, s2, e2, h2) {
      this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t2, this.name = i2, this._$AM = e2, this.options = h2, s2.length > 2 || "" !== s2[0] || "" !== s2[1] ? (this._$AH = Array(s2.length - 1).fill(new String()), this.strings = s2) : this._$AH = A;
    }
    _$AI(t2, i2 = this, s2, e2) {
      const h2 = this.strings;
      let o2 = false;
      if (void 0 === h2) t2 = M(this, t2, i2, 0), o2 = !a(t2) || t2 !== this._$AH && t2 !== E, o2 && (this._$AH = t2);
      else {
        const e3 = t2;
        let n3, r2;
        for (t2 = h2[0], n3 = 0; n3 < h2.length - 1; n3++) r2 = M(this, e3[s2 + n3], i2, n3), r2 === E && (r2 = this._$AH[n3]), o2 ||= !a(r2) || r2 !== this._$AH[n3], r2 === A ? t2 = A : t2 !== A && (t2 += (r2 ?? "") + h2[n3 + 1]), this._$AH[n3] = r2;
      }
      o2 && !e2 && this.j(t2);
    }
    j(t2) {
      t2 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t2 ?? "");
    }
  }
  class I extends H {
    constructor() {
      super(...arguments), this.type = 3;
    }
    j(t2) {
      this.element[this.name] = t2 === A ? void 0 : t2;
    }
  }
  class L extends H {
    constructor() {
      super(...arguments), this.type = 4;
    }
    j(t2) {
      this.element.toggleAttribute(this.name, !!t2 && t2 !== A);
    }
  }
  class z extends H {
    constructor(t2, i2, s2, e2, h2) {
      super(t2, i2, s2, e2, h2), this.type = 5;
    }
    _$AI(t2, i2 = this) {
      if ((t2 = M(this, t2, i2, 0) ?? A) === E) return;
      const s2 = this._$AH, e2 = t2 === A && s2 !== A || t2.capture !== s2.capture || t2.once !== s2.once || t2.passive !== s2.passive, h2 = t2 !== A && (s2 === A || e2);
      e2 && this.element.removeEventListener(this.name, this, s2), h2 && this.element.addEventListener(this.name, this, t2), this._$AH = t2;
    }
    handleEvent(t2) {
      "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t2) : this._$AH.handleEvent(t2);
    }
  }
  class Z {
    constructor(t2, i2, s2) {
      this.element = t2, this.type = 6, this._$AN = void 0, this._$AM = i2, this.options = s2;
    }
    get _$AU() {
      return this._$AM._$AU;
    }
    _$AI(t2) {
      M(this, t2);
    }
  }
  const B = t$1.litHtmlPolyfillSupport;
  B?.(S, k), (t$1.litHtmlVersions ??= []).push("3.3.3");
  const D = (t2, i2, s2) => {
    const e2 = s2?.renderBefore ?? i2;
    let h2 = e2._$litPart$;
    if (void 0 === h2) {
      const t3 = s2?.renderBefore ?? null;
      e2._$litPart$ = h2 = new k(i2.insertBefore(c(), t3), t3, void 0, s2 ?? {});
    }
    return h2._$AI(t2), h2;
  };
  const s = globalThis;
  class i extends y$1 {
    constructor() {
      super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
    }
    createRenderRoot() {
      const t2 = super.createRenderRoot();
      return this.renderOptions.renderBefore ??= t2.firstChild, t2;
    }
    update(t2) {
      const r2 = this.render();
      this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t2), this._$Do = D(r2, this.renderRoot, this.renderOptions);
    }
    connectedCallback() {
      super.connectedCallback(), this._$Do?.setConnected(true);
    }
    disconnectedCallback() {
      super.disconnectedCallback(), this._$Do?.setConnected(false);
    }
    render() {
      return E;
    }
  }
  i._$litElement$ = true, i["finalized"] = true, s.litElementHydrateSupport?.({ LitElement: i });
  const o$1 = s.litElementPolyfillSupport;
  o$1?.({ LitElement: i });
  (s.litElementVersions ??= []).push("4.2.2");
  const t = (t2) => (e2, o2) => {
    void 0 !== o2 ? o2.addInitializer(() => {
      customElements.define(t2, e2);
    }) : customElements.define(t2, e2);
  };
  const o = { attribute: true, type: String, converter: u$1, reflect: false, hasChanged: f$1 }, r$1 = (t2 = o, e2, r2) => {
    const { kind: n3, metadata: i2 } = r2;
    let s2 = globalThis.litPropertyMetadata.get(i2);
    if (void 0 === s2 && globalThis.litPropertyMetadata.set(i2, s2 = new Map()), "setter" === n3 && ((t2 = Object.create(t2)).wrapped = true), s2.set(r2.name, t2), "accessor" === n3) {
      const { name: o2 } = r2;
      return { set(r3) {
        const n4 = e2.get.call(this);
        e2.set.call(this, r3), this.requestUpdate(o2, n4, t2, true, r3);
      }, init(e3) {
        return void 0 !== e3 && this.C(o2, void 0, t2, e3), e3;
      } };
    }
    if ("setter" === n3) {
      const { name: o2 } = r2;
      return function(r3) {
        const n4 = this[o2];
        e2.call(this, r3), this.requestUpdate(o2, n4, t2, true, r3);
      };
    }
    throw Error("Unsupported decorator location: " + n3);
  };
  function n2(t2) {
    return (e2, o2) => "object" == typeof o2 ? r$1(t2, e2, o2) : ((t3, e3, o3) => {
      const r2 = e3.hasOwnProperty(o3);
      return e3.constructor.createProperty(o3, t3), r2 ? Object.getOwnPropertyDescriptor(e3, o3) : void 0;
    })(t2, e2, o2);
  }
  function r(r2) {
    return n2({ ...r2, state: true, attribute: false });
  }
  var __defProp$3 = Object.defineProperty;
  var __getOwnPropDesc$3 = Object.getOwnPropertyDescriptor;
  var __decorateClass$3 = (decorators, target, key, kind) => {
    var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$3(target, key) : target;
    for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
      if (decorator = decorators[i2])
        result = (kind ? decorator(target, key, result) : decorator(result)) || result;
    if (kind && result) __defProp$3(target, key, result);
    return result;
  };
  const log$b = logger.child("ui");
  const PREMIUM_UPGRADE_URL$1 = "https://ffscouter.com/premium";
  let FFHeaderLine = class extends i {
    constructor() {
      super(...arguments);
      this.data = null;
      this.is_premium = null;
      this.loading = false;
    }
    createRenderRoot() {
      return this;
    }
willUpdate(changedProperties) {
      if (changedProperties.has("data") && this.data) {
        this.loading = true;
        const currentData = this.data;
        check_key_status.is_premium().then((premium) => {
          if (this.data === currentData) {
            this.is_premium = premium;
          }
        }).catch((error) => {
          log$b.error(error);
        }).finally(() => {
          if (this.data === currentData) {
            this.loading = false;
          }
        });
      }
    }
    render() {
      if (this.data === null || this.data.no_data) {
        return b`<span style="font-weight: bold; margin-right: 6px;"
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
      let extraDetailsLine = b``;
      if (this.data.distribution?.distribution_human) {
        const ageStr = format_relative_time(this.data.distribution.last_updated);
        extraDetailsLine = b`<span
        style="display:block; margin-top: 2px; font-size: 12px; font-style: normal;"
        ><span style="font-weight: bold; margin-right: 6px;">Top Stats:</span
        ><span style="font-weight: normal;"
          >${this.data.distribution.distribution_human} ${ageStr}</span
        ></span
      >`;
      } else if (this.loading) {
        extraDetailsLine = b``;
      } else if (this.is_premium === false && this.data.premium_insights_available) {
        extraDetailsLine = b`<span class="ff-premium-upgrade-line"
        ><a
          href="${PREMIUM_UPGRADE_URL$1}"
          target="_blank"
          rel="noopener noreferrer"
          style="font-weight: bold; text-decoration: underline;"
          >Premium Data Available - Upgrade To View</a
        ></span
      >`;
      }
      return b`<span style="font-weight: bold; margin-right: 6px;"
        >FairFight:</span
      ><span
        style="background: ${background_colour}; color: ${text_colour}; font-weight: bold; padding: 2px 6px; border-radius: 4px; display: inline-block;"
        >${ff_string} (${difficulty}) ${fresh}</span
      ><span
        style="font-size: 11px; font-weight: normal; margin-left: 6px; vertical-align: middle; font-style: italic;"
        >Est. Stats: <span>${this.data.bs_estimate_human}</span></span
      >${extraDetailsLine}`;
    }
  };
  __decorateClass$3([
    n2({ type: Object })
  ], FFHeaderLine.prototype, "data", 2);
  __decorateClass$3([
    r()
  ], FFHeaderLine.prototype, "is_premium", 2);
  __decorateClass$3([
    r()
  ], FFHeaderLine.prototype, "loading", 2);
  FFHeaderLine = __decorateClass$3([
    t("ff-header-line")
  ], FFHeaderLine);
  const log$a = logger.child("feature:attack");
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
      log$a.debug("On the attack page, found player_id", player_id);
      const info_line = create_info_line();
      ffscouter.get(player_id).then(async (data) => {
        const line = document.createElement("ff-header-line");
        line.data = data;
        info_line.appendChild(line);
        inject_info_line$1(info_line);
      });
      ffscouter.complete();
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
  var __defProp$2 = Object.defineProperty;
  var __getOwnPropDesc$2 = Object.getOwnPropertyDescriptor;
  var __decorateClass$2 = (decorators, target, key, kind) => {
    var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$2(target, key) : target;
    for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
      if (decorator = decorators[i2])
        result = (kind ? decorator(target, key, result) : decorator(result)) || result;
    if (kind && result) __defProp$2(target, key, result);
    return result;
  };
  const DEFAULT_HIDDEN_COLUMNS = {
    level: false,
    status: false,
    score: false
  };
  const DEFAULT_STATE = {
    activity: {
      online: true,
      idle: true,
      offline: true
    },
    status: {
      okay: true,
      traveling: true,
      hospital: true,
      jail: true,
      abroad: true
    }
  };
  function isMobileView() {
    return typeof window !== "undefined" && window.innerWidth < 784;
  }
  let FFFactionFilterBox = class extends i {
    constructor() {
      super(...arguments);
      this.mode = "faction";
      this.sortBy = "none";
      this.filterEnabled = true;
      this.colDisplay = FactionsColDisplay.FAIR_FIGHT;
      this.activity = { ...DEFAULT_STATE.activity };
      this.status = { ...DEFAULT_STATE.status };
      this.levelMin = null;
      this.levelMax = null;
      this.ffMin = null;
      this.ffMax = null;
      this.statsMin = null;
      this.statsMax = null;
      this.hiddenColumns = { ...DEFAULT_HIDDEN_COLUMNS };
      this.collapsed = false;
      this.wasMobile = isMobileView();
      this.debounceTimer = null;
      this.onResize = () => {
        const isMobile = isMobileView();
        if (isMobile !== this.wasMobile) {
          this.wasMobile = isMobile;
          this.loadState();
        }
      };
      this.onConfigUpdated = () => {
        this.colDisplay = this.mode === "war" ? ffconfig.war_col_display : ffconfig.factions_col_display;
        this.requestUpdate();
      };
    }
    createRenderRoot() {
      return this;
    }
    connectedCallback() {
      super.connectedCallback();
      this.loadState();
      window.addEventListener("ff-config-updated", this.onConfigUpdated);
      window.addEventListener("resize", this.onResize);
    }
    disconnectedCallback() {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      window.removeEventListener("resize", this.onResize);
      window.removeEventListener("ff-config-updated", this.onConfigUpdated);
      super.disconnectedCallback();
    }
    updated(changedProperties) {
      super.updated(changedProperties);
      if (changedProperties.has("hiddenColumns") || changedProperties.has("mode")) {
        this.updateContainerAttributes();
      }
    }
    updateContainerAttributes() {
      const isWar = this.mode === "war";
      if (!isWar) return;
      const target = this.closest(".faction-war");
      if (target instanceof HTMLElement) {
        for (const [col, isHidden] of Object.entries(this.hiddenColumns)) {
          const attrName = `data-ffscouter-hide-${col}`;
          if (isHidden) {
            target.setAttribute(attrName, "true");
          } else {
            target.removeAttribute(attrName);
          }
        }
      }
    }
    loadState() {
      const isWar = this.mode === "war";
      this.collapsed = isWar ? ffconfig.war_filter_collapsed : ffconfig.faction_filter_collapsed;
      this.colDisplay = isWar ? ffconfig.war_col_display : ffconfig.factions_col_display;
      const parsed = isWar ? ffconfig.war_filter_state : ffconfig.faction_filter_state;
      const isMobile = isMobileView();
      if (parsed) {
        const savedSortBy = parsed.sortBy ?? "none";
        this.sortBy = savedSortBy === "ff-asc" || savedSortBy === "ff-desc" ? savedSortBy : "none";
        this.filterEnabled = parsed.filterEnabled ?? true;
        this.activity = { ...DEFAULT_STATE.activity, ...parsed.activity };
        this.status = { ...DEFAULT_STATE.status, ...parsed.status };
        this.levelMin = parsed.levelMin ?? null;
        this.levelMax = parsed.levelMax ?? null;
        this.ffMin = parsed.ffMin ?? null;
        this.ffMax = parsed.ffMax ?? null;
        this.statsMin = parsed.statsMin ?? null;
        this.statsMax = parsed.statsMax ?? null;
        if (isMobile) {
          this.hiddenColumns = {
            level: parsed.hiddenColumnsMobile?.level ?? true,
status: parsed.hiddenColumnsMobile?.status ?? DEFAULT_HIDDEN_COLUMNS.status,
            score: parsed.hiddenColumnsMobile?.score ?? DEFAULT_HIDDEN_COLUMNS.score
          };
        } else {
          this.hiddenColumns = {
            level: parsed.hiddenColumns?.level ?? DEFAULT_HIDDEN_COLUMNS.level,
            status: parsed.hiddenColumns?.status ?? DEFAULT_HIDDEN_COLUMNS.status,
            score: parsed.hiddenColumns?.score ?? DEFAULT_HIDDEN_COLUMNS.score
          };
        }
      } else {
        this.hiddenColumns = {
          level: isMobile,
status: DEFAULT_HIDDEN_COLUMNS.status,
          score: DEFAULT_HIDDEN_COLUMNS.score
        };
      }
      this.dispatchChange();
    }
    onToggle(e2) {
      const details = e2.currentTarget;
      this.collapsed = !details.open;
      if (this.mode === "war") {
        ffconfig.war_filter_collapsed = this.collapsed;
      } else {
        ffconfig.faction_filter_collapsed = this.collapsed;
      }
    }
    saveState() {
      const isWar = this.mode === "war";
      const isMobile = isMobileView();
      const existingState = isWar ? ffconfig.war_filter_state : ffconfig.faction_filter_state;
      const savedHiddenColumns = existingState?.hiddenColumns;
      const savedHiddenColumnsMobile = existingState?.hiddenColumnsMobile;
      const hiddenColumnsToSave = isMobile ? savedHiddenColumns ?? DEFAULT_HIDDEN_COLUMNS : this.hiddenColumns;
      const hiddenColumnsMobileToSave = isMobile ? this.hiddenColumns : savedHiddenColumnsMobile ?? {
        level: true,
        status: false,
        score: false
      };
      const stateObj = {
        sortBy: this.sortBy,
        filterEnabled: this.filterEnabled,
        activity: this.activity,
        status: this.status,
        levelMin: this.levelMin,
        levelMax: this.levelMax,
        ffMin: this.ffMin,
        ffMax: this.ffMax,
        statsMin: this.statsMin,
        statsMax: this.statsMax,
        hiddenColumns: hiddenColumnsToSave,
        hiddenColumnsMobile: hiddenColumnsMobileToSave
      };
      if (isWar) {
        ffconfig.war_filter_state = stateObj;
      } else {
        ffconfig.faction_filter_state = stateObj;
      }
    }
    queueChange() {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = setTimeout(() => {
        this.saveState();
        this.dispatchChange();
        this.debounceTimer = null;
      }, 250);
    }
    executeChangeImmediately() {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      this.saveState();
      this.dispatchChange();
    }
    dispatchChange() {
      this.dispatchEvent(
        new CustomEvent("filter-change", {
          detail: {
            sortBy: this.sortBy,
            filterEnabled: this.filterEnabled,
            activity: this.activity,
            status: this.status,
            levelMin: this.levelMin,
            levelMax: this.levelMax,
            ffMin: this.ffMin,
            ffMax: this.ffMax,
            statsMin: this.statsMin ? parse_suffix_number(this.statsMin) : null,
            statsMax: this.statsMax ? parse_suffix_number(this.statsMax) : null
          },
          bubbles: true,
          composed: true
        })
      );
    }
    onColumnVisibilityChange(key, val) {
      this.hiddenColumns = {
        ...this.hiddenColumns,
        [key]: val
      };
      this.executeChangeImmediately();
    }
    setSortBy(val) {
      this.sortBy = val;
      this.executeChangeImmediately();
    }
    onSortToggle() {
      if (this.sortBy === "none") {
        this.sortBy = "ff-desc";
      } else if (this.sortBy === "ff-desc") {
        this.sortBy = "ff-asc";
      } else {
        this.sortBy = "none";
      }
      this.executeChangeImmediately();
    }
    onDisplayChange(e2) {
      const val = e2.target.value;
      this.colDisplay = val;
      if (this.mode === "war") {
        ffconfig.war_col_display = val;
      } else {
        ffconfig.factions_col_display = val;
      }
      window.dispatchEvent(new CustomEvent("ff-config-updated"));
      this.executeChangeImmediately();
    }
    onActivityChange(key, val) {
      this.activity = {
        ...this.activity,
        [key]: val
      };
      this.executeChangeImmediately();
    }
    onStatusChange(key, val) {
      this.status = {
        ...this.status,
        [key]: val
      };
      this.executeChangeImmediately();
    }
    onLevelChange(type, valStr) {
      const val = valStr === "" ? null : Number.parseInt(valStr, 10);
      if (type === "min") {
        this.levelMin = val;
      } else {
        this.levelMax = val;
      }
      this.queueChange();
    }
    onFFChange(type, valStr) {
      const val = valStr === "" ? null : Number.parseFloat(valStr);
      if (type === "min") {
        this.ffMin = val;
      } else {
        this.ffMax = val;
      }
      this.queueChange();
    }
    onStatsChange(type, valStr) {
      const val = valStr.trim() === "" ? null : valStr;
      if (type === "min") {
        this.statsMin = val;
      } else {
        this.statsMax = val;
      }
      this.queueChange();
    }
    onToggleFilter(e2) {
      if (e2) {
        e2.preventDefault();
        e2.stopPropagation();
      }
      this.filterEnabled = !this.filterEnabled;
      this.executeChangeImmediately();
    }
    onResetFilters(e2) {
      if (e2) {
        e2.preventDefault();
        e2.stopPropagation();
      }
      this.activity = { online: true, idle: true, offline: true };
      this.status = {
        okay: true,
        traveling: true,
        hospital: true,
        jail: true,
        abroad: true
      };
      this.levelMin = null;
      this.levelMax = null;
      this.ffMin = null;
      this.ffMax = null;
      this.statsMin = null;
      this.statsMax = null;
      this.executeChangeImmediately();
    }
    onCompareActivity() {
      const container = this.closest(".faction-war");
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
      for (const link of links) {
        tryExtract(link);
      }
      if (ids.length < 2) {
        const docLinks = Array.from(
          document.querySelectorAll('a[href*="step=profile"]')
        );
        for (const link of docLinks) {
          tryExtract(link);
        }
      }
      if (ids.length < 2) {
        console.warn("Could not find faction IDs to compare activity.");
        return;
      }
      const factionId1 = ids[0];
      const factionId2 = ids[1];
      const now = new Date();
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
      const formatUTC = (d2) => {
        const y3 = d2.getUTCFullYear();
        const m2 = String(d2.getUTCMonth() + 1).padStart(2, "0");
        const day = String(d2.getUTCDate()).padStart(2, "0");
        const h2 = String(d2.getUTCHours()).padStart(2, "0");
        const min = String(d2.getUTCMinutes()).padStart(2, "0");
        return `${y3}-${m2}-${day}T${h2}:${min}`;
      };
      const startAt = formatUTC(start);
      const endAt = formatUTC(now);
      const bucketMinutes = 5;
      const scouterUrl = `https://ffscouter.com/faction-activity-comparison?faction_id_1=${factionId1}&faction_id_2=${factionId2}&start_at=${encodeURIComponent(
      startAt
    )}&end_at=${encodeURIComponent(endAt)}&bucket_minutes=${bucketMinutes}`;
      window.open(scouterUrl, "_blank");
    }
    render() {
      const isEst = this.colDisplay === FactionsColDisplay.BATTLE_STATS;
      const sortText = isEst ? "Stats" : "FF";
      return b`
      <details
        class="ff-filter-box ${this.mode === "war" ? "no-borders" : ""}"
        ?open="${!this.collapsed}"
        @toggle="${this.onToggle}"
      >
        <summary
          style="cursor: pointer; font-weight: bold; font-size: 14px; user-select: none;"
        >
          <div
            style="display: inline-flex; justify-content: space-between; align-items: center; width: calc(100% - 24px); vertical-align: middle;"
          >
            <span>FFScouter Filter & Sort Controls</span>
            <div
              class="ff-filter-header-actions"
              @click="${(e2) => {
      e2.preventDefault();
      e2.stopPropagation();
    }}"
            >
              <button
                class="ff-action-icon-btn ${this.filterEnabled ? "active" : "inactive"}"
                title="${this.filterEnabled ? "Turn off filtering" : "Turn on filtering"}"
                @click="${(e2) => this.onToggleFilter(e2)}"
              >
                ${this.filterEnabled ? b`
                    <svg viewBox="0 0 16 16">
                      <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.124.318l-4.5 5.5v4.682a.5.5 0 0 1-.168.373l-2.5 2a.5.5 0 0 1-.832-.373v-6.682l-4.5-5.5A.5.5 0 0 1 1.5 3.5v-2z" />
                    </svg>
                  ` : b`
                    <svg viewBox="0 0 16 16">
                      <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.124.318l-4.5 5.5v4.682a.5.5 0 0 1-.168.373l-2.5 2a.5.5 0 0 1-.832-.373v-6.682l-4.5-5.5A.5.5 0 0 1 1.5 3.5v-2z" />
                      <line x1="1.5" y1="14.5" x2="14.5" y2="1.5" stroke="currentColor" stroke-width="1.5" />
                    </svg>
                  `}
              </button>
              <button
                class="ff-action-icon-btn reset-btn"
                title="Reset filters to default"
                @click="${(e2) => this.onResetFilters(e2)}"
              >
                <svg viewBox="0 0 16 16">
                  <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                  <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                </svg>
              </button>
            </div>
          </div>
        </summary>
        <div class="ff-filter-grid" style="margin-top: 12px;">
          <div class="ff-filter-group grp-sort">
            <strong>Sort & Display</strong>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <button id="sort-toggle-btn" @click="${this.onSortToggle}" style="width: 100%;">
                ${this.sortBy === "none" ? "Sort: Default" : this.sortBy === "ff-asc" ? `Sort: ${sortText} ▲` : `Sort: ${sortText} ▼`}
              </button>
              <select
                id="${this.mode === "war" ? "war-col-display-filter" : "factions-col-display-filter"}"
                .value=${this.colDisplay}
                @change=${this.onDisplayChange}
                style="padding: 4px; border: 1px solid var(--ffsv3-border-color); border-radius: 4px; background: var(--ffsv3-alt-bg-color); color: var(--ffsv3-text-color); font-size: 11px; cursor: pointer; height: 32px;"
              >
                <option value="fair_fight">Show: FF Score</option>
                <option value="battle_stats">Show: BS Estimate</option>
                <option value="none">Show: None (Hide)</option>
              </select>
              ${this.mode === "war" ? b`
                    <button
                      id="compare-faction-activity-btn"
                      @click="${this.onCompareActivity}"
                      style="width: 100%; height: 32px;"
                    >
                      Compare Activity
                    </button>
                  ` : ""}
            </div>
          </div>

          <div class="ff-filter-group grp-activity">
            <strong>Activity</strong>
            <div class="ff-filter-options">
              <label>
                <input
                  type="checkbox"
                  ?checked="${this.activity.online}"
                  @change="${(e2) => this.onActivityChange("online", e2.target.checked)}"
                />
                Online
              </label>
              <label>
                <input
                  type="checkbox"
                  ?checked="${this.activity.idle}"
                  @change="${(e2) => this.onActivityChange("idle", e2.target.checked)}"
                />
                Idle
              </label>
              <label>
                <input
                  type="checkbox"
                  ?checked="${this.activity.offline}"
                  @change="${(e2) => this.onActivityChange("offline", e2.target.checked)}"
                />
                Offline
              </label>
            </div>
          </div>

          <div class="ff-filter-group grp-status">
            <strong>Status</strong>
            <div class="ff-filter-options">
              <label>
                <input
                  type="checkbox"
                  ?checked="${this.status.okay}"
                  @change="${(e2) => this.onStatusChange("okay", e2.target.checked)}"
                />
                Okay
              </label>
              <label>
                <input
                  type="checkbox"
                  ?checked="${this.status.hospital}"
                  @change="${(e2) => this.onStatusChange("hospital", e2.target.checked)}"
                />
                Hospital
              </label>
              <label>
                <input
                  type="checkbox"
                  ?checked="${this.status.jail}"
                  @change="${(e2) => this.onStatusChange("jail", e2.target.checked)}"
                />
                Jail
              </label>
              <label>
                <input
                  type="checkbox"
                  ?checked="${this.status.abroad}"
                  @change="${(e2) => this.onStatusChange("abroad", e2.target.checked)}"
                />
                Abroad
              </label>
              <label>
                <input
                  type="checkbox"
                  ?checked="${this.status.traveling}"
                  @change="${(e2) => this.onStatusChange("traveling", e2.target.checked)}"
                />
                Traveling
              </label>
            </div>
          </div>

          <div class="ff-filter-group grp-level">
            <strong>Level Range</strong>
            <div class="ff-filter-range-inputs">
              <input
                type="number"
                placeholder="Min"
                .value="${this.levelMin !== null ? String(this.levelMin) : ""}"
                @input="${(e2) => this.onLevelChange("min", e2.target.value)}"
              />
              <span>to</span>
              <input
                type="number"
                placeholder="Max"
                .value="${this.levelMax !== null ? String(this.levelMax) : ""}"
                @input="${(e2) => this.onLevelChange("max", e2.target.value)}"
              />
            </div>
          </div>

          <div class="ff-filter-group grp-ff">
            <strong>FF Range</strong>
            <div class="ff-filter-range-inputs">
              <input
                type="number"
                step="0.1"
                placeholder="Min"
                .value="${this.ffMin !== null ? String(this.ffMin) : ""}"
                @input="${(e2) => this.onFFChange("min", e2.target.value)}"
              />
              <span>to</span>
              <input
                type="number"
                step="0.1"
                placeholder="Max"
                .value="${this.ffMax !== null ? String(this.ffMax) : ""}"
                @input="${(e2) => this.onFFChange("max", e2.target.value)}"
              />
            </div>
          </div>

          <div class="ff-filter-group grp-stats">
            <strong>Stats Range</strong>
            <div class="ff-filter-range-inputs">
              <input
                type="text"
                placeholder="Min"
                .value="${this.statsMin !== null ? this.statsMin : ""}"
                @input="${(e2) => this.onStatsChange("min", e2.target.value)}"
              />
              <span>to</span>
              <input
                type="text"
                placeholder="Max"
                .value="${this.statsMax !== null ? this.statsMax : ""}"
                @input="${(e2) => this.onStatsChange("max", e2.target.value)}"
              />
            </div>
          </div>

          ${this.mode === "war" ? b`
                <div class="ff-filter-group grp-columns">
                  <strong>Visible Columns</strong>
                  <div class="ff-filter-options">
                    <label>
                      <input
                        type="checkbox"
                        .checked="${!this.hiddenColumns.level}"
                        @change="${(e2) => this.onColumnVisibilityChange(
      "level",
      !e2.target.checked
    )}"
                      />
                      Level
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        .checked="${!this.hiddenColumns.status}"
                        @change="${(e2) => this.onColumnVisibilityChange(
      "status",
      !e2.target.checked
    )}"
                      />
                      Status
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        .checked="${!this.hiddenColumns.score}"
                        @change="${(e2) => this.onColumnVisibilityChange(
      "score",
      !e2.target.checked
    )}"
                      />
                      Score
                    </label>
                  </div>
                </div>
              ` : ""}
        </div>
      </details>
    `;
    }
  };
  __decorateClass$2([
    n2({ type: String })
  ], FFFactionFilterBox.prototype, "mode", 2);
  __decorateClass$2([
    r()
  ], FFFactionFilterBox.prototype, "sortBy", 2);
  __decorateClass$2([
    r()
  ], FFFactionFilterBox.prototype, "filterEnabled", 2);
  __decorateClass$2([
    r()
  ], FFFactionFilterBox.prototype, "colDisplay", 2);
  __decorateClass$2([
    r()
  ], FFFactionFilterBox.prototype, "activity", 2);
  __decorateClass$2([
    r()
  ], FFFactionFilterBox.prototype, "status", 2);
  __decorateClass$2([
    r()
  ], FFFactionFilterBox.prototype, "levelMin", 2);
  __decorateClass$2([
    r()
  ], FFFactionFilterBox.prototype, "levelMax", 2);
  __decorateClass$2([
    r()
  ], FFFactionFilterBox.prototype, "ffMin", 2);
  __decorateClass$2([
    r()
  ], FFFactionFilterBox.prototype, "ffMax", 2);
  __decorateClass$2([
    r()
  ], FFFactionFilterBox.prototype, "statsMin", 2);
  __decorateClass$2([
    r()
  ], FFFactionFilterBox.prototype, "statsMax", 2);
  __decorateClass$2([
    r()
  ], FFFactionFilterBox.prototype, "hiddenColumns", 2);
  __decorateClass$2([
    r()
  ], FFFactionFilterBox.prototype, "collapsed", 2);
  FFFactionFilterBox = __decorateClass$2([
    t("ff-faction-filter-box")
  ], FFFactionFilterBox);
  const log$9 = logger.child("feature:faction");
  const FEATURE_NAME$4 = "faction";
  const isApplying = new WeakMap();
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
        const activityImg = row.querySelector(".icons img");
        const activity = (activityImg?.getAttribute("alt") || "offline").toLowerCase();
        const allActivityUnchecked = !filters.activity.online && !filters.activity.idle && !filters.activity.offline;
        const matchesActivity = allActivityUnchecked || activity === "online" && filters.activity.online || activity === "idle" && filters.activity.idle || activity === "offline" && filters.activity.offline;
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
          } else {
            status = "okay";
          }
        }
        const allStatusUnchecked = !filters.status.okay && !filters.status.traveling && !filters.status.hospital && !filters.status.jail && !filters.status.abroad;
        const matchesStatus = allStatusUnchecked || status === "okay" && filters.status.okay || status === "traveling" && filters.status.traveling || status === "hospital" && filters.status.hospital || status === "jail" && filters.status.jail || status === "abroad" && filters.status.abroad;
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
        if (matchesActivity && matchesStatus && matchesLevel && matchesFF && matchesStats) {
          show_row(row);
        } else {
          hide_row(row);
        }
      }
      if (filters.sortBy !== "none") {
        const isEst = filters.colDisplay === FactionsColDisplay.BATTLE_STATS;
        const valKey = isEst ? "estValue" : "ffValue";
        rows.sort((a2, b2) => {
          const getVal = (row) => {
            const dataVal = row.dataset[valKey];
            return dataVal ? Number.parseFloat(dataVal) : -1;
          };
          const valA = getVal(a2);
          const valB = getVal(b2);
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
          for (const r2 of extra_tt_rows) {
            tbody.appendChild(r2);
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
    for (const p2 of travelingPlayers) {
      if (!p2.isTraveling) {
        p2.row.removeAttribute("data-earliest-arrival");
        p2.row.removeAttribute("data-latest-arrival");
        ffscouter.clear_flight_cache(p2.player_id);
      }
    }
    const traveling = travelingPlayers.filter((p2) => p2.isTraveling);
    if (traveling.length === 0) return;
    const isPremium = await check_key_status.is_premium();
    if (!isPremium) {
      for (const p2 of traveling) {
        p2.row.removeAttribute("data-earliest-arrival");
        p2.row.removeAttribute("data-latest-arrival");
      }
      return;
    }
    await Promise.all(
      traveling.map(async (p2) => {
        try {
          const flights = await ffscouter.get_flights(p2.player_id);
          const current = flights?.current;
          if (current) {
            const earliest = current.earliest_arrival_time;
            const latest = current.latest_arrival_time;
            p2.row.setAttribute("data-earliest-arrival", String(earliest));
            p2.row.setAttribute("data-latest-arrival", String(latest));
          } else {
            p2.row.removeAttribute("data-earliest-arrival");
            p2.row.removeAttribute("data-latest-arrival");
          }
        } catch (err) {
          log$9.error(`Failed to fetch flights for player ${p2.player_id}`, err);
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
    const playerIds = rowPlayers.map((p2) => p2.player_id);
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
        cell.onclick = (e2) => {
          e2.preventDefault();
          e2.stopPropagation();
          const forceNewTab = e2.ctrlKey || e2.metaKey || e2.button === 1;
          open_attack_link(rp.player_id, {
            openInNewTab: forceNewTab ? true : void 0
          });
        };
      }
      const data = dataMap.get(rp.player_id);
      if (data && !data.no_data) {
        rp.row.dataset["ffValue"] = String(data.fair_fight);
        rp.row.dataset["estValue"] = String(data.bs_estimate);
        if (cell) {
          const text = isEst ? data.bs_estimate_human : format_ff_score(data);
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
    const filterBox = (membersList.closest(".faction-war") || membersList.parentNode)?.querySelector("ff-faction-filter-box");
    if (filterBox?.activity) {
      apply_filters_and_sort(membersList, {
        sortBy: filterBox.sortBy ?? "none",
        filterEnabled: filterBox.filterEnabled,
        colDisplay,
        activity: filterBox.activity,
        status: filterBox.status,
        levelMin: filterBox.levelMin ?? null,
        levelMax: filterBox.levelMax ?? null,
        ffMin: filterBox.ffMin ?? null,
        ffMax: filterBox.ffMax ?? null,
        statsMin: filterBox.statsMin ? parse_suffix_number(filterBox.statsMin) : null,
        statsMax: filterBox.statsMax ? parse_suffix_number(filterBox.statsMax) : null
      });
    }
    update_header_sort_indicator(membersList, filterBox?.sortBy ?? "none");
    poll_traveling_flights(membersList);
  }
  function inject_filter_box(membersList) {
    const parent = membersList.parentNode;
    if (!parent) return;
    let filterBox = parent.querySelector(
      "ff-faction-filter-box"
    );
    if (!filterBox) {
      filterBox = document.createElement("ff-faction-filter-box");
      filterBox.addEventListener("filter-change", (e2) => {
        apply_filters_and_sort(membersList, {
          ...e2.detail,
          colDisplay: ffconfig.factions_col_display
        });
        update_header_sort_indicator(membersList, e2.detail.sortBy);
      });
      parent.insertBefore(filterBox, membersList);
    }
  }
  function initialize_features(membersList) {
    inject_filter_box(membersList);
    setup_header_click(membersList, ".table-header", "[role='button']");
    apply_ff_columns(membersList);
    const target = membersList.querySelector(".table-body") || membersList;
    let rafPending = false;
    const attributeObserver = new MutationObserver((mutations) => {
      if (isApplying.get(membersList)) return;
      let shouldReapply = false;
      for (const m2 of mutations) {
        if (m2.type === "attributes") {
          if (m2.attributeName === "alt" && m2.target instanceof HTMLImageElement && m2.target.closest(".icons")) {
            shouldReapply = true;
            break;
          }
          if (m2.attributeName === "class" && m2.target instanceof HTMLElement && m2.target.closest(".status")) {
            shouldReapply = true;
            break;
          }
        }
      }
      if (shouldReapply && !rafPending) {
        rafPending = true;
        requestAnimationFrame(() => {
          rafPending = false;
          const filterBox = (membersList.closest(".faction-war") || membersList.parentNode)?.querySelector("ff-faction-filter-box");
          if (filterBox?.activity) {
            apply_filters_and_sort(membersList, {
              sortBy: filterBox.sortBy ?? "none",
              filterEnabled: filterBox.filterEnabled,
              colDisplay: ffconfig.factions_col_display,
              activity: filterBox.activity,
              status: filterBox.status,
              levelMin: filterBox.levelMin ?? null,
              levelMax: filterBox.levelMax ?? null,
              ffMin: filterBox.ffMin ?? null,
              ffMax: filterBox.ffMax ?? null,
              statsMin: filterBox.statsMin ? parse_suffix_number(filterBox.statsMin) : null,
              statsMax: filterBox.statsMax ? parse_suffix_number(filterBox.statsMax) : null
            });
          }
        });
      }
    });
    attributeObserver.observe(target, {
      attributes: true,
      attributeFilter: ["class", "alt"],
      subtree: true
    });
    const flightInterval = setInterval(() => {
      poll_traveling_flights(membersList);
    }, 3e4);
    const cleanupInterval = setInterval(() => {
      if (!membersList.isConnected) {
        clearInterval(cleanupInterval);
        clearInterval(flightInterval);
        attributeObserver.disconnect();
      }
    }, 1e4);
  }
  function setup_faction_features(membersList) {
    const tbody = membersList.querySelector(".table-body");
    const hasRows = tbody?.querySelector(".table-row");
    if (hasRows) {
      initialize_features(membersList);
    } else {
      const loadObserver = new MutationObserver((_mutations, obs) => {
        const currentTbody = membersList.querySelector(".table-body");
        if (currentTbody?.querySelector(".table-row")) {
          obs.disconnect();
          initialize_features(membersList);
        }
      });
      loadObserver.observe(membersList, { childList: true, subtree: true });
      const cleanupInterval = setInterval(() => {
        if (!membersList.isConnected) {
          clearInterval(cleanupInterval);
          loadObserver.disconnect();
        }
      }, 1e4);
    }
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
      const cleanupInterval = setInterval(() => {
        if (!root.isConnected) {
          clearInterval(cleanupInterval);
          loadObserver.disconnect();
        }
      }, 1e4);
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
      FEATURE_NAME$4
    );
    apply_ff_gauge_selector(root.querySelectorAll(".member"), FEATURE_NAME$4);
    for (const l2 of root.querySelectorAll(".members-list, .chain-attacks-list")) {
      if (l2 instanceof HTMLElement) {
        apply_ff_members_list(l2);
      }
    }
  };
  function setup_header_click(list, headerAreaSelector, nativeTabSelector) {
    if (list.hasAttribute("data-ffscouter-header-click")) return;
    list.setAttribute("data-ffscouter-header-click", "true");
    list.addEventListener(
      "click",
      (e2) => {
        const target = e2.target;
        if (!target.closest(headerAreaSelector)) return;
        const container = list.closest(".faction-war") ?? list.parentElement;
        const filterBox = container?.querySelector(
          "ff-faction-filter-box"
        );
        if (!filterBox) return;
        if (target.closest(".ffscouter-header")) {
          e2.preventDefault();
          e2.stopPropagation();
          const newSort = filterBox.sortBy === "ff-desc" ? "ff-asc" : "ff-desc";
          filterBox.setSortBy(newSort);
        } else if (target.closest(nativeTabSelector)) {
          if (filterBox.sortBy !== "none") {
            filterBox.setSortBy("none");
          }
        }
      },
      { capture: true }
    );
  }
  function setup_war_features(factionWar) {
    const lists = Array.from(
      factionWar.querySelectorAll(".enemy-faction, .your-faction")
    );
    if (lists.length > 0) {
      initialize_war_features(factionWar, lists);
    } else {
      const loadObserver = new MutationObserver((_mutations, obs) => {
        const currentLists = Array.from(
          factionWar.querySelectorAll(".enemy-faction, .your-faction")
        );
        if (currentLists.length > 0) {
          obs.disconnect();
          initialize_war_features(factionWar, currentLists);
        }
      });
      loadObserver.observe(factionWar, { childList: true, subtree: true });
      const cleanupInterval = setInterval(() => {
        if (!factionWar.isConnected) {
          clearInterval(cleanupInterval);
          loadObserver.disconnect();
        }
      }, 1e4);
    }
  }
  function initialize_war_features(factionWar, lists) {
    let filterBox = factionWar.querySelector(
      "ff-faction-filter-box[mode='war']"
    );
    if (!filterBox) {
      filterBox = document.createElement("ff-faction-filter-box");
      filterBox.setAttribute("mode", "war");
      factionWar.insertBefore(filterBox, factionWar.firstChild);
    }
    if (filterBox._onFilterChange) {
      filterBox.removeEventListener("filter-change", filterBox._onFilterChange);
    }
    filterBox._onFilterChange = (e2) => {
      const currentLists = Array.from(
        factionWar.querySelectorAll(".enemy-faction, .your-faction")
      );
      const colDisplay = ffconfig.war_col_display;
      for (const list of currentLists) {
        apply_filters_and_sort(list, { ...e2.detail, colDisplay });
        update_header_sort_indicator(list, e2.detail.sortBy);
      }
    };
    filterBox.addEventListener("filter-change", filterBox._onFilterChange);
    for (const list of lists) {
      setup_war_list(list);
    }
  }
  function setup_war_list(list) {
    const tbody = list;
    const hasRows = tbody.querySelector(".enemy, .your");
    if (hasRows) {
      initialize_war_list(list);
    } else {
      const loadObserver = new MutationObserver((_mutations, obs) => {
        const currentTbody = list;
        if (currentTbody.querySelector(".enemy, .your")) {
          obs.disconnect();
          initialize_war_list(list);
        }
      });
      loadObserver.observe(list, { childList: true, subtree: true });
      const cleanupInterval = setInterval(() => {
        if (!list.isConnected) {
          clearInterval(cleanupInterval);
          loadObserver.disconnect();
        }
      }, 1e4);
    }
  }
  function initialize_war_list(list) {
    setup_header_click(list, ".white-grad", "[class*='tab___']");
    apply_ff_columns(list);
    const target = list;
    let rafPending = false;
    const attributeObserver = new MutationObserver((mutations) => {
      if (isApplying.get(list)) return;
      let shouldReapply = false;
      for (const m2 of mutations) {
        if (m2.type === "attributes") {
          if (m2.attributeName === "alt" && m2.target instanceof HTMLImageElement && m2.target.closest(".icons")) {
            shouldReapply = true;
            break;
          }
          if (m2.attributeName === "class" && m2.target instanceof HTMLElement && m2.target.closest(".status")) {
            shouldReapply = true;
            break;
          }
        }
      }
      if (shouldReapply && !rafPending) {
        rafPending = true;
        requestAnimationFrame(() => {
          rafPending = false;
          const filterBox = list.closest(".faction-war")?.querySelector("ff-faction-filter-box");
          if (filterBox?.activity) {
            apply_filters_and_sort(list, {
              sortBy: filterBox.sortBy ?? "none",
              filterEnabled: filterBox.filterEnabled,
              colDisplay: ffconfig.war_col_display,
              activity: filterBox.activity,
              status: filterBox.status,
              levelMin: filterBox.levelMin ?? null,
              levelMax: filterBox.levelMax ?? null,
              ffMin: filterBox.ffMin ?? null,
              ffMax: filterBox.ffMax ?? null,
              statsMin: filterBox.statsMin ? parse_suffix_number(filterBox.statsMin) : null,
              statsMax: filterBox.statsMax ? parse_suffix_number(filterBox.statsMax) : null
            });
          }
        });
      }
    });
    attributeObserver.observe(target, {
      attributes: true,
      attributeFilter: ["class", "alt"],
      subtree: true
    });
    const flightInterval = setInterval(() => {
      poll_traveling_flights(list);
    }, 3e4);
    const cleanupInterval = setInterval(() => {
      if (!list.isConnected) {
        clearInterval(cleanupInterval);
        clearInterval(flightInterval);
        attributeObserver.disconnect();
      }
    }, 1e4);
  }
  const process_page = () => {
    wait_for_element(".members-list", 1e4).then((node) => {
      if (node instanceof HTMLElement) {
        log$9.debug("Found members-list!");
        monitor_member_list(node);
      }
    });
    wait_for_element(".chain-attacks-list", 1e4).then((node) => {
      if (node instanceof HTMLElement) {
        log$9.debug("Found chain-attacks-list!");
        monitor_member_list(node, true);
      }
    });
    wait_for_element("#faction_war_list_id", 1e4).then(async (node) => {
      if (!node) {
        return;
      }
      log$9.debug("Found faction_war_list_id");
      const descriptions_observer = new MutationObserver(async (mutations) => {
        for (const mutation of mutations) {
          for (const node2 of mutation.addedNodes) {
            if (node2 instanceof HTMLElement && node2.classList.contains("descriptions")) {
              log$9.debug(
                "Observed mutation that included adding descriptions",
                node2
              );
              const faction_war = await wait_for_element(".faction-war", 1e4);
              if (faction_war instanceof HTMLElement) {
                setup_war_features(faction_war);
              }
            }
          }
        }
      });
      descriptions_observer.observe(node, { childList: true });
      log$9.debug("Set up descriptions observer on", node);
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
              apply_ff_columns(list);
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
    apply_ff_columns,
    apply_filters_and_sort,
    default: index$c,
    initialize_features,
    poll_traveling_flights,
    setup_war_features,
    should_run_faction
  }, Symbol.toStringTag, { value: "Module" }));
  const log$8 = logger.child("feature:fallback");
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
          if (!(hash.startsWith("#/war/") || hash === "#/tab=info")) {
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
        } else if (torn_page("messages") || torn_page("index") || torn_page("hospitalview") || torn_page("page", { sid: "UserList" })) {
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
          combined_selector: ".honor-text-wrap, .user.name"
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
          apply_ff_gauge_selector(honor_bars, FEATURE_NAME_HONOR_BAR);
        } else if (current_config.has_page_specific) {
          for (const selector of current_config.page_specific_selectors) {
            apply_ff_gauge_selector(
              node.querySelectorAll(selector),
              FEATURE_NAME$3
            );
          }
        } else {
          const name_elems = node.querySelectorAll(
            ".user.name"
          );
          if (name_elems.length > 0) {
            apply_ff_gauge_selector(name_elems, FEATURE_NAME_USER_NAME);
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
            log$8.debug("Disconnected fallback MutationObserver (excluded page)");
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
            log$8.debug("Connected fallback MutationObserver (included page)");
            if (target) {
              check_mutation(target);
            }
          }
        }
      };
      on_navigation(() => {
        log$8.debug("Navigation detected, re-evaluating fallback observer state");
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
  const log$7 = logger.child("ui");
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
    log$7.info("[FF Scouter V2] Toast: ", message);
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
  const log$6 = logger.child("feature:ff-button");
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
  function filters_changed(a2, b2) {
    return a2.minlevel !== b2.minlevel || a2.maxlevel !== b2.maxlevel || a2.minff !== b2.minff || a2.maxff !== b2.maxff || a2.inactive !== b2.inactive || a2.factionless !== b2.factionless;
  }
  async function update_ff_targets(force = false) {
    const key = ffconfig.key;
    if (!key) {
      log$6.debug("API key not set, skipping target fetch");
      return;
    }
    const currentFilters = get_active_filters();
    const cached = ffconfig.chain_targets;
    const hasNoCacheOrExpired = !cached || Date.now() > cached.expiry;
    const filtersChanged = cached && filters_changed(cached.filters, currentFilters);
    const timeToRefresh = cached && (!cached.last_updated || Date.now() - cached.last_updated > POLL_INTERVAL_MS);
    if (!force && !hasNoCacheOrExpired && !filtersChanged && !timeToRefresh) {
      log$6.debug(
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
        log$6.info(
          `Chain targets updated successfully: ${response.targets.length} targets found`
        );
      }
    } catch (err) {
      log$6.error("Failed to update chain targets:", err);
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
    const handler = async (e2) => {
      if (e2 instanceof KeyboardEvent) {
        if (e2.key !== "Enter") {
          return;
        }
      } else if (e2 instanceof MouseEvent) {
        if (e2.button !== 0 && e2.button !== 1 && e2.button !== 2) {
          return;
        }
      }
      const cached = ffconfig.chain_targets;
      if (!cached || !cached.targets || cached.targets.length === 0) {
        e2.preventDefault();
        const isPrimary = e2 instanceof MouseEvent && e2.button === 0 || e2 instanceof KeyboardEvent;
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
          log$6.info("Target filters changed, refetching targets immediately");
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
      console.log("Found item list wrapper!");
      console.log(root);
      const process = () => {
        apply_ff_gauge_selector(
          root.querySelectorAll(
            "div.bazaar-listing-card div:first-child div:first-child > a"
          ),
          FEATURE_NAME$2
        );
        apply_ff_gauge_selector(
          root.querySelectorAll(".bazaar-card a"),
          FEATURE_NAME$2
        );
        apply_ff_gauge_selector(
          root.querySelectorAll(".bazaar-card .bazaar-card-name"),
          FEATURE_NAME$2
        );
        apply_ff_gauge_selector(
          root.querySelectorAll(".honor-text-wrap"),
          FEATURE_NAME$2
        );
        apply_ff_gauge_selector(
          root.querySelectorAll('[class*="userInfoWrapper__"]'),
          FEATURE_NAME$2
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
  var __defProp$1 = Object.defineProperty;
  var __getOwnPropDesc$1 = Object.getOwnPropertyDescriptor;
  var __decorateClass$1 = (decorators, target, key, kind) => {
    var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$1(target, key) : target;
    for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
      if (decorator = decorators[i2])
        result = (kind ? decorator(target, key, result) : decorator(result)) || result;
    if (kind && result) __defProp$1(target, key, result);
    return result;
  };
  const log$5 = logger.child("ui");
  const PREMIUM_UPGRADE_URL = "https://ffscouter.com/premium";
  const premium_action = b`<a
  href="${PREMIUM_UPGRADE_URL}"
  target="_blank"
  rel="noopener noreferrer"
  style="font-weight: bold; text-decoration: underline;"
  >Upgrade to FFScouter Flight Tracking</a
>`;
  function get_current_time_seconds() {
    if (typeof window.getCurrentTimestamp === "function") {
      return window.getCurrentTimestamp() / 1e3;
    }
    return Date.now() / 1e3;
  }
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
  let FFFlightProfileStatus = class extends i {
    constructor() {
      super(...arguments);
      this.playerId = null;
      this.data = null;
      this.compact = false;
      this.is_premium = null;
      this.loading = false;
      this.error = null;
      this.current_time_seconds = get_current_time_seconds();
      this.fetch_interval = null;
      this.tick_interval = null;
    }
    createRenderRoot() {
      return this;
    }
    connectedCallback() {
      super.connectedCallback();
      this.start_timers();
    }
    disconnectedCallback() {
      this.stop_timers();
      super.disconnectedCallback();
    }
    start_timers() {
      this.stop_timers();
      this.tick_interval = setInterval(() => {
        this.current_time_seconds = get_current_time_seconds();
        if (this.data?.rechecking && this.data.next_retry_at) {
          if (Date.now() >= this.data.next_retry_at) {
            this.fetch_data();
          }
        }
      }, 1e3);
      this.fetch_interval = setInterval(() => {
        if (!this.data?.rechecking) {
          this.fetch_data();
        }
      }, 3e4);
    }
    stop_timers() {
      if (this.tick_interval) {
        clearInterval(this.tick_interval);
        this.tick_interval = null;
      }
      if (this.fetch_interval) {
        clearInterval(this.fetch_interval);
        this.fetch_interval = null;
      }
    }
    willUpdate(changedProperties) {
      if (changedProperties.has("playerId") && this.playerId) {
        this.data = null;
        this.error = null;
        this.loading = true;
        this.is_premium = null;
        this.fetch_data();
      }
    }
    async fetch_data() {
      if (!this.playerId) return;
      const fetchId = this.playerId;
      let is_premium;
      try {
        is_premium = await check_key_status.is_premium();
      } catch (err) {
        log$5.error("Failed to check premium status", err);
        if (this.playerId === fetchId) {
          this.loading = false;
        }
        return;
      }
      if (this.playerId !== fetchId) return;
      this.is_premium = is_premium;
      if (!is_premium) {
        this.loading = false;
        return;
      }
      try {
        const result = await ffscouter.get_flights(this.playerId);
        if (this.playerId !== fetchId) return;
        this.data = result;
        this.error = null;
      } catch (err) {
        if (this.playerId !== fetchId) return;
        log$5.error("Failed to fetch flight data", err);
        if (err instanceof FFApiError) {
          const code = err.ff_api_error?.code;
          if (code === 19) {
            this.is_premium = false;
          } else if (code === 2 || code === 10 || code === 12) {
            this.error = "Invalid API key";
          } else if (code === 20) {
            this.error = "Rate limit exceeded. Retrying...";
          } else {
            this.error = err.ff_api_error?.error || err.message || "Flight tracking unavailable";
          }
        } else {
          this.error = err.message || "Flight tracking unavailable";
        }
      } finally {
        if (this.playerId === fetchId) {
          this.loading = false;
        }
      }
    }
    render() {
      if (this.is_premium === false) {
        return b`<div class="ff-scouter-profile-flight-info">
        ${premium_action}
      </div>`;
      }
      let content = b``;
      if (this.error) {
        content = b`<span style="color: #ff6b6b;">Error: ${this.error}</span>`;
      } else if (this.loading && !this.data) {
        content = this.compact ? b`Estimating...` : b`Landing: estimating...`;
      } else {
        const current = this.data?.current;
        if (this.data?.rechecking) {
          const next = this.data.next_retry_at ?? 0;
          const now = Date.now();
          const seconds = Math.max(0, Math.ceil((next - now) / 1e3));
          content = this.compact ? b`No data.<br />Rechecking...` : b`No data. Rechecking in ${seconds} seconds.`;
        } else if (!current || !current.earliest_arrival_time && !current.latest_arrival_time) {
          content = this.compact ? b`Unavailable` : b`Landing: unavailable for current route`;
        } else {
          const earliest = Number(current.earliest_arrival_time);
          const latest = Number(current.latest_arrival_time);
          if (!Number.isFinite(earliest) || !Number.isFinite(latest)) {
            content = this.compact ? b`Unavailable` : b`Landing: unavailable for current route`;
          } else {
            const nowUnix = this.current_time_seconds;
            const earliestRemaining = earliest - nowUnix;
            const latestRemaining = latest - nowUnix;
            const earliestTct = format_tct_time(earliest);
            const latestTct = format_tct_time(latest);
            console.log({
              earliestRemaining,
              latestRemaining,
              earliestTct,
              latestTct
            });
            if (latestRemaining <= -5 * 60) {
              content = this.compact ? b`Late` : b`Landing: Late, probably flight delayed.<br />(${latestTct}
                  TCT latest)`;
            } else if (latestRemaining <= 0) {
              content = this.compact ? b`Just landed<br />(Latest: ${latestTct} TCT)` : b`Landing: just landed<br />(${latestTct} TCT latest)`;
            } else if (earliestRemaining <= 0) {
              content = this.compact ? b`Imminent<br />${format_duration_human(
              latestRemaining,
              this.compact
            )}<br />` : b`Landing: imminent -
                  ${format_duration_human(latestRemaining, this.compact)}<br />(Latest:
                  ${latestTct} TCT)`;
            } else {
              content = this.compact ? b`${format_duration_human(
              earliestRemaining,
              this.compact
            )}<br />${format_duration_human(latestRemaining, this.compact)}` : b`Landing:
                  ${format_duration_human(earliestRemaining, this.compact)} -
                  ${format_duration_human(latestRemaining, this.compact)}<br />(${earliestTct}
                  - ${latestTct} TCT)`;
            }
          }
        }
      }
      return b`<div class="ff-scouter-profile-flight-info">${content}</div>`;
    }
  };
  __decorateClass$1([
    n2({ type: Number })
  ], FFFlightProfileStatus.prototype, "playerId", 2);
  __decorateClass$1([
    n2({ type: Object })
  ], FFFlightProfileStatus.prototype, "data", 2);
  __decorateClass$1([
    n2({ type: Boolean })
  ], FFFlightProfileStatus.prototype, "compact", 2);
  __decorateClass$1([
    r()
  ], FFFlightProfileStatus.prototype, "is_premium", 2);
  __decorateClass$1([
    r()
  ], FFFlightProfileStatus.prototype, "loading", 2);
  __decorateClass$1([
    r()
  ], FFFlightProfileStatus.prototype, "error", 2);
  __decorateClass$1([
    r()
  ], FFFlightProfileStatus.prototype, "current_time_seconds", 2);
  FFFlightProfileStatus = __decorateClass$1([
    t("ff-flight-profile-status")
  ], FFFlightProfileStatus);
  const log$4 = logger.child("feature:mini-profile-flights");
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
  const setup_mini_flight_observer = () => {
    const miniroot = document.querySelector("#profile-mini-root");
    if (!miniroot) {
      return;
    }
    const flight_element = document.createElement("ff-flight-profile-status");
    flight_element.compact = true;
    let lastPlayerId = null;
    const mp_observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (Array.from(mutation.addedNodes).some(
          (node) => node instanceof HTMLElement && (node.tagName.toLowerCase() === "ff-flight-profile-status" || node.classList.contains("ff-scouter-profile-flight-info"))
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
      flight_element.playerId = player_id2;
      if (is_flying$1(status2)) {
        const description = status2.querySelector(".description");
        if (description && !description.contains(flight_element)) {
          log$4.debug(
            `Player ${player_id2} is flying, adding flight tracker to mini-profile`
          );
          description.appendChild(flight_element);
        }
      } else {
        flight_element.remove();
        ffscouter.clear_flight_cache(player_id2);
      }
    });
    mp_observer.observe(miniroot, { childList: true, subtree: true });
    const player_id = get_player_id_in_element(miniroot);
    const status = miniroot.querySelector(".profile-status");
    if (player_id && status) {
      flight_element.playerId = player_id;
      if (is_flying$1(status)) {
        const description = status.querySelector(".description");
        if (description && !description.contains(flight_element)) {
          description.appendChild(flight_element);
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
        if (mutation.target instanceof HTMLElement && mutation.target.classList.contains("ffsv3-gauge")) {
          return;
        }
        if (Array.from(mutation.addedNodes).some(
          (node) => node instanceof HTMLElement && node.classList.contains("ffsv3-mini-desc")
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
          apply_ff_gauge(bar, FEATURE_NAME$1);
        }
        miniroot.querySelector(".ffsv3-mini-desc")?.remove();
        const ff_string = format_ff_score(d2);
        const difficulty = format_difficulty_text(d2);
        const fresh = format_relative_time(d2.last_updated);
        const message = `FF ${ff_string} (${difficulty}) ${fresh}`;
        const description = miniroot.querySelector(".description");
        const desc = document.createElement("span");
        desc.classList.add("ffsv3-mini-desc");
        desc.innerText = message;
        description?.appendChild(desc);
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
      const element = document.createElement("ff-flight-profile-status");
      element.playerId = player_id;
      const check_and_update = () => {
        if (is_flying(status)) {
          const description = status.querySelector(".description");
          if (description === null) {
            return;
          }
          if (!description.contains(element)) {
            console.log("Appending child", element);
            description.appendChild(element);
          }
        } else {
          element.remove();
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
      }
      const player_id = extract_id_from_url(window.location.href);
      if (!player_id) {
        return;
      }
      ffscouter.get(player_id).then(async (data) => {
        const line = document.createElement("ff-header-line");
        line.data = data;
        info_line.appendChild(line);
        inject_info_line(info_line);
      });
      ffscouter.complete();
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
          apply_ff_gauge(honor_bar, FEATURE_NAME);
          return;
        }
        const user_info_wrapper = options.added.querySelector(
          '[class*="userInfoBlock__"]'
        );
        if (user_info_wrapper) {
          apply_ff_gauge(user_info_wrapper, FEATURE_NAME);
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
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __decorateClass = (decorators, target, key, kind) => {
    var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
    for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
      if (decorator = decorators[i2])
        result = (kind ? decorator(target, key, result) : decorator(result)) || result;
    if (kind && result) __defProp(target, key, result);
    return result;
  };
  let FFSettingsPanel = class extends i {
    constructor() {
      super(...arguments);
      this.apiKey = "";
      this.lowRange = CONFIG_DEFAULTS.low_ff_range;
      this.highRange = CONFIG_DEFAULTS.high_ff_range;
      this.maxRange = CONFIG_DEFAULTS.max_ff_range;
      this.chainButtonEnabled = CONFIG_DEFAULTS.chain_button_enabled;
      this.chainLinkType = CONFIG_DEFAULTS.chain_link_type;
      this.chainTabType = CONFIG_DEFAULTS.chain_tab_type;
      this.chainFFTarget = CONFIG_DEFAULTS.chain_ff_target;
      this.chainMinLevel = CONFIG_DEFAULTS.chain_min_level;
      this.chainMaxLevel = CONFIG_DEFAULTS.chain_max_level;
      this.chainInactive = CONFIG_DEFAULTS.chain_inactive;
      this.chainMinFF = CONFIG_DEFAULTS.chain_min_ff;
      this.chainMaxFF = CONFIG_DEFAULTS.chain_max_ff;
      this.chainFactionless = CONFIG_DEFAULTS.chain_factionless;
      this.ffHistoryEnabled = CONFIG_DEFAULTS.ff_history_enabled;
      this.factionsColDisplay = CONFIG_DEFAULTS.factions_col_display;
      this.warColDisplay = CONFIG_DEFAULTS.war_col_display;
      this.debugLogs = CONFIG_DEFAULTS.debug_logs;
      this.analyticsEnabled = CONFIG_DEFAULTS.analytics_enabled;
      this.networkInterceptionEnabled = CONFIG_DEFAULTS.network_interception_enabled;
      this.gaugeMarkerType = CONFIG_DEFAULTS.gauge_marker_type;
      this.warQuickAttackAction = CONFIG_DEFAULTS.war_quick_attack_action;
      this.statusAttackLinksEnabled = CONFIG_DEFAULTS.status_attack_links_enabled;
      this.isPremium = false;
      this.draftApiKey = "";
      this.draftLowRange = CONFIG_DEFAULTS.low_ff_range;
      this.draftHighRange = CONFIG_DEFAULTS.high_ff_range;
      this.draftMaxRange = CONFIG_DEFAULTS.max_ff_range;
      this.draftChainButtonEnabled = CONFIG_DEFAULTS.chain_button_enabled;
      this.draftChainLinkType = CONFIG_DEFAULTS.chain_link_type;
      this.draftChainTabType = CONFIG_DEFAULTS.chain_tab_type;
      this.draftChainFFTarget = CONFIG_DEFAULTS.chain_ff_target;
      this.draftChainMinLevel = CONFIG_DEFAULTS.chain_min_level;
      this.draftChainMaxLevel = CONFIG_DEFAULTS.chain_max_level;
      this.draftChainInactive = CONFIG_DEFAULTS.chain_inactive;
      this.draftChainMinFF = CONFIG_DEFAULTS.chain_min_ff;
      this.draftChainMaxFF = CONFIG_DEFAULTS.chain_max_ff;
      this.draftChainFactionless = CONFIG_DEFAULTS.chain_factionless;
      this.draftFFHistoryEnabled = CONFIG_DEFAULTS.ff_history_enabled;
      this.draftFactionsColDisplay = CONFIG_DEFAULTS.factions_col_display;
      this.draftWarColDisplay = CONFIG_DEFAULTS.war_col_display;
      this.draftDebugLogs = CONFIG_DEFAULTS.debug_logs;
      this.draftAnalyticsEnabled = CONFIG_DEFAULTS.analytics_enabled;
      this.draftNetworkInterceptionEnabled = CONFIG_DEFAULTS.network_interception_enabled;
      this.draftGaugeMarkerType = CONFIG_DEFAULTS.gauge_marker_type;
      this.draftWarQuickAttackAction = CONFIG_DEFAULTS.war_quick_attack_action;
      this.draftStatusAttackLinksEnabled = CONFIG_DEFAULTS.status_attack_links_enabled;
      this.rangeError = "";
      this.showSavedMessage = false;
    }
    createRenderRoot() {
      return this;
    }
    connectedCallback() {
      super.connectedCallback();
      this.resetDrafts();
    }
    willUpdate(changedProperties) {
      if (changedProperties.has("apiKey")) this.draftApiKey = this.apiKey;
      if (changedProperties.has("lowRange")) this.draftLowRange = this.lowRange;
      if (changedProperties.has("highRange"))
        this.draftHighRange = this.highRange;
      if (changedProperties.has("maxRange")) this.draftMaxRange = this.maxRange;
      if (changedProperties.has("chainButtonEnabled"))
        this.draftChainButtonEnabled = this.chainButtonEnabled;
      if (changedProperties.has("chainLinkType"))
        this.draftChainLinkType = this.chainLinkType;
      if (changedProperties.has("chainTabType"))
        this.draftChainTabType = this.chainTabType;
      if (changedProperties.has("chainFFTarget"))
        this.draftChainFFTarget = this.chainFFTarget;
      if (changedProperties.has("chainMinLevel"))
        this.draftChainMinLevel = this.chainMinLevel;
      if (changedProperties.has("chainMaxLevel"))
        this.draftChainMaxLevel = this.chainMaxLevel;
      if (changedProperties.has("chainInactive"))
        this.draftChainInactive = this.chainInactive;
      if (changedProperties.has("chainMinFF"))
        this.draftChainMinFF = this.chainMinFF;
      if (changedProperties.has("chainMaxFF"))
        this.draftChainMaxFF = this.chainMaxFF;
      if (changedProperties.has("chainFactionless"))
        this.draftChainFactionless = this.chainFactionless;
      if (changedProperties.has("ffHistoryEnabled"))
        this.draftFFHistoryEnabled = this.ffHistoryEnabled;
      if (changedProperties.has("factionsColDisplay"))
        this.draftFactionsColDisplay = this.factionsColDisplay;
      if (changedProperties.has("warColDisplay"))
        this.draftWarColDisplay = this.warColDisplay;
      if (changedProperties.has("debugLogs"))
        this.draftDebugLogs = this.debugLogs;
      if (changedProperties.has("analyticsEnabled"))
        this.draftAnalyticsEnabled = this.analyticsEnabled;
      if (changedProperties.has("networkInterceptionEnabled"))
        this.draftNetworkInterceptionEnabled = this.networkInterceptionEnabled;
      if (changedProperties.has("gaugeMarkerType"))
        this.draftGaugeMarkerType = this.gaugeMarkerType;
      if (changedProperties.has("warQuickAttackAction"))
        this.draftWarQuickAttackAction = this.warQuickAttackAction;
      if (changedProperties.has("statusAttackLinksEnabled"))
        this.draftStatusAttackLinksEnabled = this.statusAttackLinksEnabled;
    }
    resetDrafts() {
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
      this.draftNetworkInterceptionEnabled = this.networkInterceptionEnabled;
      this.draftGaugeMarkerType = this.gaugeMarkerType;
      this.draftWarQuickAttackAction = this.warQuickAttackAction;
      this.draftStatusAttackLinksEnabled = this.statusAttackLinksEnabled;
    }
    handleSave() {
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
        this.rangeError = "FF ranges must be in ascending order: low < high < max";
        return;
      }
      this.rangeError = "";
      this.showSavedMessage = true;
      setTimeout(() => {
        this.showSavedMessage = false;
      }, 3e3);
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
            networkInterceptionEnabled: this.draftNetworkInterceptionEnabled,
            gaugeMarkerType: this.draftGaugeMarkerType,
            warQuickAttackAction: this.draftWarQuickAttackAction,
            statusAttackLinksEnabled: this.draftStatusAttackLinksEnabled
          },
          bubbles: true,
          composed: true
        })
      );
    }
    handleReset() {
      if (confirm("Are you sure you want to reset all settings to defaults?")) {
        this.dispatchEvent(
          new CustomEvent("ff-reset", {
            bubbles: true,
            composed: true
          })
        );
      }
    }
    handleClearCache() {
      if (confirm("Are you sure you want to clear all FF Scouter cache?")) {
        this.dispatchEvent(
          new CustomEvent("ff-clear-cache", {
            bubbles: true,
            composed: true
          })
        );
      }
    }
    handleVerify() {
      this.dispatchEvent(
        new CustomEvent("ff-verify", {
          detail: {
            apiKey: this.draftApiKey
          },
          bubbles: true,
          composed: true
        })
      );
    }
    onKeyInput(e2) {
      this.draftApiKey = e2.target.value;
      this.showSavedMessage = false;
    }
    onKeyChange(e2) {
      const val = e2.target.value.trim();
      this.draftApiKey = val;
      this.dispatchEvent(
        new CustomEvent("ff-save-key", {
          detail: { apiKey: val },
          bubbles: true,
          composed: true
        })
      );
    }
    onLowRangeInput(e2) {
      this.draftLowRange = Number(e2.target.value);
      this.showSavedMessage = false;
    }
    onHighRangeInput(e2) {
      this.draftHighRange = Number(e2.target.value);
      this.showSavedMessage = false;
    }
    onMaxRangeInput(e2) {
      this.draftMaxRange = Number(e2.target.value);
      this.showSavedMessage = false;
    }
    onChainButtonChange(e2) {
      this.draftChainButtonEnabled = e2.target.checked;
      this.showSavedMessage = false;
    }
    onChainLinkTypeChange(e2) {
      this.draftChainLinkType = e2.target.value;
      this.showSavedMessage = false;
    }
    onChainTabTypeChange(e2) {
      this.draftChainTabType = e2.target.value;
      this.showSavedMessage = false;
    }
    onChainMinLevelInput(e2) {
      const val = e2.target.value;
      this.draftChainMinLevel = val === "" ? null : Number(val);
      this.showSavedMessage = false;
    }
    onChainMaxLevelInput(e2) {
      const val = e2.target.value;
      this.draftChainMaxLevel = val === "" ? null : Number(val);
      this.showSavedMessage = false;
    }
    onChainInactiveChange(e2) {
      this.draftChainInactive = e2.target.checked;
      this.showSavedMessage = false;
    }
    onChainMinFFInput(e2) {
      const val = e2.target.value;
      this.draftChainMinFF = val === "" ? null : Number(val);
      this.showSavedMessage = false;
    }
    onChainMaxFFInput(e2) {
      const val = e2.target.value;
      const num = Number(val);
      this.draftChainMaxFF = num;
      this.draftChainFFTarget = num;
      this.showSavedMessage = false;
    }
    onChainFactionlessChange(e2) {
      this.draftChainFactionless = e2.target.checked;
      this.showSavedMessage = false;
    }
    onFFHistoryChange(e2) {
      this.draftFFHistoryEnabled = e2.target.checked;
      this.showSavedMessage = false;
    }
    onFactionsColDisplayChange(e2) {
      this.draftFactionsColDisplay = e2.target.value;
      this.showSavedMessage = false;
    }
    onWarColDisplayChange(e2) {
      this.draftWarColDisplay = e2.target.value;
      this.showSavedMessage = false;
    }
    onWarQuickAttackActionChange(e2) {
      this.draftWarQuickAttackAction = e2.target.value;
      this.showSavedMessage = false;
    }
    onDebugLogsChange(e2) {
      this.draftDebugLogs = e2.target.checked;
      this.showSavedMessage = false;
    }
    onAnalyticsEnabledChange(e2) {
      this.draftAnalyticsEnabled = e2.target.checked;
      this.showSavedMessage = false;
    }
    onNetworkInterceptionEnabledChange(e2) {
      this.draftNetworkInterceptionEnabled = e2.target.checked;
      this.showSavedMessage = false;
    }
    onStatusAttackLinksEnabledChange(e2) {
      this.draftStatusAttackLinksEnabled = e2.target.checked;
      this.showSavedMessage = false;
    }
    onGaugeMarkerTypeChange(e2) {
      this.draftGaugeMarkerType = e2.target.value;
      this.showSavedMessage = false;
    }
    render() {
      return b`
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
            ${this.rangeError ? b`<div class="error-msg">${this.rangeError}</div>` : ""}
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

          ${this.draftChainButtonEnabled ? b`
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
                        .value=${this.draftChainMinLevel === null ? "" : this.draftChainMinLevel.toString()}
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
                        .value=${this.draftChainMaxLevel === null ? "" : this.draftChainMaxLevel.toString()}
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
                        .value=${this.draftChainMinFF === null ? "" : this.draftChainMinFF.toString()}
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
                ` : ""}

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

          <!-- Status Attack Links Toggle -->
          <div class="input-row-inline">
            <input
              id="status-attack-links-toggle"
              type="checkbox"
              .checked=${this.draftStatusAttackLinksEnabled}
              @change=${this.onStatusAttackLinksEnabledChange}
            />
            <label for="status-attack-links-toggle"
              >Enable online status indicator quick attack links</label
            >
          </div>

          <!-- War Quick Attack Action -->
          <div class="input-row-inline">
            <label for="war-quick-attack-action">Quick Attack Action:</label>
            <select
              id="war-quick-attack-action"
              .value=${this.draftWarQuickAttackAction}
              @change=${this.onWarQuickAttackActionChange}
            >
              <option value="new_tab">New Tab</option>
              <option value="current">Same Tab</option>
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

          <!-- Network Interception Toggle -->
          <div class="input-row-inline">
            <input
              id="network-interception-toggle"
              type="checkbox"
              .checked=${this.draftNetworkInterceptionEnabled}
              @change=${this.onNetworkInterceptionEnabledChange}
            />
            <label for="network-interception-toggle"
              >Enable network request interception (Fetch/XHR/WS)</label
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
            ${this.showSavedMessage ? b`<span style="color: #4CAF50;">✓ Saved!</span>` : ""}
          </div>
        </div>
      </details>
    `;
    }
  };
  __decorateClass([
    n2({ type: String })
  ], FFSettingsPanel.prototype, "apiKey", 2);
  __decorateClass([
    n2({ type: Number })
  ], FFSettingsPanel.prototype, "lowRange", 2);
  __decorateClass([
    n2({ type: Number })
  ], FFSettingsPanel.prototype, "highRange", 2);
  __decorateClass([
    n2({ type: Number })
  ], FFSettingsPanel.prototype, "maxRange", 2);
  __decorateClass([
    n2({ type: Boolean })
  ], FFSettingsPanel.prototype, "chainButtonEnabled", 2);
  __decorateClass([
    n2({ type: String })
  ], FFSettingsPanel.prototype, "chainLinkType", 2);
  __decorateClass([
    n2({ type: String })
  ], FFSettingsPanel.prototype, "chainTabType", 2);
  __decorateClass([
    n2({ type: Number })
  ], FFSettingsPanel.prototype, "chainFFTarget", 2);
  __decorateClass([
    n2({ type: Number })
  ], FFSettingsPanel.prototype, "chainMinLevel", 2);
  __decorateClass([
    n2({ type: Number })
  ], FFSettingsPanel.prototype, "chainMaxLevel", 2);
  __decorateClass([
    n2({ type: Boolean })
  ], FFSettingsPanel.prototype, "chainInactive", 2);
  __decorateClass([
    n2({ type: Number })
  ], FFSettingsPanel.prototype, "chainMinFF", 2);
  __decorateClass([
    n2({ type: Number })
  ], FFSettingsPanel.prototype, "chainMaxFF", 2);
  __decorateClass([
    n2({ type: Boolean })
  ], FFSettingsPanel.prototype, "chainFactionless", 2);
  __decorateClass([
    n2({ type: Boolean })
  ], FFSettingsPanel.prototype, "ffHistoryEnabled", 2);
  __decorateClass([
    n2({ type: String })
  ], FFSettingsPanel.prototype, "factionsColDisplay", 2);
  __decorateClass([
    n2({ type: String })
  ], FFSettingsPanel.prototype, "warColDisplay", 2);
  __decorateClass([
    n2({ type: Boolean })
  ], FFSettingsPanel.prototype, "debugLogs", 2);
  __decorateClass([
    n2({ type: Boolean })
  ], FFSettingsPanel.prototype, "analyticsEnabled", 2);
  __decorateClass([
    n2({ type: Boolean })
  ], FFSettingsPanel.prototype, "networkInterceptionEnabled", 2);
  __decorateClass([
    n2({ type: String })
  ], FFSettingsPanel.prototype, "gaugeMarkerType", 2);
  __decorateClass([
    n2({ type: String })
  ], FFSettingsPanel.prototype, "warQuickAttackAction", 2);
  __decorateClass([
    n2({ type: Boolean })
  ], FFSettingsPanel.prototype, "statusAttackLinksEnabled", 2);
  __decorateClass([
    n2({ type: Boolean })
  ], FFSettingsPanel.prototype, "isPremium", 2);
  __decorateClass([
    r()
  ], FFSettingsPanel.prototype, "draftApiKey", 2);
  __decorateClass([
    r()
  ], FFSettingsPanel.prototype, "draftLowRange", 2);
  __decorateClass([
    r()
  ], FFSettingsPanel.prototype, "draftHighRange", 2);
  __decorateClass([
    r()
  ], FFSettingsPanel.prototype, "draftMaxRange", 2);
  __decorateClass([
    r()
  ], FFSettingsPanel.prototype, "draftChainButtonEnabled", 2);
  __decorateClass([
    r()
  ], FFSettingsPanel.prototype, "draftChainLinkType", 2);
  __decorateClass([
    r()
  ], FFSettingsPanel.prototype, "draftChainTabType", 2);
  __decorateClass([
    r()
  ], FFSettingsPanel.prototype, "draftChainFFTarget", 2);
  __decorateClass([
    r()
  ], FFSettingsPanel.prototype, "draftChainMinLevel", 2);
  __decorateClass([
    r()
  ], FFSettingsPanel.prototype, "draftChainMaxLevel", 2);
  __decorateClass([
    r()
  ], FFSettingsPanel.prototype, "draftChainInactive", 2);
  __decorateClass([
    r()
  ], FFSettingsPanel.prototype, "draftChainMinFF", 2);
  __decorateClass([
    r()
  ], FFSettingsPanel.prototype, "draftChainMaxFF", 2);
  __decorateClass([
    r()
  ], FFSettingsPanel.prototype, "draftChainFactionless", 2);
  __decorateClass([
    r()
  ], FFSettingsPanel.prototype, "draftFFHistoryEnabled", 2);
  __decorateClass([
    r()
  ], FFSettingsPanel.prototype, "draftFactionsColDisplay", 2);
  __decorateClass([
    r()
  ], FFSettingsPanel.prototype, "draftWarColDisplay", 2);
  __decorateClass([
    r()
  ], FFSettingsPanel.prototype, "draftDebugLogs", 2);
  __decorateClass([
    r()
  ], FFSettingsPanel.prototype, "draftAnalyticsEnabled", 2);
  __decorateClass([
    r()
  ], FFSettingsPanel.prototype, "draftNetworkInterceptionEnabled", 2);
  __decorateClass([
    r()
  ], FFSettingsPanel.prototype, "draftGaugeMarkerType", 2);
  __decorateClass([
    r()
  ], FFSettingsPanel.prototype, "draftWarQuickAttackAction", 2);
  __decorateClass([
    r()
  ], FFSettingsPanel.prototype, "draftStatusAttackLinksEnabled", 2);
  __decorateClass([
    r()
  ], FFSettingsPanel.prototype, "rangeError", 2);
  __decorateClass([
    r()
  ], FFSettingsPanel.prototype, "showSavedMessage", 2);
  FFSettingsPanel = __decorateClass([
    t("ff-settings-panel")
  ], FFSettingsPanel);
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
    const v2 = v2_get(old_key);
    if (v2 !== null) v3_set(new_key, v2 === "true");
  }
  function migrate_string(old_key, new_key, valid) {
    if (v3_has(new_key)) return;
    const v2 = v2_get(old_key);
    if (v2 !== null && valid.includes(v2)) v3_set(new_key, v2);
  }
  function migrate_float(old_key, new_key) {
    if (v3_has(new_key)) return;
    const v2 = v2_get(old_key);
    if (v2 !== null) {
      const n3 = parseFloat(v2);
      if (!isNaN(n3)) v3_set(new_key, n3);
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
      (k2) => k2.startsWith(V2_PREFIX)
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
      const panel = document.createElement("ff-settings-panel");
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
      panel.warQuickAttackAction = ffconfig.war_quick_attack_action;
      panel.statusAttackLinksEnabled = ffconfig.status_attack_links_enabled;
      panel.isPremium = await check_key_status.is_premium(true);
      panel.addEventListener("ff-save", async (e2) => {
        const detail = e2.detail;
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
        ffconfig.war_quick_attack_action = detail.warQuickAttackAction;
        ffconfig.status_attack_links_enabled = detail.statusAttackLinksEnabled;
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
        panel.warQuickAttackAction = ffconfig.war_quick_attack_action;
        panel.statusAttackLinksEnabled = ffconfig.status_attack_links_enabled;
        toast("Settings reset to defaults!");
        window.dispatchEvent(new CustomEvent("ff-config-updated"));
      });
      panel.addEventListener("ff-clear-cache", async () => {
        try {
          ffscouter.clear_cache();
          clear_v2_data();
          toast("FF Scouter cache cleared successfully!");
        } catch (err) {
          console.error("Failed to delete IndexedDB cache", err);
          toast("Failed to clear cache database", TOAST_LEVEL.ERROR);
        }
      });
      panel.addEventListener("ff-save-key", async (e2) => {
        const detail = e2.detail;
        ffconfig.key = detail.apiKey;
        panel.apiKey = detail.apiKey;
        panel.isPremium = await check_key_status.is_premium(true);
        toast("API key saved successfully!");
        window.dispatchEvent(new CustomEvent("ff-config-updated"));
      });
      panel.addEventListener("ff-verify", async (e2) => {
        const detail = e2.detail;
        let result = null;
        try {
          result = await check_key(detail.apiKey);
        } catch (err) {
          toast(`${err}`, TOAST_LEVEL.ERROR);
          return;
        }
        if (result == null || result.blank) {
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
          if (detail.apiKey === ffconfig.key) {
            await check_key_status.is_premium(true);
          }
        }
        toast(message, level);
      });
      const profileWrapper = await wait_for_element(".profile-wrapper", 15e3);
      if (!profileWrapper) {
        console.error(
          "[FF Scouter V2] Could not find profile wrapper for settings panel"
        );
        return;
      }
      profileWrapper.parentNode?.insertBefore(panel, profileWrapper.nextSibling);
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
  function handleStatusClick(e2) {
    if (!ffconfig.status_attack_links_enabled) return;
    const target = e2.target;
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
      log$2.debug("Failed to extract playerId from status icon click");
      return;
    }
    if (localUserId && playerId === localUserId) {
      log$2.debug("Bypassing click-to-attack: clicked own status icon.");
      return;
    }
    e2.preventDefault();
    e2.stopPropagation();
    log$2.debug("Initiating attack on user:", playerId);
    const forceNewTab = e2.ctrlKey || e2.metaKey || e2.button === 1;
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
    httpInterceptors.sort((a2, b2) => (b2.priority ?? 0) - (a2.priority ?? 0));
  }
  const stylesCss = ".ffsv3-gauge{position:relative;display:block;padding:0}.ffsv3-arrow{position:absolute;transform:translate(-50%,-30%);padding:0;top:0;left:calc(var(--ffsv3-arrow-width) / 2 + var(--band-percent) * (100% - var(--ffsv3-arrow-width)) / 100);width:var(--ffsv3-arrow-width);object-fit:cover;pointer-events:none}.ffsv3-bubble{position:absolute;transform:translate(-50%,-30%);top:0;left:calc(var(--ffsv3-arrow-width) / 2 + var(--band-percent) * (100% - var(--ffsv3-arrow-width)) / 100);min-width:22px;height:14px;line-height:12px;border:1px solid rgba(0,0,0,.4);border-radius:8px;font-size:8.5px;font-weight:700;font-family:Geneva,Arial,sans-serif;text-align:center;padding:0 4px;box-sizing:border-box;pointer-events:none;white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;text-shadow:0 1px 1px rgba(0,0,0,.5);box-shadow:0 1px 2px #0000004d;z-index:10}.ffsv3-mini-desc{padding:0 5px}body{--ffsv3-bg-color: #f0f0f0;--ffsv3-alt-bg-color: #fff;--ffsv3-border-color: #ccc;--ffsv3-input-color: #ccc;--ffsv3-text-color: #000;--ffsv3-hover-color: #ddd;--ffsv3-glow-color: #4caf50;--ffsv3-success-color: #4caf50;--ffsv3-arrow-width: 20px}body.dark-mode{--ffsv3-bg-color: #333;--ffsv3-alt-bg-color: #383838;--ffsv3-border-color: #444;--ffsv3-input-color: #504f4f;--ffsv3-text-color: #ccc;--ffsv3-hover-color: #555;--ffsv3-glow-color: #4caf50;--ffsv3-success-color: #4caf50}.ff-premium-upgrade-line{display:block;margin-top:4px;line-height:1.3;white-space:nowrap;font-size:12px;font-style:normal}@media(max-width:768px){.ff-premium-upgrade-line{margin-top:6px;line-height:1.35;white-space:normal;overflow-wrap:anywhere}}ff-settings-panel{display:block}ff-settings-panel .accordion{margin:10px 0;padding:15px;background-color:var(--ffsv3-bg-color);border:1px solid var(--ffsv3-border-color);border-radius:5px;color:var(--ffsv3-text-color)}ff-settings-panel .accordion.glow{border-color:var(--ffsv3-glow-color);box-shadow:0 0 8px #4caf5080}ff-settings-panel .input-row{display:flex;flex-direction:column;gap:5px;margin-bottom:15px}ff-settings-panel .input-row-inline{display:flex;align-items:center;gap:10px;margin-bottom:15px}ff-settings-panel .blur-mode{filter:blur(4px);transition:filter .2s ease}ff-settings-panel .blur-mode:hover,ff-settings-panel .blur-mode:focus{filter:blur(0)}ff-settings-panel .error-msg{color:#f33;font-size:13px;margin-top:5px}ff-settings-panel input[type=text],ff-settings-panel input[type=number]{box-sizing:border-box!important;text-align:left;vertical-align:top;width:178px;height:34px!important;margin-right:8px;padding:9px 10px;line-height:14px;display:inline-block}ff-settings-panel input[type=number].ff-number{width:80px}ff-settings-panel select{box-sizing:border-box;text-align:left;vertical-align:top;width:178px;height:34px;margin-right:8px;padding:8px 10px;line-height:14px;display:inline-block;border:var(--input-border-color, 1px solid var(--ffsv3-border-color));border-radius:5px;font-family:Arial,serif;color:var(--input-color, var(--ffsv3-text-color));background:var(--input-background-color, var(--ffsv3-alt-bg-color))}:root .dark-mode ff-settings-panel select option{background-color:#000;color:var(--input-color)}ff-settings-panel .ff-api-explanation{background-color:var(--ffsv3-alt-bg-color);border:1px solid var(--ffsv3-border-color);border-radius:8px;color:var(--ffsv3-text-color);margin-bottom:20px;padding:12px 16px;font-size:13px;line-height:1.5}ff-settings-panel a{color:var(--ffsv3-success-color);text-decoration:underline}ff-settings-panel .is_premium_enabled{display:inline-block;background:#4caf50;color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;vertical-align:middle}ff-settings-panel .is_premium_disabled{display:inline-block;background:#c62828;color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;vertical-align:middle}.profile-status{position:relative}ff-flight-profile-status{position:absolute;right:10px;bottom:2px;z-index:2}.ff-scouter-profile-flight-info{display:inline-block;text-align:right;font-size:11px;line-height:1.25;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.85)}.profile-status .ff-scouter-profile-flight-info a{color:#fff;text-decoration:underline}ff-faction-filter-box{display:block}.ff-filter-box,.ff-filter-box *,.ff-filter-box *:before,.ff-filter-box *:after{box-sizing:border-box!important}.ff-filter-box{background-color:var(--ffsv3-bg-color);border:1px solid var(--ffsv3-border-color);border-radius:8px;padding:12px 16px;margin-bottom:16px;color:var(--ffsv3-text-color);font-family:Arial,sans-serif;box-shadow:0 2px 5px #0000000d}.ff-filter-box.no-borders{background-color:var(--default-bg-panel-color);border-top:1px solid var(--ffsv3-border-color);border-bottom:1px solid var(--ffsv3-border-color);border-left:none;border-right:none;border-radius:0;box-shadow:none;padding:12px 10px;margin:0}.ff-filter-box summary{cursor:pointer;font-size:14px;font-weight:700;outline:none;-webkit-user-select:none;user-select:none}.ff-filter-box[open] summary{border-bottom:1px solid var(--ffsv3-border-color);padding-bottom:6px;margin-bottom:12px}.ff-filter-header-actions{display:flex;gap:6px;align-items:center}.ff-filter-box .ff-action-icon-btn{background:var(--ffsv3-alt-bg-color);border:1px solid var(--ffsv3-border-color);border-radius:4px;color:var(--ffsv3-text-color);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;transition:background-color .2s,color .2s,opacity .2s}.ff-filter-box .ff-action-icon-btn:hover{background-color:var(--ffsv3-hover-color)}.ff-filter-box .ff-action-icon-btn.active{color:var(--ffsv3-text-color);opacity:1}.ff-filter-box .ff-action-icon-btn.inactive{color:var(--ffsv3-text-color);opacity:.4}.ff-filter-box .ff-action-icon-btn svg{width:14px;height:14px;fill:currentColor}.ff-filter-box .ff-action-icon-btn.reset-btn svg{transition:transform .25s ease-in-out}.ff-filter-box .ff-action-icon-btn.reset-btn:hover svg{transform:rotate(-180deg)}.ff-filter-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.grp-sort{order:1}.grp-level{order:2}.grp-activity{order:3}.grp-status{order:4}.grp-ff{order:5}.grp-stats{order:6}.grp-columns{order:7}@media(min-width:784px){.ff-filter-grid{grid-template-columns:repeat(3,1fr)}.ff-filter-grid>*{order:0}}.ff-filter-group{display:flex;flex-direction:column;gap:2px}.ff-filter-options{display:flex;flex-direction:column}.ff-filter-options label{display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer}.ff-filter-range-inputs{display:flex;align-items:center;gap:4px}.ff-filter-range-inputs input{flex:1;width:0;min-width:30px;max-width:80px;padding:4px;border:1px solid var(--ffsv3-border-color);border-radius:4px;background:var(--ffsv3-alt-bg-color);color:var(--ffsv3-text-color);font-size:11px;text-align:center}.ff-filter-box button{padding:6px 10px;border:1px solid var(--ffsv3-border-color);border-radius:4px;background:var(--ffsv3-alt-bg-color);color:var(--ffsv3-text-color);font-size:12px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;transition:background-color .2s}.ff-filter-box button:hover{background-color:var(--ffsv3-hover-color)}.chain-options-flex-container{display:flex;flex-wrap:wrap;gap:10px 20px;align-items:center;justify-content:flex-start;margin-left:20px;margin-top:10px;margin-bottom:15px}.chain-options-flex-container .input-row-inline{margin-bottom:0}.faction-war .ffscouter-cell{float:left!important;width:32px!important;height:20px!important;font-size:11px!important;font-weight:700!important;border-radius:3px!important;box-sizing:border-box!important;margin:7px 4px!important;padding:0!important;text-align:center!important;line-height:20px!important;z-index:10!important}.ffscouter-cell{cursor:pointer!important}.faction-war .ffscouter-header,.table-header .ffscouter-header{float:left!important;width:38px!important;font-size:12px!important;font-weight:700!important;padding:0!important;text-align:center!important;background-color:transparent!important;cursor:pointer!important}.faction-war:has(.ffscouter-header[data-ffscouter-sort]) [class*=sortIcon___]:not(.ffscouter-sort-icon),.members-list:has(.ffscouter-header[data-ffscouter-sort]) [class*=sortIcon___]:not(.ffscouter-sort-icon){visibility:hidden!important}[data-ffscouter-hidden]{display:none!important}.faction-war[data-ffscouter-hide-level=true] .level:not(.ffscouter-cell):not(.ffscouter-header){display:none!important}.faction-war[data-ffscouter-hide-status=true] .status,.faction-war[data-ffscouter-hide-score=true] .points{display:none!important}.faction-war[data-ffscouter-col-display=fair_fight]:not([data-ffscouter-hide-level=true]) .level:not(.ffscouter-cell):not(.ffscouter-header),.faction-war[data-ffscouter-col-display=battle_stats]:not([data-ffscouter-hide-level=true]) .level:not(.ffscouter-cell):not(.ffscouter-header){width:29px!important}.faction-war[data-ffscouter-col-display=fair_fight]:not([data-ffscouter-hide-level=true]) .status,.faction-war[data-ffscouter-col-display=battle_stats]:not([data-ffscouter-hide-level=true]) .status{width:50px!important}.faction-war[data-ffscouter-col-display=fair_fight]:not([data-ffscouter-hide-level=true]) .points,.faction-war[data-ffscouter-col-display=battle_stats]:not([data-ffscouter-hide-level=true]) .points{width:38px!important}.members-list li.enemy:has(>.tt-stats-estimate),.members-list li.your:has(>.tt-stats-estimate),.members-list li.enemy:has(>div.clear~*),.members-list li.your:has(>div.clear~*){padding-bottom:22px!important;position:relative!important}.members-list li.enemy>.tt-stats-estimate,.members-list li.your>.tt-stats-estimate,.members-list li.enemy>div.clear~*,.members-list li.your>div.clear~*{position:absolute!important;bottom:2px!important;left:10px!important;height:18px!important;line-height:18px!important;font-size:11px!important;width:calc(100% - 20px)!important;display:block!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ff-filter-box summary:focus-visible{outline:2px solid var(--ffsv3-glow-color);outline-offset:2px}body[data-ff-status-attack-enabled=true] [class*=userStatusWrap__],body[data-ff-status-attack-enabled=true] li[id^=icon][id*=-profile-].user-status-16-Online,body[data-ff-status-attack-enabled=true] li[id^=icon][id*=-profile-].user-status-16-Away,body[data-ff-status-attack-enabled=true] li[id^=icon][id*=-profile-].user-status-16-Offline,body[data-ff-status-attack-enabled=true] #profile-mini-root li[id^=icon][id*=-mini-profile-].user-status-16-Online,body[data-ff-status-attack-enabled=true] #profile-mini-root li[id^=icon][id*=-mini-profile-].user-status-16-Away,body[data-ff-status-attack-enabled=true] #profile-mini-root li[id^=icon][id*=-mini-profile-].user-status-16-Offline,body[data-ff-status-attack-enabled=true] li[id^=icon][id*=___].iconShow.ffscouter-forum-status{cursor:crosshair!important}.d .job-lists-wrap .item>li.company,.d .job-lists-wrap .item>li.director,.d .job-lists-wrap .item>li.salary,.d .job-lists-wrap .item>li.ranks{margin-bottom:0!important;padding-bottom:0!important}";
  importCSS(stylesCss);
  const log = logger.child("boot");
  const INJECTION_KEY = "__FF_SCOUTER_V3_INJECTED__";
  async function main() {
    const w = window;
    if (w[INJECTION_KEY]) {
      log.info("Script already injected");
      return;
    }
    w[INJECTION_KEY] = true;
    log.info("Initializing", "3.0-beta3");
    run_migration();
    if (ffscouter.analytics_enabled) {
      unsafeWindow.ffscouter = ffscouter;
      window.ffscouter = ffscouter;
    }
    for (const feat of Features) {
      if (feat.executionTime === StartTime.DocumentStart && await feat.shouldRun()) {
        if (feat.httpIntercept) {
          feat.httpIntercept.name = feat.name;
          registerHttpInterceptor(feat.httpIntercept);
        }
        feat.run();
      }
    }
    await wait_for_body(1e4);
    for (const feat of Features) {
      if (feat.executionTime === StartTime.DocumentBody && await feat.shouldRun()) {
        if (feat.httpIntercept) {
          feat.httpIntercept.name = feat.name;
          registerHttpInterceptor(feat.httpIntercept);
        }
        feat.run();
      }
    }
  }
  main();

})();