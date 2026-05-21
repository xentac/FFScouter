// ==UserScript==
// @name         FF Scouter V2 xentac edition
// @namespace    Violentmonkey Scripts
// @match        https://www.torn.com/*
// @version      2.77-xentac1
// @author       rDacted, Weav3r, xentac, Glasnost
// @description  Shows the expected Fair Fight score against targets and faction war status
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @connect      ffscouter.com
// @license      GPL-3.0
// ==/UserScript==

const FF_VERSION = "2.77-xentac1";
const API_INTERVAL = 30000;
const FF_TARGET_STALENESS = 24 * 60 * 60 * 1000; // Refresh the target list every day
const TARGET_KEY = "ffscouterv2-targets";
const TARGET_INDEX_KEY = "ffscouterv2-target-index";
const CHECK_KEY_CACHE_KEY = "ffscouterv2-check-key-cache";
const CHECK_KEY_INTERVAL = 5 * 60 * 1000;
const PREMIUM_UPGRADE_URL = "https://ffscouter.com/premium";
const PROFILE_FLIGHT_CACHE_TTL_MS = 60 * 1000;
const PROFILE_FLIGHT_RECHECK_INTERVAL_MS = 15 * 1000;
const PROFILE_FLIGHT_RECHECK_WINDOW_MS = 3 * 60 * 1000;
const PROFILE_FLIGHT_NO_DATA_CACHE_MS = 10 * 60 * 1000;
const memberCountdowns = {};
let _apiCallInProgressCount = 0;
const currentUserId = null;
let premiumStatusRefreshInFlight = false;
let profileFlightInfoLine = null;
let profileFlightTickInterval = null;
const profileFlightCache = new Map();
const profileFlightRequestsInFlight = new Set();

const TOAST_ERROR = "error";
const TOAST_LOG = "log";

console.log(`[FF Scouter V2] FF Scouter version ${FF_VERSION} starting`);
GM_addStyle(`
            .ff-scouter-indicator {
            position: relative;
            display: block;
            padding: 0;
            }

            .ff-scouter-vertical-line-low-upper,
            .ff-scouter-vertical-line-low-lower,
            .ff-scouter-vertical-line-high-upper,
            .ff-scouter-vertical-line-high-lower {
            content: '';
            position: absolute;
            width: 2px;
            height: 30%;
            background-color: black;
            margin-left: -1px;
            }

            .ff-scouter-vertical-line-low-upper {
            top: 0;
            left: calc(var(--arrow-width) / 2 + 33 * (100% - var(--arrow-width)) / 100);
            }

            .ff-scouter-vertical-line-low-lower {
            bottom: 0;
            left: calc(var(--arrow-width) / 2 + 33 * (100% - var(--arrow-width)) / 100);
            }

            .ff-scouter-vertical-line-high-upper {
            top: 0;
            left: calc(var(--arrow-width) / 2 + 66 * (100% - var(--arrow-width)) / 100);
        }

            .ff-scouter-vertical-line-high-lower {
            bottom: 0;
            left: calc(var(--arrow-width) / 2 + 66 * (100% - var(--arrow-width)) / 100);
            }

            .ff-scouter-ff-visible {
              display: flex !important;
            }

            .ff-scouter-ff-hidden {
              display: none !important;
            }

            .ff-scouter-est-visible {
              display: flex !important;
            }

            .ff-scouter-est-hidden {
              display: none !important;
            }

            .ff-scouter-arrow {
            position: absolute;
            transform: translate(-50%, -50%);
            padding: 0;
            top: 0;
            left: calc(var(--arrow-width) / 2 + var(--band-percent) * (100% - var(--arrow-width)) / 100);
            width: var(--arrow-width);
            object-fit: cover;
            pointer-events: none;
            }

            .last-action-row {
                font-size: 11px;
                color: inherit;
                font-style: normal;
                font-weight: normal;
                text-align: center;
                margin-left: 8px;
                margin-bottom: 2px;
                margin-top: -2px;
                display: block;
            }
            .travel-status {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: 2px;
                min-width: 0;
                overflow: hidden;
            }
            .torn-symbol {
                width: 16px;
                height: 16px;
                fill: currentColor;
                vertical-align: middle;
                flex-shrink: 0;
            }
            .plane-svg {
                width: 14px;
                height: 14px;
                fill: currentColor;
                vertical-align: middle;
                flex-shrink: 0;
            }
            .plane-svg.returning {
                transform: scaleX(-1);
            }
            .country-abbr {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                min-width: 0;
                flex: 0 1 auto;
                vertical-align: bottom;
            }

            #ff-scouter-profile-flight-info {
                position: absolute;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 2;
                margin: 0;
                padding: 2px 4px 4px;
                box-sizing: border-box;
                text-align: right;
                font-size: 11px;
                line-height: 1.25;
                color: #fff;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.85);
                pointer-events: none;
            }

            #ff-scouter-profile-flight-info a {
                pointer-events: auto;
            }

            /* FF Scouter CSS Variables */
            body {
                --ff-bg-color: #f0f0f0;
                --ff-alt-bg-color: #fff;
                --ff-border-color: #ccc;
                --ff-input-color: #ccc;
                --ff-text-color: #000;
                --ff-hover-color: #ddd;
                --ff-glow-color: #4CAF50;
                --ff-success-color: #4CAF50;
            }

            body.dark-mode {
                --ff-bg-color: #333;
                --ff-alt-bg-color: #383838;
                --ff-border-color: #444;
                --ff-input-color: #504f4f;
                --ff-text-color: #ccc;
                --ff-hover-color: #555;
                --ff-glow-color: #4CAF50;
                --ff-success-color: #4CAF50;
            }

            .ff-settings-accordion {
                margin: 10px 0;
                padding: 10px;
                background-color: var(--ff-bg-color);
                border: 1px solid var(--ff-border-color);
                border-radius: 5px;
            }

            .ff-settings-accordion summary {
                cursor: pointer;
            }

            .ff-settings-accordion div.ff-settings-body {
              margin-top: 10px;
            }

            .ff-settings-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 10px;
                margin-bottom: 10px;
                font-size: 1.2em;
                font-weight: bold;
                color: var(--ff-text-color);
            }

            .ff-settings-header-username {
                display: inline;
                font-style: italic;
                color: var(--ff-success-color);
            }

            .ff-settings-entry {
                display: flex;
                align-items: center;
                gap: 5px;
                margin-top: 10px;
                margin-bottom: 5px;
            }

            .ff-settings-entry p {
                margin: 0;
                color: var(--ff-text-color);
            }

            .ff-settings-input {
                width: 120px;
                padding: 5px;
                background-color: var(--ff-input-color);
                color: var(--ff-text-color);
                border: 1px solid var(--ff-border-color);
                border-radius: 3px;
            }

            .ff-settings-input.ff-blur {
                filter: blur(3px);
                transition: filter 0.5s;
            }

            .ff-settings-input.ff-blur:focus {
                filter: blur(0);
                transition: filter 0.5s;
            }

            .ff-settings-button {
                margin-right: 10px;
            }

            .ff-settings-button:last-child {
                margin-right: 0;
            }

            .ff-settings-glow {
                animation: ff-glow 1s infinite alternate;
                border-width: 3px;
            }

            @keyframes ff-glow {
                0% {
                    border-color: var(--ff-border-color);
                }
                100% {
                    border-color: var(--ff-glow-color);
                }
            }

            .ff-api-explanation {
                background-color: var(--ff-alt-bg-color);
                border: 1px solid var(--ff-border-color);
                border-radius: 8px;
                color: var(--ff-text-color);
                margin-bottom: 20px;
            }

            .ff-api-explanation a {
                color: var(--ff-success-color) !important;
                text-decoration: underline;
            }

            .ff-settings-label {
                color: var(--ff-text-color);
            }

            .ff-settings-section-header {
                color: var(--ff-text-color);
                margin-top: 20px;
                margin-bottom: 10px;
                font-weight: bold;
            }

            .ff-settings-entry-large {
                margin-bottom: 15px;
            }

            .ff-settings-entry-small {
                margin-bottom: 10px;
            }

            .ff-settings-entry-section {
                margin-bottom: 20px;
            }

            .ff-settings-label-inline {
                margin-right: 10px;
                min-width: 150px;
                display: inline-block;
            }

            .ff-settings-input-wide {
                width: 200px;
            }

            .ff-settings-input-narrow {
                width: 120px;
            }

            .ff-settings-checkbox {
                margin-right: 8px;
            }

            .ff-settings-button-large {
                padding: 8px 16px;
                font-size: 14px;
                font-weight: bold;
            }

            .ff-settings-button-container {
                margin-bottom: 20px;
                text-align: center;
            }

            .ff-api-explanation-content {
                padding: 12px 16px;
                font-size: 13px;
                line-height: 1.5;
            }

			.ff-scouter-history-btn {
				position: relative;
				display: flex;
				align-items: center;
				justify-content: center;
				width: 42px;
				height: 42px;
				margin: 0 12px 12px 0;
				border: 1px solid rgb(17, 17, 17);
				border-radius: 5px;
				background: #1a6fa8;
				color: #fff !important;
				text-decoration: none !important;
				cursor: pointer;
				box-sizing: border-box;
				flex-shrink: 0;
				overflow: hidden;
			}
			.ff-scouter-history-btn:hover {
				background: #155d8e !important;
				color: #fff !important;
				text-decoration: none !important;
			}
			body:not(.dark-mode) .ff-scouter-history-btn {
				border-color: #b0c4d8;
				background: #2980b9;
			}
			body:not(.dark-mode) .ff-scouter-history-btn:hover {
				background: #1f6fa0 !important;
			}
			.ff-scouter-history-btn .ff-history-icon {
				position: absolute;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
				opacity: 0.15;
				width: 36px;
				height: 36px;
				fill: #fff;
				pointer-events: none;
			}
			.ff-scouter-history-btn .ff-history-label {
				position: relative;
				z-index: 1;
				font-size: 9.5px;
				font-weight: bold;
				color: #fff;
				text-align: center;
				line-height: 1.2;
				white-space: pre-line;
				letter-spacing: 0.3px;
				pointer-events: none;
			}

			.ff-premium-upgrade-line {
				display: block;
				margin-top: 4px;
				line-height: 1.3;
				white-space: nowrap;
				font-size: 12px;
				font-style: normal;
			}

			@media (max-width: 768px) {
				.ff-premium-upgrade-line {
					margin-top: 6px;
					line-height: 1.35;
					white-space: normal;
					overflow-wrap: anywhere;
				}
			}
        `);

