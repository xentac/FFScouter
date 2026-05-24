import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { FactionsColDisplay, ffconfig } from "../utils/ffconfig";
import { parse_suffix_number } from "../utils/strings";

export interface FactionFilterState {
  sortBy: "ff-asc" | "ff-desc" | "none";
  activity: {
    online: boolean;
    idle: boolean;
    offline: boolean;
  };
  status: {
    okay: boolean;
    traveling: boolean;
    hospital: boolean;
    jail: boolean;
    abroad: boolean;
  };
  levelMin: number | null;
  levelMax: number | null;
  ffMin: number | null;
  ffMax: number | null;
  statsMin: string | null;
  statsMax: string | null;
  hiddenColumns?: {
    level: boolean;
    status: boolean;
    score: boolean;
  };
}

const DEFAULT_HIDDEN_COLUMNS = {
  level: false,
  status: false,
  score: false,
};

const DEFAULT_STATE: FactionFilterState = {
  sortBy: "none",
  activity: {
    online: true,
    idle: true,
    offline: true,
  },
  status: {
    okay: true,
    traveling: true,
    hospital: true,
    jail: true,
    abroad: true,
  },
  levelMin: 1,
  levelMax: 100,
  ffMin: 1,
  ffMax: null,
  statsMin: null,
  statsMax: null,
  hiddenColumns: DEFAULT_HIDDEN_COLUMNS,
};

@customElement("ff-faction-filter-box")
export class FFFactionFilterBox extends LitElement {
  protected override createRenderRoot() {
    return this;
  }

  @property({ type: String }) mode: "faction" | "war" = "faction";

  @state() sortBy: FactionFilterState["sortBy"] = "none";
  @state() colDisplay: FactionsColDisplay = FactionsColDisplay.FAIR_FIGHT;

  @state() activity = { ...DEFAULT_STATE.activity };

  @state() status = { ...DEFAULT_STATE.status };

  @state() levelMin: number | null = null;
  @state() levelMax: number | null = null;

  @state() ffMin: number | null = null;
  @state() ffMax: number | null = null;
  @state() statsMin: string | null = null;
  @state() statsMax: string | null = null;
  @state() hiddenColumns = { ...DEFAULT_HIDDEN_COLUMNS };
  @state() private collapsed = false;

  override connectedCallback() {
    super.connectedCallback();
    this.loadState();
    window.addEventListener("ff-config-updated", this.onConfigUpdated);
  }

  override disconnectedCallback() {
    window.removeEventListener("ff-config-updated", this.onConfigUpdated);
    super.disconnectedCallback();
  }

  override updated(changedProperties: Map<string | number | symbol, unknown>) {
    super.updated(changedProperties);
    if (
      changedProperties.has("hiddenColumns") ||
      changedProperties.has("mode")
    ) {
      this.updateContainerAttributes();
    }
  }

  private onConfigUpdated = () => {
    this.colDisplay =
      this.mode === "war"
        ? ffconfig.war_col_display
        : ffconfig.factions_col_display;
    this.requestUpdate();
  };

