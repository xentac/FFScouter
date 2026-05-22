import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";

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
}

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
};

@customElement("ff-faction-filter-box")
export class FFFactionFilterBox extends LitElement {
  protected override createRenderRoot() {
    return this;
  }

  @state() sortBy: FactionFilterState["sortBy"] = "none";

  @state() activity = { ...DEFAULT_STATE.activity };

  @state() status = { ...DEFAULT_STATE.status };

  @state() levelMin: number | null = null;
  @state() levelMax: number | null = null;

  @state() ffMin: number | null = null;
  @state() ffMax: number | null = null;

  override connectedCallback() {
    super.connectedCallback();
    this.loadState();
  }

  private loadState() {
    const saved = localStorage.getItem("ffsv3-faction-filter-state");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
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
      } catch (_e) {
        // Use defaults on error
      }
    }
    // Dispatch initial state once loaded
    this.dispatchChange();
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
    };
    localStorage.setItem(
      "ffsv3-faction-filter-state",
      JSON.stringify(stateObj),
    );
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
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onSortToggle() {
    if (this.sortBy === "none") {
      this.sortBy = "ff-asc";
    } else if (this.sortBy === "ff-asc") {
      this.sortBy = "ff-desc";
    } else {
      this.sortBy = "none";
    }
    this.saveState();
    this.dispatchChange();
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

  override render() {
    return html`
      <div class="ff-filter-box">
        <h3>FFScouter Filter & Sort Controls</h3>
        <div class="ff-filter-grid">
          <div class="ff-filter-group">
            <h4>Sort Order</h4>
            <button @click="${this.onSortToggle}">
              ${
                this.sortBy === "none"
                  ? "Sort: Default"
                  : this.sortBy === "ff-asc"
                    ? "Sort: FF ▲"
                    : "Sort: FF ▼"
              }
            </button>
          </div>

          <div class="ff-filter-group">
            <h4>Activity</h4>
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

          <div class="ff-filter-group">
            <h4>Status</h4>
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

          <div class="ff-filter-group">
            <h4>Level Range</h4>
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

          <div class="ff-filter-group">
            <h4>FF Range</h4>
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
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ff-faction-filter-box": FFFactionFilterBox;
  }
}