var key = rD_getValue("limited_key", null);

function ffdebug(...args) {
  if (ffSettingsGet("debug-logs") === "true") {
    console.log(...args);
  }
}

function format_duration_human(totalSeconds) {
  const clampedSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clampedSeconds / 3600);
  const minutes = Math.floor((clampedSeconds % 3600) / 60);
  const seconds = clampedSeconds % 60;
  const parts = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (hours > 0 || minutes > 0) {
    parts.push(`${minutes}m`);
  }
  parts.push(`${seconds}s`);
  return parts.join(" ");
}

function format_tct_time(unixSeconds) {
  if (!Number.isFinite(unixSeconds)) return null;
  const d = new Date(unixSeconds * 1000);
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function query_profile_status_element() {
  return document.querySelector(".profile-status");
}

// TODO: I'm not sure how I feel about changing the profile-status to relative position. Re-evaluate this.
function prepare_profile_flight_info_host(host) {
  if (!host?.style) return;
  host.style.position = "relative";
}

function ensure_profile_flight_info_line(profileStatus) {
  if (!profileStatus || !profileStatus.isConnected) return null;

  // If a line already exists, use that
  const line =
    profileFlightInfoLine ||
    profileStatus.querySelector(".ff-scouter-profile-flight-info");
  if (line?.isConnected && profileStatus.contains(line)) {
    profileFlightInfoLine = line;
    return line;
  }

  prepare_profile_flight_info_host(profileStatus);
  profileFlightInfoLine = document.createElement("div");
  profileFlightInfoLine.id = "ff-scouter-profile-flight-info";
  profileFlightInfoLine.className = "ff-scouter-profile-flight-info";
  profileStatus.insertAdjacentElement("beforeend", profileFlightInfoLine);
  return profileFlightInfoLine;
}

function clear_profile_flight_info_line() {
  if (profileFlightInfoLine) {
    profileFlightInfoLine.remove();
    profileFlightInfoLine = null;
  }
}

function build_landing_window_html(earliest, latest) {
  const nowUnix = Date.now() / 1000;
  // Use Torn's builtin synced clock if it exists
  if (window.getCurrentTimestamp) {
    now = window.getCurrentTimestamp() / 1000;
  }
  const earliestRemaining = Math.max(0, earliest - nowUnix);
  const latestRemaining = Math.max(0, latest - nowUnix);
  const earliestTct = format_tct_time(earliest);
  const latestTct = format_tct_time(latest);

  if (latestRemaining <= 0) {
    return `Landing: just landed<br>(${latestTct} TCT latest)`;
  }
  if (earliestRemaining <= 0) {
    return `Landing: imminent - ${format_duration_human(latestRemaining)}<br>(Latest: ${latestTct} TCT)`;
  }
  return `Landing: ${format_duration_human(earliestRemaining)} - ${format_duration_human(latestRemaining)}<br>(${earliestTct} - ${latestTct} TCT)`;
}

function fetch_profile_flight_window(target_id, cacheKey) {
  if (!key || !target_id) return;
  if (profileFlightRequestsInFlight.has(cacheKey)) return;

  profileFlightRequestsInFlight.add(cacheKey);

  rD_xmlhttpRequest({
    method: "GET",
    url: `${BASE_URL}/api/v1/player-flights?key=${key}&target=${target_id}`,
    onload: (response) => {
      const finishRequest = () => {
        profileFlightRequestsInFlight.delete(cacheKey);
      };

      if (!response || response.status !== 200) {
        ffdebug(
          "[FF Scouter V2] player-flights request failed",
          response?.status,
          response?.responseText,
        );
        try {
          const err = JSON.parse(response?.responseText || "{}");
          if (err?.code === 19) {
            // Match behavior of non-premium users by showing the upgrade message.
            profileFlightCache.set(cacheKey, {
              fetched_at: Date.now(),
              type: "premium_required",
            });
            finishRequest();
            return;
          }
        } catch {
          // Ignore parse errors and fall back to generic no-match handling.
        }
        profileFlightCache.set(cacheKey, {
          fetched_at: Date.now(),
          type: "no_match",
        });
        finishRequest();
        return;
      }

      try {
        const parsed = JSON.parse(response.responseText);
        const current = parsed?.current;
        const now = Date.now();

        if (!current) {
          const previous = profileFlightCache.get(cacheKey);
          const startedAt =
            previous?.type === "rechecking" && previous.started_at
              ? previous.started_at
              : now;
          const recheckUntil = startedAt + PROFILE_FLIGHT_RECHECK_WINDOW_MS;

          if (now >= recheckUntil) {
            profileFlightCache.set(cacheKey, {
              fetched_at: now,
              expires_at: now + PROFILE_FLIGHT_NO_DATA_CACHE_MS,
              type: "no_data_final",
            });
          } else {
            profileFlightCache.set(cacheKey, {
              fetched_at: now,
              started_at: startedAt,
              next_retry_at: now + PROFILE_FLIGHT_RECHECK_INTERVAL_MS,
              recheck_until: recheckUntil,
              type: "rechecking",
            });
          }
          finishRequest();
          return;
        }

        const earliest = Number(current?.earliest_arrival_time);
        const latest = Number(current?.latest_arrival_time);
        if (!Number.isFinite(earliest) || !Number.isFinite(latest)) {
          profileFlightCache.set(cacheKey, {
            fetched_at: Date.now(),
            type: "no_match",
          });
          finishRequest();
          return;
        }

        profileFlightCache.set(cacheKey, {
          fetched_at: Date.now(),
          type: "window",
          earliest: earliest,
          latest: latest,
        });
        finishRequest();
      } catch (e) {
        ffdebug("[FF Scouter V2] player-flights parse error", e);
        profileFlightCache.set(cacheKey, {
          fetched_at: Date.now(),
          type: "no_match",
        });
        finishRequest();
      }
    },
    onerror: (e) => {
      ffdebug("[FF Scouter V2] player-flights network error", e);
      profileFlightRequestsInFlight.delete(cacheKey);
    },
    onabort: (e) => {
      ffdebug("[FF Scouter V2] player-flights aborted", e);
      profileFlightRequestsInFlight.delete(cacheKey);
    },
    ontimeout: (e) => {
      ffdebug("[FF Scouter V2] player-flights timeout", e);
      profileFlightRequestsInFlight.delete(cacheKey);
    },
  });
}

function refresh_profile_flight_tracking(target_id) {
  if (!target_id) {
    clear_profile_flight_info_line();
    return;
  }

  // Check the profile status to see if they're currently traveling, if not, give up
  const profileStatus = query_profile_status_element();
  if (
    !profileStatus ||
    !profileStatus.isConnected ||
    !profileStatus.classList.contains("travelling")
  ) {
    clear_profile_flight_info_line();
    return;
  }

  const line = ensure_profile_flight_info_line(profileStatus);
  if (!line) return;

  const isPremium = getCachedPremiumStatus();
  if (isPremium === false) {
    line.innerHTML = `<a href="${PREMIUM_UPGRADE_URL}" target="_blank" rel="noopener noreferrer" style="font-weight: bold; text-decoration: underline;">Upgrade to FFScouter Flight Tracking</a>`;
    return;
  }

  // Only premium users may fetch flight tracking data.
  if (isPremium !== true) {
    line.textContent = "";
    return;
  }

  const cacheKey = `${profileStatus.className}|${target_id}`;
  const cached = profileFlightCache.get(cacheKey);
  const now = Date.now();

  if (cached?.type === "premium_required") {
    line.innerHTML = `<a href="${PREMIUM_UPGRADE_URL}" target="_blank" rel="noopener noreferrer" style="font-weight: bold; text-decoration: underline;">Upgrade to FFScouter Flight Tracking</a>`;
    return;
  }

  if (cached?.type === "rechecking") {
    if (now >= cached.recheck_until) {
      profileFlightCache.set(cacheKey, {
        fetched_at: now,
        expires_at: now + PROFILE_FLIGHT_NO_DATA_CACHE_MS,
        type: "no_data_final",
      });
      line.textContent = "No flight data available";
      return;
    }

    const secondsToRetry = Math.max(
      0,
      Math.ceil((cached.next_retry_at - now) / 1000),
    );
    line.textContent = `No data. Rechecking in ${secondsToRetry} seconds.`;

    if (now >= cached.next_retry_at) {
      fetch_profile_flight_window(target_id, cacheKey);
    }
    return;
  }

  if (
    cached?.type === "no_data_final" &&
    cached.expires_at &&
    now < cached.expires_at
  ) {
    line.textContent = "No flight data available";
    return;
  }

  const isFresh =
    cached &&
    (cached.expires_at
      ? now < cached.expires_at
      : now - cached.fetched_at < PROFILE_FLIGHT_CACHE_TTL_MS);

  if (!isFresh) {
    fetch_profile_flight_window(target_id, cacheKey);
    if (!cached) {
      line.textContent = "Landing: estimating...";
    }
    return;
  }

  if (cached.type === "window") {
    line.innerHTML = build_landing_window_html(cached.earliest, cached.latest);
    return;
  }

  // Keep a stable visible message rather than disappearing after "loading".
  line.textContent = "Landing: unavailable for current route";
}

function init_profile_flight_tracking(target_id) {
  if (profileFlightTickInterval) {
    clearInterval(profileFlightTickInterval);
    profileFlightTickInterval = null;
  }
  refresh_profile_flight_tracking(target_id);
  profileFlightTickInterval = setInterval(
    () => refresh_profile_flight_tracking(target_id),
    1000,
  );
}

function get_ff_string(ff_response) {
  const ff = ff_response.value.toFixed(2);

  const now = Date.now() / 1000;
  const age = now - ff_response.last_updated;

  var suffix = "";
  if (age > 14 * 24 * 60 * 60) {
    suffix = "?";
  }

  return `${ff}${suffix}`;
}

function get_age_human(unix_timestamp) {
  if (!unix_timestamp) return null;
  const now = Date.now() / 1000;
  const age = now - unix_timestamp;
  if (age < 60 * 60) {
    const mins = Math.round(age / 60);
    return mins <= 1 ? "1 minute" : `${mins} minutes`;
  } else if (age < 24 * 60 * 60) {
    const hours = Math.round(age / (60 * 60));
    return hours === 1 ? "1 hour" : `${hours} hours`;
  } else if (age < 31 * 24 * 60 * 60) {
    const days = Math.round(age / (24 * 60 * 60));
    return days === 1 ? "1 day" : `${days} days`;
  } else if (age < 365 * 24 * 60 * 60) {
    const months = Math.round(age / (31 * 24 * 60 * 60));
    return months === 1 ? "1 month" : `${months} months`;
  } else {
    const years = Math.round(age / (365 * 24 * 60 * 60));
    return years === 1 ? "1 year" : `${years} years`;
  }
}

function getCachedPremiumStatus() {
  try {
    const cached = JSON.parse(rD_getValue(CHECK_KEY_CACHE_KEY, null));
    if (!cached || typeof cached.is_premium !== "boolean") return null;
    return cached.is_premium;
  } catch {
    return null;
  }
}

function get_difficulty_text(ff) {
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

function get_ff_string_short(ff_response, _player_id) {
  const ff = ff_response.value.toFixed(2);

  const now = Date.now() / 1000;
  const age = now - ff_response.last_updated;

  if (ff > 99) {
    return `high`;
  }

  var suffix = "";
  if (age > 14 * 24 * 60 * 60) {
    suffix = "?";
  }

  return `${ff}${suffix}`;
}

function get_members() {
  var player_ids = [];
  document.querySelectorAll(".table-body > .table-row").forEach((elem) => {
    if (
      !elem.querySelectorAll(".fallen").length &&
      !elem.querySelectorAll(".fedded").length
    ) {
      elem.querySelectorAll(".member").forEach((value) => {
        var url = value.querySelectorAll('a[href^="/profiles"]')[0].href;
        var player_id = url.match(/.*XID=(?<player_id>\d+)/).groups.player_id;
        player_ids.push(parseInt(player_id, 10));
      });
    }
  });

  return player_ids;
}

function rgbToHex(r, g, b) {
  return (
    "#" +
    ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
  ); // Convert to hex and return
}

function get_ff_colour(value) {
  let r, g, b;

  // Transition from
  // blue - #2828c6
  // to
  // green - #28c628
  // to
  // red - #c62828
  if (value <= 1) {
    // Blue
    r = 0x28;
    g = 0x28;
    b = 0xc6;
  } else if (value <= 3) {
    // Transition from blue to green
    const t = (value - 1) / 2; // Normalize to range [0, 1]
    r = 0x28;
    g = Math.round(0x28 + (0xc6 - 0x28) * t);
    b = Math.round(0xc6 - (0xc6 - 0x28) * t);
  } else if (value <= 5) {
    // Transition from green to red
    const t = (value - 3) / 2; // Normalize to range [0, 1]
    r = Math.round(0x28 + (0xc6 - 0x28) * t);
    g = Math.round(0xc6 - (0xc6 - 0x28) * t);
    b = 0x28;
  } else {
    // Red
    r = 0xc6;
    g = 0x28;
    b = 0x28;
  }

  return rgbToHex(r, g, b); // Return hex value
}

function get_contrast_color(hex) {
  // Convert hex to RGB
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  // Calculate brightness
  const brightness = r * 0.299 + g * 0.587 + b * 0.114;
  return brightness > 126 ? "black" : "white"; // Return black or white based on brightness
}

async function apply_fair_fight_info(_) {
  // The factions column defaults to BS Estimate unless the user chooses FF Score.
  const showBSDefault =
    (ffSettingsGet("factions-col-display") || "battle_stats") ===
    "battle_stats";
  var ff_li = document.createElement("li");
  ff_li.tabIndex = "0";
  ff_li.classList.add("table-cell");
  ff_li.classList.add("lvl");
  ff_li.classList.add("torn-divider");
  ff_li.classList.add("divider-vertical");
  ff_li.classList.add("c-pointer");
  ff_li.classList.add(
    showBSDefault ? "ff-scouter-ff-hidden" : "ff-scouter-ff-visible",
  );
  ff_li.appendChild(document.createTextNode("FF"));
  var est_li = document.createElement("li");
  est_li.tabIndex = "0";
  est_li.classList.add("table-cell");
  est_li.classList.add("lvl");
  est_li.classList.add("torn-divider");
  est_li.classList.add("divider-vertical");
  est_li.classList.add("c-pointer");
  est_li.classList.add(
    showBSDefault ? "ff-scouter-est-visible" : "ff-scouter-est-hidden",
  );

  est_li.appendChild(document.createTextNode("Est"));

  if (document.querySelectorAll(".table-header > .lvl").length === 0) {
    // The .member-list doesn't have a .lvl, give up
    return;
  }
  document.querySelector(".table-header > .lvl")?.after(ff_li, est_li);

  const player_ids = [];
  document
    .querySelectorAll(".table-body > .table-row > .member")
    .forEach((value) => {
      var url = value.querySelectorAll('a[href^="/profiles"]')[0].href;
      var player_id = url.match(/.*XID=(?<player_id>\d+)/).groups.player_id;
      player_ids.push(parseInt(player_id, 10));
    });

  const cached_values = await ffcache.get(player_ids);
  const ffSortOrderKey = "factions-ff-sort-order";
  const validFFSortOrders = new Set(["desc", "asc"]);
  const savedFFSortOrder = ffSettingsGet(ffSortOrderKey);
  let currentFFSortOrder = validFFSortOrders.has(savedFFSortOrder)
    ? savedFFSortOrder
    : "desc";
  const estSortOrderKey = "factions-est-sort-order";
  const validEstSortOrders = new Set(["desc", "asc"]);
  const savedEstSortOrder = ffSettingsGet(estSortOrderKey);
  let currentEstSortOrder = validEstSortOrders.has(savedEstSortOrder)
    ? savedEstSortOrder
    : "desc";

  const get_estimate_for_row = (row) => {
    const profile_link = row.querySelector('.member a[href^="/profiles"]');
    if (!profile_link) {
      return Number.NEGATIVE_INFINITY;
    }
    const match = profile_link.href.match(/.*XID=(?<player_id>\d+)/);
    if (!match?.groups?.player_id) {
      return Number.NEGATIVE_INFINITY;
    }

    const player_id = parseInt(match.groups.player_id, 10);
    const cached = cached_values[player_id];
    const estimate = Number(cached?.bs_estimate);
    return Number.isFinite(estimate) ? estimate : Number.NEGATIVE_INFINITY;
  };

  const get_ff_for_row = (row) => {
    const profile_link = row.querySelector('.member a[href^="/profiles"]');
    if (!profile_link) {
      return Number.NEGATIVE_INFINITY;
    }
    const match = profile_link.href.match(/.*XID=(?<player_id>\d+)/);
    if (!match?.groups?.player_id) {
      return Number.NEGATIVE_INFINITY;
    }

    const player_id = parseInt(match.groups.player_id, 10);
    const cached = cached_values[player_id];
    const ff = Number(cached?.value);
    return Number.isFinite(ff) ? ff : Number.NEGATIVE_INFINITY;
  };

  function clearCustomSortArrows() {
    // Only clear arrows that FF Scouter controls.
    [ff_li, est_li].forEach((columnLi) => {
      const sortDiv = columnLi.querySelector('[class*="sortIcon___"]');
      if (!sortDiv) {
        return;
      }
      sortDiv.classList.remove(
        ...Array.from(sortDiv.classList).filter((c) =>
          c.startsWith("activeIcon___"),
        ),
      );
    });
  }

  function setSortArrow(targetLi, direction) {
    // direction: "asc", "desc", or null (to clear)

    // Clear all active arrows first so only one black arrow is shown.
    document
      .querySelectorAll('.table-header [class*="activeIcon___"]')
      .forEach((el) => {
        el.classList.remove(
          ...Array.from(el.classList).filter((c) =>
            c.startsWith("activeIcon___"),
          ),
        );
      });

    if (!targetLi || !direction) return;

    // Find or create the sort icon div in the target column
    let sortDiv = targetLi.querySelector('[class*="sortIcon___"]');
    if (!sortDiv) {
      sortDiv = document.createElement("div");
      sortDiv.className = "sortIcon___LNQ9D";
      targetLi.appendChild(sortDiv);
    }
    // Always reapply positioning so Torn's direction-specific top values don't interfere.
    sortDiv.style.position = "absolute";
    sortDiv.style.left = "50%";
    sortDiv.style.transform = "translateX(-50%)";
    sortDiv.style.margin = "0";

    // Remove old direction classes
    sortDiv.classList.remove(
      ...Array.from(sortDiv.classList).filter(
        (c) => c.startsWith("asc___") || c.startsWith("desc___"),
      ),
    );

    // Add the correct direction class (Torn's exact class names from the live page)
    if (direction === "asc") {
      // Keep ascending arrow inside the header.
      sortDiv.style.top = "auto";
      sortDiv.style.bottom = "0px";
      sortDiv.classList.add("asc___YAXFZ");
    } else {
      // Place descending arrow so its top edge sits at the header bottom.
      sortDiv.style.top = "100%";
      sortDiv.style.bottom = "auto";
      sortDiv.classList.add("desc___ZvHWf");
    }

    // Make it visible
    sortDiv.classList.add("activeIcon___SwNJj");
  }

  const apply_ff_sort_order = (sortOrder) => {
    const table_body = document.querySelector(".table-body");
    if (!table_body) {
      return;
    }

    const member_rows = Array.from(
      table_body.querySelectorAll(":scope > .table-row"),
    );

    if (sortOrder === "desc") {
      member_rows.sort((a, b) => get_ff_for_row(b) - get_ff_for_row(a));
      setTimeout(() => {
        setSortArrow(ff_li, "desc");
      }, 0);
      // Reset the other column's remembered order to a valid two-state value.
      currentEstSortOrder = "desc";
      ffSettingsSet(estSortOrderKey, "desc");
    } else {
      member_rows.sort((a, b) => get_ff_for_row(a) - get_ff_for_row(b));
      setTimeout(() => {
        setSortArrow(ff_li, "asc");
      }, 0);
      currentEstSortOrder = "desc";
      ffSettingsSet(estSortOrderKey, "desc");
    }

    member_rows.forEach((row) => table_body.appendChild(row));
    currentFFSortOrder = sortOrder;
    ffSettingsSet(ffSortOrderKey, sortOrder);
  };

  const apply_est_sort_order = (sortOrder) => {
    const table_body = document.querySelector(".table-body");
    if (!table_body) {
      return;
    }

    const member_rows = Array.from(
      table_body.querySelectorAll(":scope > .table-row"),
    );

    if (sortOrder === "desc") {
      member_rows.sort(
        (a, b) => get_estimate_for_row(b) - get_estimate_for_row(a),
      );
      setTimeout(() => {
        setSortArrow(est_li, "desc");
      }, 0);
      currentFFSortOrder = "desc";
      ffSettingsSet(ffSortOrderKey, "desc");
    } else {
      member_rows.sort(
        (a, b) => get_estimate_for_row(a) - get_estimate_for_row(b),
      );
      setTimeout(() => {
        setSortArrow(est_li, "asc");
      }, 0);
      currentFFSortOrder = "desc";
      ffSettingsSet(ffSortOrderKey, "desc");
    }

    member_rows.forEach((row) => table_body.appendChild(row));
    currentEstSortOrder = sortOrder;
    ffSettingsSet(estSortOrderKey, sortOrder);
  };

  ff_li.onclick = () => {
    // Two-state toggle only, matching Torn's native column headers.
    const nextSortOrder = currentFFSortOrder === "desc" ? "asc" : "desc";
    apply_ff_sort_order(nextSortOrder);
  };

  est_li.onclick = () => {
    // Two-state toggle only, matching Torn's native column headers.
    const nextSortOrder = currentEstSortOrder === "desc" ? "asc" : "desc";
    apply_est_sort_order(nextSortOrder);
  };

  const tableHeader = document.querySelector(".table-header");
  if (tableHeader && !tableHeader.dataset.ffScouterSortSyncBound) {
    tableHeader.dataset.ffScouterSortSyncBound = "true";
    tableHeader.addEventListener("click", (event) => {
      const clickedHeaderCell = event.target.closest(
        ".table-header > .table-cell",
      );
      if (!clickedHeaderCell) {
        return;
      }
      if (clickedHeaderCell === ff_li || clickedHeaderCell === est_li) {
        return;
      }

      // Defer to allow Torn to render its own active arrow first.
      setTimeout(() => {
        clearCustomSortArrows();
      }, 0);
    });
  }

  // Reapply the user's previous sorting preference for the active column.
  if (showBSDefault) {
    apply_est_sort_order(currentEstSortOrder);
  } else {
    apply_ff_sort_order(currentFFSortOrder);
  }

  document
    .querySelectorAll(".table-body > .table-row > .member")
    .forEach((value) => {
      var url = value.querySelectorAll('a[href^="/profiles"]')[0].href;
      var player_id = parseInt(
        url.match(/.*XID=(?<player_id>\d+)/).groups.player_id,
        10,
      );

      var fair_fight_div = document.createElement("div");

      fair_fight_div.classList.add("table-cell");

      fair_fight_div.classList.add("lvl");
      fair_fight_div.classList.add(
        showBSDefault ? "ff-scouter-ff-hidden" : "ff-scouter-ff-visible",
      );

      var estimate_div = document.createElement("div");
      estimate_div.classList.add("table-cell");
      estimate_div.classList.add("lvl");
      estimate_div.classList.add(
        showBSDefault ? "ff-scouter-est-visible" : "ff-scouter-est-hidden",
      );
      const cached = cached_values[player_id];

      if (cached?.value) {
        const ff = cached.value;
        const ff_string = get_ff_string_short(cached, player_id);
        const background_colour = get_ff_colour(ff);
        const text_colour = get_contrast_color(background_colour);
        fair_fight_div.style.backgroundColor = background_colour;
        fair_fight_div.style.color = text_colour;
        fair_fight_div.style.fontWeight = "bold";
        fair_fight_div.innerHTML = ff_string;

        if (cached.bs_estimate_human) {
          estimate_div.style.backgroundColor = background_colour;
          estimate_div.style.color = text_colour;
          estimate_div.style.fontWeight = "bold";
          estimate_div.innerHTML = cached.bs_estimate_human;
          if (cached.distribution_human) {
            const ageStr = get_age_human(cached.distribution_last_updated);
            const agePart = ageStr ? ` (${ageStr} old)` : "";
            estimate_div.title = `Top Stats: ${cached.distribution_human}${agePart}`;
          }
        }
      }

      value.nextSibling.after(fair_fight_div, estimate_div);
    });
}

const match1 = window.location.href.match(
  /https:\/\/www.torn.com\/profiles.php\?XID=(?<target_id>\d+)/,
);
const match2 = window.location.href.match(
  /https:\/\/www.torn.com\/page.php\?sid=attack&user2ID=(?<target_id>\d+)/,
);
const match = match1 ?? match2;
if (match) {
  var target_id = parseInt(match.groups.target_id, 10);
  // Only apply the flight tracker to profile pages
  if (match1) {
    init_profile_flight_tracking(target_id);
  }

  if (!key) {
    set_message("[FF Scouter V2]: Limited API key needed - click to add");
  }
} else if (
  window.location.href.startsWith("https://www.torn.com/factions.php")
) {
  clear_profile_flight_info_line();
  const torn_observer = new MutationObserver(async () => {
    // Find the member table - add a column if it doesn't already have one, for FF scores
    var members_list = document.querySelector(".members-list");
    if (members_list) {
      torn_observer.disconnect();

      var player_ids = get_members();
      await update_ff_cache(player_ids, apply_fair_fight_info);
    }
  });

  torn_observer.observe(document, {
    attributes: false,
    childList: true,
    characterData: false,
    subtree: true,
  });

  if (!key) {
    set_message("[FF Scouter V2]: Limited API key needed - click to add");
  }
} else {
  clear_profile_flight_info_line();
  if (profileFlightTickInterval) {
    clearInterval(profileFlightTickInterval);
    profileFlightTickInterval = null;
  }
}

function get_cached_targets(staleok) {
  const value = rD_getValue(TARGET_KEY);
  if (!value) {
    return null;
  }

  let parsed = null;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }

  if (parsed == null) {
    return null;
  }

  if (staleok) {
    return parsed.targets;
  }

  if (parsed.last_updated + FF_TARGET_STALENESS > new Date()) {
    // Old cache, return nothing
    return null;
  }

  return parsed.targets;
}

function get_next_target_index() {
  const value = Number(rD_getValue(TARGET_INDEX_KEY, 0));

  rD_setValue(TARGET_INDEX_KEY, value + 1);

  return value;
}

function reset_next_target_index() {
  rD_setValue(TARGET_INDEX_KEY, 0);
}

function update_ff_targets() {
  if (!key) {
    return;
  }

  const cached = get_cached_targets(false);
  if (cached) {
    return;
  }

  const chain_ff_target = ffSettingsGet("chain-ff-target") || "2.5";

  const url = `${BASE_URL}/api/v1/get-targets?key=${key}&inactiveonly=1&maxff=${chain_ff_target}&limit=50`;

  console.log("[FF Scouter V2] Refreshing chain list");
  rD_xmlhttpRequest({
    method: "GET",
    url: url,
    onload: (response) => {
      if (!response) {
        return;
      }
      if (response.status === 200) {
        var ff_response = JSON.parse(response.responseText);
        if (ff_response?.error) {
          showToast(ff_response.error);
          return;
        }
        if (ff_response.targets) {
          const result = {
            targets: ff_response.targets,
            last_updated: new Date(),
          };
          rD_setValue(TARGET_KEY, JSON.stringify(result));
          console.log("[FF Scouter V2] Chain list updated successfully");
        }
      } else {
        try {
          var err = JSON.parse(response.responseText);
          if (err?.error) {
            showToast(
              `API request failed. Error: ${err.error}; Code: ${err.code}`,
            );
          } else {
            showToast(
              `API request failed. HTTP status code: ${response.status}`,
            );
          }
        } catch {
          showToast(`API request failed. HTTP status code: ${response.status}`);
        }
      }
    },
    onerror: (e) => {
      console.error("[FF Scouter V2] **** error ", e, "; Stack:", e.stack);
    },
    onabort: (e) => {
      console.error("[FF Scouter V2] **** abort ", e, "; Stack:", e.stack);
    },
    ontimeout: (e) => {
      console.error("[FF Scouter V2] **** timeout ", e, "; Stack:", e.stack);
    },
  });
}

function get_random_chain_target() {
  const targets = get_cached_targets(true);
  if (!targets) {
    return null;
  }

  let index = get_next_target_index();

  if (index >= targets.length) {
    index = 0;
    reset_next_target_index();
  }

  return targets[index];
}

function clear_cached_targets() {
  rD_deleteValue(TARGET_KEY);
}

// Chain button stolen from https://greasyfork.org/en/scripts/511916-random-target-finder
function create_chain_button() {
  // Check if chain button is enabled in settings
  if (!ffSettingsGetToggle("chain-button-enabled")) {
    ffdebug("[FF Scouter V2] Chain button disabled in settings");
    return;
  }

  const button = document.createElement("button");
  button.innerHTML = "FF";
  button.style.position = "fixed";
  //button.style.top = '10px';
  //button.style.right = '10px';
  button.style.top = "32%"; // Adjusted to center vertically
  button.style.right = "0%"; // Center horizontally
  //button.style.transform = 'translate(-50%, -50%)'; // Center the button properly
  button.style.zIndex = "9999";

  // Add CSS styles for a green background
  button.style.backgroundColor = "green";
  button.style.color = "white";
  button.style.border = "none";
  button.style.padding = "6px";
  button.style.borderRadius = "6px";
  button.style.cursor = "pointer";

  // Add a click event listener to open Google in a new tab
  button.addEventListener("click", () => {
    const rando = get_random_chain_target();
    if (!rando) {
      return;
    }

    const linkType = ffSettingsGet("chain-link-type") || "attack";
    const tabType = ffSettingsGet("chain-tab-type") || "newtab";

    let profileLink;
    if (linkType === "profile") {
      profileLink = `https://www.torn.com/profiles.php?XID=${rando.player_id}`;
    } else {
      profileLink = `https://www.torn.com/page.php?sid=attack&user2ID=${rando.player_id}`;
    }

    if (tabType === "sametab") {
      window.location.href = profileLink;
    } else {
      window.open(profileLink, "_blank");
    }
  });
  // Add the button to the page
  document.body.appendChild(button);
}

function abbreviateCountry(name) {
  if (!name) return "";
  if (name.trim().toLowerCase() === "switzerland") return "Switz";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0];
  return words.map((w) => w[0].toUpperCase()).join("");
}

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(
    2,
    "0",
  );
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function fetchFactionData(factionID) {
  const url = `https://api.torn.com/v2/faction/${factionID}/members?striptags=true&key=${key}`;
  return fetch(url).then((response) => response.json());
}