  private updateContainerAttributes() {
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

  private loadState() {
    const isWar = this.mode === "war";
    this.collapsed = isWar
      ? ffconfig.war_filter_collapsed
      : ffconfig.faction_filter_collapsed;
    this.colDisplay = isWar
      ? ffconfig.war_col_display
      : ffconfig.factions_col_display;
    const parsed = isWar
      ? ffconfig.war_filter_state
      : ffconfig.faction_filter_state;
    if (parsed) {
      const savedSortBy = parsed.sortBy ?? "none";
      this.sortBy =
        savedSortBy === "ff-asc" || savedSortBy === "ff-desc"
          ? savedSortBy
          : "none";
      this.activity = { ...DEFAULT_STATE.activity, ...parsed.activity };
      this.status = { ...DEFAULT_STATE.status, ...parsed.status };
      this.levelMin = parsed.levelMin ?? null;
      this.levelMax = parsed.levelMax ?? null;
      this.ffMin = parsed.ffMin ?? null;
      this.ffMax = parsed.ffMax ?? null;
      this.statsMin = parsed.statsMin ?? null;
      this.statsMax = parsed.statsMax ?? null;
      this.hiddenColumns = {
        level: parsed.hiddenColumns?.level ?? DEFAULT_HIDDEN_COLUMNS.level,
        status: parsed.hiddenColumns?.status ?? DEFAULT_HIDDEN_COLUMNS.status,
        score: parsed.hiddenColumns?.score ?? DEFAULT_HIDDEN_COLUMNS.score,
      };
    }
    // Dispatch initial state once loaded
    this.dispatchChange();
  }

  private onToggle(e: Event) {
    const details = e.currentTarget as HTMLDetailsElement;
    this.collapsed = !details.open;
    if (this.mode === "war") {
      ffconfig.war_filter_collapsed = this.collapsed;
    } else {
      ffconfig.faction_filter_collapsed = this.collapsed;
    }
  }

  private saveState() {
    const stateObj: FactionFilterState = {
      sortBy: this.sortBy,
      activity: this.activity,
      status: this.status,
      levelMin: this.levelMin,
      levelMax: this.levelMax,
      ffMin: this.ffMin,
      ffMax: this.ffMax,
      statsMin: this.statsMin,
      statsMax: this.statsMax,
      hiddenColumns: this.hiddenColumns,
    };
    if (this.mode === "war") {
      ffconfig.war_filter_state = stateObj;
    } else {
      ffconfig.faction_filter_state = stateObj;
    }
  }

  private dispatchChange() {
    this.dispatchEvent(
      new CustomEvent("filter-change", {
        detail: {
          sortBy: this.sortBy,
          activity: this.activity,
          status: this.status,
          levelMin: this.levelMin,
          levelMax: this.levelMax,
          ffMin: this.ffMin,
          ffMax: this.ffMax,
          statsMin: this.statsMin ? parse_suffix_number(this.statsMin) : null,
          statsMax: this.statsMax ? parse_suffix_number(this.statsMax) : null,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onColumnVisibilityChange(
    key: keyof NonNullable<FactionFilterState["hiddenColumns"]>,
    val: boolean,
  ) {
    this.hiddenColumns = {
      ...this.hiddenColumns,
      [key]: val,
    };
    this.saveState();
    this.dispatchChange();
  }

  private onSortToggle() {
    if (this.sortBy === "none") {
      this.sortBy = "ff-desc";
    } else if (this.sortBy === "ff-desc") {
      this.sortBy = "ff-asc";
    } else {
      this.sortBy = "none";
    }
    this.saveState();
    this.dispatchChange();
  }

  private onDisplayChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as FactionsColDisplay;
    this.colDisplay = val;
    if (this.mode === "war") {
      ffconfig.war_col_display = val;
    } else {
      ffconfig.factions_col_display = val;
    }
    window.dispatchEvent(new CustomEvent("ff-config-updated"));
  }

  private onActivityChange(
    key: keyof FactionFilterState["activity"],
    val: boolean,
  ) {
    this.activity = {
      ...this.activity,
      [key]: val,
    };
    this.saveState();
    this.dispatchChange();
  }

  private onStatusChange(
    key: keyof FactionFilterState["status"],
    val: boolean,
  ) {
    this.status = {
      ...this.status,
      [key]: val,
    };
    this.saveState();
    this.dispatchChange();
  }

  private onLevelChange(type: "min" | "max", valStr: string) {
    const val = valStr === "" ? null : Number.parseInt(valStr, 10);
    if (type === "min") {
      this.levelMin = val;
    } else {
      this.levelMax = val;
    }
    this.saveState();
    this.dispatchChange();
  }

  private onFFChange(type: "min" | "max", valStr: string) {
    const val = valStr === "" ? null : Number.parseFloat(valStr);
    if (type === "min") {
      this.ffMin = val;
    } else {
      this.ffMax = val;
    }
    this.saveState();
    this.dispatchChange();
  }

  private onStatsChange(type: "min" | "max", valStr: string) {
    const val = valStr.trim() === "" ? null : valStr;
    if (type === "min") {
      this.statsMin = val;
    } else {
      this.statsMax = val;
    }
    this.saveState();
    this.dispatchChange();
  }

  override render() {
    const isEst = this.colDisplay === FactionsColDisplay.BATTLE_STATS;
    const sortText = isEst ? "Stats" : "FF";

    return html`
      <details
        class="ff-filter-box ${this.mode === "war" ? "no-borders" : ""}"
        ?open="${!this.collapsed}"
        @toggle="${this.onToggle}"
      >
        <summary
          style="cursor: pointer; font-weight: bold; font-size: 14px; outline: none; user-select: none;"
        >
          FFScouter Filter & Sort Controls
        </summary>
        <div class="ff-filter-grid" style="margin-top: 12px;">
          <div class="ff-filter-group grp-sort">
            <strong>Sort & Display</strong>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <button @click="${this.onSortToggle}" style="width: 100%;">
                ${
                  this.sortBy === "none"
                    ? "Sort: Default"
                    : this.sortBy === "ff-asc"
                      ? `Sort: ${sortText} ▲`
                      : `Sort: ${sortText} ▼`
                }
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
            </div>
          </div>

          <div class="ff-filter-group grp-activity">
            <strong>Activity</strong>
            <div class="ff-filter-options">
              <label>
                <input
                  type="checkbox"
                  ?checked="${this.activity.online}"
                  @change="${(e: any) =>
                    this.onActivityChange("online", e.target.checked)}"
                />
                Online
              </label>
              <label>
                <input
                  type="checkbox"
                  ?checked="${this.activity.idle}"
                  @change="${(e: any) =>
                    this.onActivityChange("idle", e.target.checked)}"
                />
                Idle
              </label>
              <label>
                <input
                  type="checkbox"
                  ?checked="${this.activity.offline}"
                  @change="${(e: any) =>
                    this.onActivityChange("offline", e.target.checked)}"
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
                  @change="${(e: any) =>
                    this.onStatusChange("okay", e.target.checked)}"
                />
                Okay
              </label>
              <label>
                <input
                  type="checkbox"
                  ?checked="${this.status.hospital}"
                  @change="${(e: any) =>
                    this.onStatusChange("hospital", e.target.checked)}"
                />
                Hospital
              </label>
              <label>
                <input
                  type="checkbox"
                  ?checked="${this.status.jail}"
                  @change="${(e: any) =>
                    this.onStatusChange("jail", e.target.checked)}"
                />
                Jail
              </label>
              <label>
                <input
                  type="checkbox"
                  ?checked="${this.status.abroad}"
                  @change="${(e: any) =>
                    this.onStatusChange("abroad", e.target.checked)}"
                />
                Abroad
              </label>
              <label>
                <input
                  type="checkbox"
                  ?checked="${this.status.traveling}"
                  @change="${(e: any) =>
                    this.onStatusChange("traveling", e.target.checked)}"
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
                @input="${(e: any) =>
                  this.onLevelChange("min", e.target.value)}"
              />
              <span>to</span>
              <input
                type="number"
                placeholder="Max"
                .value="${this.levelMax !== null ? String(this.levelMax) : ""}"
                @input="${(e: any) =>
                  this.onLevelChange("max", e.target.value)}"
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
                @input="${(e: any) => this.onFFChange("min", e.target.value)}"
              />
              <span>to</span>
              <input
                type="number"
                step="0.1"
                placeholder="Max"
                .value="${this.ffMax !== null ? String(this.ffMax) : ""}"
                @input="${(e: any) => this.onFFChange("max", e.target.value)}"
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
                @input="${(e: any) => this.onStatsChange("min", e.target.value)}"
              />
              <span>to</span>
              <input
                type="text"
                placeholder="Max"
                .value="${this.statsMax !== null ? this.statsMax : ""}"
                @input="${(e: any) => this.onStatsChange("max", e.target.value)}"
              />
            </div>
          </div>

          ${
            this.mode === "war"
              ? html`
                <div class="ff-filter-group grp-columns">
                  <strong>Visible Columns</strong>
                  <div class="ff-filter-options">
                    <label>
                      <input
                        type="checkbox"
                        ?checked="${!this.hiddenColumns.level}"
                        @change="${(e: any) =>
                          this.onColumnVisibilityChange(
                            "level",
                            !e.target.checked,
                          )}"
                      />
                      Level
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        ?checked="${!this.hiddenColumns.status}"
                        @change="${(e: any) =>
                          this.onColumnVisibilityChange(
                            "status",
                            !e.target.checked,
                          )}"
                      />
                      Status
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        ?checked="${!this.hiddenColumns.score}"
                        @change="${(e: any) =>
                          this.onColumnVisibilityChange(
                            "score",
                            !e.target.checked,
                          )}"
                      />
                      Score
                    </label>
                  </div>
                </div>
              `
              : ""
          }
        </div>
      </details>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ff-faction-filter-box": FFFactionFilterBox;
  }
}