function updateMemberStatus(li, member) {
  if (!member || !member.status) return;

  const statusEl = li.querySelector(".status");
  if (!statusEl) return;

  let lastActionRow = li.querySelector(".last-action-row");
  const lastActionText = member.last_action?.relative || "";
  if (lastActionRow) {
    lastActionRow.textContent = `Last Action: ${lastActionText}`;
  } else {
    lastActionRow = document.createElement("div");
    lastActionRow.className = "last-action-row";
    lastActionRow.textContent = `Last Action: ${lastActionText}`;
    const lastDiv = Array.from(li.children)
      .reverse()
      .find((el) => el.tagName === "DIV");
    if (lastDiv?.nextSibling) {
      li.insertBefore(lastActionRow, lastDiv.nextSibling);
    } else {
      li.appendChild(lastActionRow);
    }
  }

  // Handle status changes
  if (member.status.state === "Okay") {
    if (statusEl.dataset.originalHtml) {
      statusEl.innerHTML = statusEl.dataset.originalHtml;
      delete statusEl.dataset.originalHtml;
    }
    statusEl.textContent = "Okay";
  } else if (member.status.state === "Traveling") {
    if (!statusEl.dataset.originalHtml) {
      statusEl.dataset.originalHtml = statusEl.innerHTML;
    }

    const description = member.status.description || "";
    let location = "";
    let isReturning = false;

    if (description.includes("Returning to Torn from ")) {
      location = description.replace("Returning to Torn from ", "");
      isReturning = true;
    } else if (description.includes("Traveling to ")) {
      location = description.replace("Traveling to ", "");
    }

    const abbr = abbreviateCountry(location);
    const planeSvg = `<svg class="plane-svg ${isReturning ? "returning" : ""}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
                    <path d="M482.3 192c34.2 0 93.7 29 93.7 64c0 36-59.5 64-93.7 64l-116.6 0L265.2 495.9c-5.7 10-16.3 16.1-27.8 16.1l-56.2 0c-10.6 0-18.3-10.2-15.4-20.4l49-171.6L112 320 68.8 377.6c-3 4-7.8 6.4-12.8 6.4l-42 0c-7.8 0-14-6.3-14-14c0-1.3 .2-2.6 .5-3.9L32 256 .5 145.9c-.4-1.3-.5-2.6-.5-3.9c0-7.8 6.3-14 14-14l42 0c5 0 9.8 2.4 12.8 6.4L112 192l102.9 0-49-171.6C162.9 10.2 170.6 0 181.2 0l56.2 0c11.5 0 22.1 6.2 27.8 16.1L365.7 192l116.6 0z"/>
                </svg>`;
    const tornSymbol = `<svg class="torn-symbol" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" stroke-width="1.5"/>
                    <text x="12" y="16" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="14" fill="currentColor">T</text>
                </svg>`;
    statusEl.innerHTML = `<span class="travel-status">${tornSymbol}${planeSvg}<span class="country-abbr">${abbr}</span></span>`;
  } else if (member.status.state === "Abroad") {
    if (!statusEl.dataset.originalHtml) {
      statusEl.dataset.originalHtml = statusEl.innerHTML;
    }
    const description = member.status.description || "";
    if (description.startsWith("In ")) {
      const location = description.replace("In ", "");
      const abbr = abbreviateCountry(location);
      statusEl.textContent = `in ${abbr}`;
    }
  }

  // Update countdown
  if (member.status.until && parseInt(member.status.until, 10) > 0) {
    memberCountdowns[member.id] = parseInt(member.status.until, 10);
  } else {
    delete memberCountdowns[member.id];
  }
}

function updateFactionStatuses(factionID, container) {
  _apiCallInProgressCount++;
  fetchFactionData(factionID)
    .then((data) => {
      if (!Array.isArray(data.members)) {
        console.warn(
          `[FF Scouter V2] No members array for faction ${factionID}`,
        );
        return;
      }

      const memberMap = {};
      data.members.forEach((member) => {
        memberMap[member.id] = member;
      });

      container.querySelectorAll("li").forEach((li) => {
        const profileLink = li.querySelector('a[href*="profiles.php?XID="]');
        if (!profileLink) return;
        const match = profileLink.href.match(/XID=(\d+)/);
        if (!match) return;
        const userID = match[1];
        updateMemberStatus(li, memberMap[userID]);
      });
    })
    .catch((err) => {
      console.error(
        "[FF Scouter V2] Error fetching faction data for faction",
        factionID,
        err,
      );
    })
    .finally(() => {
      _apiCallInProgressCount--;
    });
}

function updateAllMemberTimers() {
  const liElements = document.querySelectorAll(
    ".enemy-faction .members-list li, .your-faction .members-list li",
  );
  liElements.forEach((li) => {
    const profileLink = li.querySelector('a[href*="profiles.php?XID="]');
    if (!profileLink) return;
    const match = profileLink.href.match(/XID=(\d+)/);
    if (!match) return;
    const userID = match[1];
    const statusEl = li.querySelector(".status");
    if (!statusEl) return;
    if (memberCountdowns[userID]) {
      let remaining = memberCountdowns[userID] * 1000 - Date.now();
      if (remaining < 0) remaining = 0;
      statusEl.textContent = formatTime(remaining);
    }
  });
}

function updateAPICalls() {
  const enemyFactionLink = document.querySelector(
    '[class*="opponentFactionName__"]',
  );
  const yourFactionLink = document.querySelector(
    '[class*="currentFactionName__"]',
  );
  if (!enemyFactionLink || !yourFactionLink) return;

  const enemyFactionIdMatch = enemyFactionLink.href.match(/ID=(\d+)/);
  const yourFactionIdMatch = yourFactionLink.href.match(/ID=(\d+)/);
  if (!enemyFactionIdMatch || !yourFactionIdMatch) return;

  const enemyList = document.querySelector(".enemy-faction .members-list");
  const yourList = document.querySelector(".your-faction .members-list");
  if (!enemyList || !yourList) return;

  updateFactionStatuses(enemyFactionIdMatch[1], enemyList);
  updateFactionStatuses(yourFactionIdMatch[1], yourList);
}

function initWarScript() {
  const enemyFactionLink = document.querySelector(
    '[class*="opponentFactionName__"]',
  );
  const yourFactionLink = document.querySelector(
    '[class*="currentFactionName__"]',
  );
  if (!enemyFactionLink || !yourFactionLink) return false;

  const enemyList = document.querySelector(".enemy-faction .members-list");
  const yourList = document.querySelector(".your-faction .members-list");
  if (!enemyList || !yourList) return false;

  updateAPICalls();
  setInterval(updateAPICalls, API_INTERVAL);
  console.log(
    "[FF Scouter V2] Torn Faction Status Countdown (Real-Time & API Status - Relative Last): Initialized",
  );
  return true;
}

const warObserver = new MutationObserver((_mutations, obs) => {
  if (initWarScript()) {
    obs.disconnect();
  }
});

// Only initialize war monitoring if enabled in settings
if (
  !document.getElementById("FFScouterV2DisableWarMonitor") &&
  ffSettingsGetToggle("war-monitor-enabled")
) {
  warObserver.observe(document.body, { childList: true, subtree: true });

  const memberTimersInterval = setInterval(updateAllMemberTimers, 1000);

  window.addEventListener("FFScouterV2DisableWarMonitor", () => {
    console.log(
      "[FF Scouter V2] Caught disable event, removing monitoring observer and interval",
    );
    warObserver.disconnect();

    clearInterval(memberTimersInterval);
  });
}
// Try to be friendly and detect other war monitoring scripts
const catchOtherScripts = () => {
  if (
    Array.from(document.querySelectorAll("style")).some(
      (style) =>
        style.textContent.includes(
          '.members-list li:has(div.status[data-twse-highlight="true"])', // Torn War Stuff Enhanced
        ) ||
        style.textContent.includes(".warstuff_highlight") || // Torn War Stuff
        style.textContent.includes(".finally-bs-stat"), // wall-battlestats
    )
  ) {
    window.dispatchEvent(new Event("FFScouterV2DisableWarMonitor"));
  }
};
catchOtherScripts();
setTimeout(catchOtherScripts, 500);

function waitForElement(querySelector, timeout = 15000) {
  return new Promise((resolve) => {
    // Check if element already exists
    const existingElement = document.querySelector(querySelector);
    if (existingElement) {
      return resolve(existingElement);
    }

    // Set up observer to watch for element
    const observer = new MutationObserver(() => {
      const element = document.querySelector(querySelector);
      if (element) {
        observer.disconnect();
        if (timer) {
          clearTimeout(timer);
        }
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Set up timeout
    const timer = setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

// Settings management utilities
function ffSettingsGet(key) {
  return rD_getValue(`ffscouterv2-${key}`, null);
}

function ffSettingsSet(key, value) {
  rD_setValue(`ffscouterv2-${key}`, value);
}

function ffSettingsGetToggle(key) {
  return ffSettingsGet(key) === "true";
}

function ffSettingsSetToggle(key, value) {
  ffSettingsSet(key, value.toString());
}

function checkKeyAndUpdatePremium(forceRefresh = false) {
  if (!key) return;
  if (premiumStatusRefreshInFlight) return;
  const now = Date.now();
  const cached = (() => {
    try {
      return JSON.parse(rD_getValue(CHECK_KEY_CACHE_KEY, null));
    } catch {
      return null;
    }
  })();
  if (
    !forceRefresh &&
    cached &&
    cached.last_checked &&
    now - cached.last_checked < CHECK_KEY_INTERVAL
  ) {
    ffdebug("[FF Scouter V2] check-key: using cached result");
    applyPremiumBadge(cached.is_premium);
    return;
  }
  premiumStatusRefreshInFlight = true;
  const url = `${BASE_URL}/api/v1/check-key?key=${key}`;
  rD_xmlhttpRequest({
    method: "GET",
    url: url,
    onload: (response) => {
      premiumStatusRefreshInFlight = false;
      if (!response || response.status !== 200) return;
      try {
        const data = JSON.parse(response.responseText);
        const result = {
          is_premium: !!data.is_premium,
          last_checked: Date.now(),
        };
        rD_setValue(CHECK_KEY_CACHE_KEY, JSON.stringify(result));
        applyPremiumBadge(result.is_premium);
      } catch (e) {
        ffdebug("[FF Scouter V2] check-key parse error", e);
      }
    },
    onerror: (e) => {
      premiumStatusRefreshInFlight = false;
      ffdebug("[FF Scouter V2] check-key error", e);
    },
  });
}

function applyPremiumBadge(is_premium) {
  const existing = document.getElementById("ff-premium-badge");
  if (existing) existing.remove();
  const badge = document.createElement("span");
  badge.id = "ff-premium-badge";
  if (is_premium) {
    badge.textContent = "Enabled";
    badge.style.cssText =
      "display:inline-block;background:#4CAF50;color:#fff;font-size:11px;font-weight:bold;padding:2px 8px;border-radius:4px;vertical-align:middle;";
  } else {
    badge.textContent = "Disabled";
    badge.style.cssText =
      "display:inline-block;background:#C62828;color:#fff;font-size:11px;font-weight:bold;padding:2px 8px;border-radius:4px;vertical-align:middle;";
  }
  const premiumLabel = document.querySelector('label[for="ff-premium"]');
  if (premiumLabel) {
    premiumLabel.parentNode.insertBefore(badge, premiumLabel.nextSibling);
  }
}

// TODO: Properly integrate into new framework
/*create_chain_button();
update_ff_targets();
checkKeyAndUpdatePremium();
setInterval(checkKeyAndUpdatePremium, CHECK_KEY_INTERVAL);

getLocalUserId().then((userId) => {
  if (userId) {
    currentUserId = userId;
    ffdebug(`[FF Scouter V2] Current user ID initialized: ${currentUserId}`);

    createSettingsPanel();

    const profileObserver = new MutationObserver(() => {
      const pageId = window.location.href.match(/XID=(\d+)/)?.[1];
      if (
        pageId === currentUserId &&
        window.location.pathname === "/profiles.php"
      ) {
        createSettingsPanel();
      }
    });

    profileObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
});*/

export default {};
