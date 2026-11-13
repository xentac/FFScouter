import { is_narrow_layout } from "@utils/dom";
import { FactionsColDisplay, ffconfig } from "@utils/ffconfig";
import { parse_duration_to_seconds, parse_suffix_number } from "@utils/strings";
import {
  type Ref,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import styles from "./faction-filter-box.module.css";

// Local aliases for the BEM module classes. The keys are hyphenated, so they are
// bracket-accessed once here and referenced by short name in the render below.
const cls = {
  box: styles["ff-filter-box"],
  boxNoBorders: styles["ff-filter-box--no-borders"],
  header: styles["ff-filter-box__header"],
  headerActions: styles["ff-filter-box__header-actions"],
  actionBtn: styles["ff-filter-box__action-btn"],
  actionBtnActive: styles["ff-filter-box__action-btn--active"],
  actionBtnInactive: styles["ff-filter-box__action-btn--inactive"],
  actionBtnReset: styles["ff-filter-box__action-btn--reset"],
  grid: styles["ff-filter-box__grid"],
  group: styles["ff-filter-box__group"],
  groupSort: styles["ff-filter-box__group--sort"],
  groupLevel: styles["ff-filter-box__group--level"],
  groupActivity: styles["ff-filter-box__group--activity"],
  groupStatus: styles["ff-filter-box__group--status"],
  groupFf: styles["ff-filter-box__group--ff"],
  groupStats: styles["ff-filter-box__group--stats"],
  groupLastAction: styles["ff-filter-box__group--last-action"],
  groupColumns: styles["ff-filter-box__group--columns"],
  sortControls: styles["ff-filter-box__sort-controls"],
  sortBtn: styles["ff-filter-box__sort-btn"],
  compareBtn: styles["ff-filter-box__compare-btn"],
  displaySelect: styles["ff-filter-box__display-select"],
  options: styles["ff-filter-box__options"],
  optionOutSoon: styles["ff-filter-box__option--out-soon"],
  rangeInputs: styles["ff-filter-box__range-inputs"],
  srOnly: styles["ff-filter-box__sr-only"],
};

// The Out Soon filter's fixed horizon (see CONTEXT.md's "Out Soon Filter").
// Deliberately not user-configurable: 5 minutes mirrors TWSE's own
// chain-relevance horizon, so the two tools agree on what "soon" means.
export const OUT_SOON_THRESHOLD_SECONDS = 5 * 60;

export interface FactionFilterState {
  sortBy: "ff-asc" | "ff-desc" | "none";
  filterEnabled?: boolean;
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
    federal: boolean;
    fallen: boolean;
  };
  // War-only Out Soon checkbox (see CONTEXT.md's "Out Soon Filter").
  outSoon: boolean;
  levelMin: number | null;
  levelMax: number | null;
  ffMin: number | null;
  ffMax: number | null;
  statsMin: string | null;
  statsMax: string | null;
  lastActionMin: string | null;
  lastActionMax: string | null;
  hiddenColumns?: {
    level: boolean;
    status: boolean;
    score: boolean;
  };
  hiddenColumnsMobile?: {
    level: boolean;
    status: boolean;
    score: boolean;
  };
}

// The shape consumed by apply_filters_and_sort: same as FactionFilterState,
// minus the storage-only hiddenColumns fields, with statsMin/statsMax already
// parsed from their stored suffix-number strings (e.g. "1.5m") into numbers,
// and lastActionMin/lastActionMax similarly parsed from duration strings
// (e.g. "4h2m15s") into seconds.
export interface FactionFilterSnapshot {
  sortBy: FactionFilterState["sortBy"];
  filterEnabled?: boolean;
  activity: FactionFilterState["activity"];
  status: FactionFilterState["status"];
  outSoon: boolean;
  levelMin: number | null;
  levelMax: number | null;
  ffMin: number | null;
  ffMax: number | null;
  statsMin: number | null;
  statsMax: number | null;
  lastActionMinSec: number | null;
  lastActionMaxSec: number | null;
}

// Imperative interface exposed via ref and the __ffHandle container property.
export interface FactionFilterBoxHandle {
  setSortBy: (val: "ff-asc" | "ff-desc" | "none") => void;
  getFilterSnapshot: () => FactionFilterSnapshot;
  readonly sortBy: "ff-asc" | "ff-desc" | "none";
  readonly activity: FactionFilterState["activity"];
  readonly hasLastActionData: boolean;
  setHasLastActionData: (val: boolean) => void;
  readonly hasUntilData: boolean;
  setHasUntilData: (val: boolean) => void;
  // Used in feature tests to imperatively set filter state and fire onFilterChange.
  setFilterState: (patch: {
    status?: FactionFilterState["status"];
    activity?: FactionFilterState["activity"];
    outSoon?: boolean;
  }) => void;
  dispatchChange: () => void;
  readonly ready?: boolean;
}

type HiddenColumns = NonNullable<FactionFilterState["hiddenColumns"]>;

const DEFAULT_HIDDEN_COLUMNS: HiddenColumns = {
  level: false,
  status: false,
  score: false,
};

// Range fields default to null (no filtering) to match the original Lit
// component's @state initializers — DEFAULT_STATE.activity/status (all true)
// are the only fields reused for merges and resets.
export const DEFAULT_STATE: FactionFilterState = {
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
    fallen: true,
  },
  outSoon: true,
  levelMin: null,
  levelMax: null,
  ffMin: null,
  ffMax: null,
  statsMin: null,
  statsMax: null,
  lastActionMin: null,
  lastActionMax: null,
  hiddenColumns: DEFAULT_HIDDEN_COLUMNS,
};

// Reset leaves sort alone, as the original Lit control did.
const DEFAULT_FILTER_RESET: Partial<FactionFilterState> = {
  activity: { ...DEFAULT_STATE.activity },
  status: { ...DEFAULT_STATE.status },
  outSoon: DEFAULT_STATE.outSoon,
  levelMin: null,
  levelMax: null,
  ffMin: null,
  ffMax: null,
  statsMin: null,
  statsMax: null,
  lastActionMin: null,
  lastActionMax: null,
};

export function getFilterBoxHandle(
  el: Element | null | undefined,
): FactionFilterBoxHandle | null {
  if (!el) return null;
  return (
    (el as unknown as { __ffHandle?: FactionFilterBoxHandle }).__ffHandle ??
    null
  );
}

function buildFilterSnapshot(
  s: FactionFilterState,
  filteringDisabled: boolean,
  isWar: boolean,
  hasUntilData: boolean,
): FactionFilterSnapshot {
  return {
    sortBy: s.sortBy,
    filterEnabled: filteringDisabled ? false : s.filterEnabled,
    activity: s.activity,
    // War lists never contain fallen members and the Fallen checkbox is hidden
    // in war mode, so force it off there; otherwise its (unreachable) default
    // would keep the "all statuses unchecked → show everything" guard from
    // ever triggering when a war user clears the remaining boxes.
    status: isWar ? { ...s.status, fallen: false } : s.status,
    // Like fallen above, force outSoon off whenever its checkbox isn't
    // rendered (faction mode, or no data-until rows detected): a stored
    // "checked" would otherwise keep counting in the engine's all-statuses-
    // unchecked guard with no visible UI explaining it. The stored state
    // itself is left untouched so the box reappears checked if the data
    // returns.
    outSoon: isWar && hasUntilData ? s.outSoon : false,
    levelMin: s.levelMin,
    levelMax: s.levelMax,
    ffMin: s.ffMin,
    ffMax: s.ffMax,
    statsMin: s.statsMin ? parse_suffix_number(s.statsMin) : null,
    statsMax: s.statsMax ? parse_suffix_number(s.statsMax) : null,
    lastActionMinSec: s.lastActionMin
      ? parse_duration_to_seconds(s.lastActionMin)
      : null,
    lastActionMaxSec: s.lastActionMax
      ? parse_duration_to_seconds(s.lastActionMax)
      : null,
  };
}

function normalizeLoadedState(
  parsed: Partial<FactionFilterState> | null,
  isMobile: boolean,
): FactionFilterState {
  if (!parsed) {
    return {
      ...DEFAULT_STATE,
      hiddenColumns: {
        level: isMobile,
        status: DEFAULT_HIDDEN_COLUMNS.status,
        score: DEFAULT_HIDDEN_COLUMNS.score,
      },
    };
  }
  const savedSortBy = parsed.sortBy ?? "none";
  const hiddenColumns = isMobile
    ? {
        level: parsed.hiddenColumnsMobile?.level ?? true,
        status:
          parsed.hiddenColumnsMobile?.status ?? DEFAULT_HIDDEN_COLUMNS.status,
        score:
          parsed.hiddenColumnsMobile?.score ?? DEFAULT_HIDDEN_COLUMNS.score,
      }
    : {
        level: parsed.hiddenColumns?.level ?? DEFAULT_HIDDEN_COLUMNS.level,
        status: parsed.hiddenColumns?.status ?? DEFAULT_HIDDEN_COLUMNS.status,
        score: parsed.hiddenColumns?.score ?? DEFAULT_HIDDEN_COLUMNS.score,
      };
  return {
    sortBy:
      savedSortBy === "ff-asc" || savedSortBy === "ff-desc"
        ? savedSortBy
        : "none",
    filterEnabled: parsed.filterEnabled ?? true,
    activity: { ...DEFAULT_STATE.activity, ...parsed.activity },
    status: { ...DEFAULT_STATE.status, ...parsed.status },
    outSoon: parsed.outSoon ?? DEFAULT_STATE.outSoon,
    levelMin: parsed.levelMin ?? null,
    levelMax: parsed.levelMax ?? null,
    ffMin: parsed.ffMin ?? null,
    ffMax: parsed.ffMax ?? null,
    statsMin: parsed.statsMin ?? null,
    statsMax: parsed.statsMax ?? null,
    lastActionMin: parsed.lastActionMin ?? null,
    lastActionMax: parsed.lastActionMax ?? null,
    hiddenColumns,
  };
}

function getSavedCollapsed(isWar: boolean): boolean {
  return isWar
    ? ffconfig.war_filter_collapsed
    : ffconfig.faction_filter_collapsed;
}

function getSavedColDisplay(isWar: boolean): FactionsColDisplay {
  return isWar ? ffconfig.war_col_display : ffconfig.factions_col_display;
}

function getSavedFilterState(isWar: boolean) {
  return isWar ? ffconfig.war_filter_state : ffconfig.faction_filter_state;
}

function persistCollapsed(mode: "faction" | "war", collapsed: boolean) {
  if (mode === "war") {
    ffconfig.war_filter_collapsed = collapsed;
  } else {
    ffconfig.faction_filter_collapsed = collapsed;
  }
}

function persistColDisplay(
  mode: "faction" | "war",
  display: FactionsColDisplay,
) {
  if (mode === "war") {
    ffconfig.war_col_display = display;
  } else {
    ffconfig.factions_col_display = display;
  }
}

function persistFilterState(
  state: FactionFilterState,
  isWar: boolean,
  isMobile: boolean,
) {
  const existing = getSavedFilterState(isWar);
  const toSave = buildStateToSave(state, existing, isMobile);
  if (isWar) {
    ffconfig.war_filter_state = toSave;
  } else {
    ffconfig.faction_filter_state = toSave;
  }
}

function buildStateToSave(
  state: FactionFilterState,
  existing: Partial<FactionFilterState> | null,
  isMobile: boolean,
): FactionFilterState {
  const savedHiddenColumns = existing?.hiddenColumns;
  const savedHiddenColumnsMobile = existing?.hiddenColumnsMobile;
  const hiddenColumnsToSave = isMobile
    ? (savedHiddenColumns ?? DEFAULT_HIDDEN_COLUMNS)
    : (state.hiddenColumns ?? DEFAULT_HIDDEN_COLUMNS);
  const hiddenColumnsMobileToSave = isMobile
    ? (state.hiddenColumns ?? DEFAULT_HIDDEN_COLUMNS)
    : (savedHiddenColumnsMobile ?? {
        level: true,
        status: false,
        score: false,
      });
  return {
    ...state,
    hiddenColumns: hiddenColumnsToSave,
    hiddenColumnsMobile: hiddenColumnsMobileToSave,
  };
}

function applyHiddenColumnAttributes(
  root: HTMLDetailsElement | null,
  hiddenColumns: HiddenColumns,
) {
  const target = root?.closest(".faction-war");
  if (!(target instanceof HTMLElement)) return;
  for (const [col, isHidden] of Object.entries(hiddenColumns)) {
    if (isHidden) {
      target.setAttribute(`data-ffscouter-hide-${col}`, "true");
    } else {
      target.removeAttribute(`data-ffscouter-hide-${col}`);
    }
  }
}

function watchFilterBoxEvents(
  modeRef: { current: "faction" | "war" },
  wasMobileRef: { current: boolean },
  reload: () => void,
  onColDisplayChange: (value: FactionsColDisplay) => void,
): () => void {
  const onConfigUpdated = () => {
    onColDisplayChange(
      modeRef.current === "war"
        ? ffconfig.war_col_display
        : ffconfig.factions_col_display,
    );
  };
  const onResize = () => {
    const isMobile = is_narrow_layout();
    if (isMobile !== wasMobileRef.current) {
      wasMobileRef.current = isMobile;
      reload();
    }
  };
  window.addEventListener("ff-config-updated", onConfigUpdated);
  window.addEventListener("resize", onResize);
  return () => {
    window.removeEventListener("ff-config-updated", onConfigUpdated);
    window.removeEventListener("resize", onResize);
  };
}

function openActivityComparison(root: HTMLDetailsElement | null) {
  const container = root?.closest(".faction-war");
  const links = container
    ? (Array.from(
        container.querySelectorAll('a[href*="step=profile"]'),
      ) as HTMLAnchorElement[])
    : [];

  const seen = new Set<string>();
  const ids: string[] = [];

  const tryExtract = (link: HTMLAnchorElement) => {
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
      document.querySelectorAll('a[href*="step=profile"]'),
    ) as HTMLAnchorElement[];
    for (const link of docLinks) tryExtract(link);
  }

  if (ids.length < 2) {
    console.warn("Could not find faction IDs to compare activity.");
    return;
  }

  const now = new Date();
  const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const formatUTC = (d: Date) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const h = String(d.getUTCHours()).padStart(2, "0");
    const min = String(d.getUTCMinutes()).padStart(2, "0");
    return `${y}-${m}-${day}T${h}:${min}`;
  };

  const factionId1 = ids[0];
  const factionId2 = ids[1];
  const scouterUrl = `https://ffscouter.com/faction-activity-comparison?faction_id_1=${factionId1}&faction_id_2=${factionId2}&start_at=${encodeURIComponent(formatUTC(start))}&end_at=${encodeURIComponent(formatUTC(now))}&bucket_minutes=60`;
  window.open(scouterUrl, "_blank");
}

type FilterBoxHandleDeps = {
  applyStatePatch: (patch: Partial<FactionFilterState>) => void;
  getFilterSnapshot: () => FactionFilterSnapshot;
  dispatchChange: () => void;
  executeChangeImmediately: () => void;
  filterStateRef: { current: FactionFilterState };
  hasLastActionDataRef: { current: boolean };
  hasUntilDataRef: { current: boolean };
  setHasLastActionData: (val: boolean) => void;
  setHasUntilData: (val: boolean) => void;
};

function createFilterBoxHandle({
  applyStatePatch,
  getFilterSnapshot,
  dispatchChange,
  executeChangeImmediately,
  filterStateRef,
  hasLastActionDataRef,
  hasUntilDataRef,
  setHasLastActionData,
  setHasUntilData,
}: FilterBoxHandleDeps): FactionFilterBoxHandle {
  return {
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
    get hasUntilData() {
      return hasUntilDataRef.current;
    },
    setHasUntilData(val) {
      hasUntilDataRef.current = val;
      setHasUntilData(val);
    },
    setFilterState(patch) {
      applyStatePatch(patch);
      // Immediately fire onFilterChange using the freshly patched ref
      dispatchChange();
    },
    dispatchChange,
    get ready() {
      return true;
    },
  };
}

// ── Presentational subcomponents ─────────────────────────────────────────────

function FilterHeaderActions({
  filterEnabled,
  onToggleFilter,
  onResetFilters,
}: {
  filterEnabled?: boolean;
  onToggleFilter: (e: React.MouseEvent) => void;
  onResetFilters: (e: React.MouseEvent) => void;
}) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: click-stop propagation on a decorative grouping div
    <div
      className={cls.headerActions}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <button
        type="button"
        className={`${cls.actionBtn} ${filterEnabled ? cls.actionBtnActive : cls.actionBtnInactive}`}
        title={filterEnabled ? "Turn off filtering" : "Turn on filtering"}
        onClick={onToggleFilter}
      >
        {filterEnabled ? (
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.124.318l-4.5 5.5v4.682a.5.5 0 0 1-.168.373l-2.5 2a.5.5 0 0 1-.832-.373v-6.682l-4.5-5.5A.5.5 0 0 1 1.5 3.5v-2z" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.124.318l-4.5 5.5v4.682a.5.5 0 0 1-.168.373l-2.5 2a.5.5 0 0 1-.832-.373v-6.682l-4.5-5.5A.5.5 0 0 1 1.5 3.5v-2z" />
            <line
              x1="1.5"
              y1="14.5"
              x2="14.5"
              y2="1.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        )}
      </button>
      <button
        type="button"
        className={`${cls.actionBtn} ${cls.actionBtnReset}`}
        title="Reset filters to default"
        onClick={onResetFilters}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"
          />
          <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
        </svg>
      </button>
    </div>
  );
}

function SortDisplayGroup({
  mode,
  sortBy,
  colDisplay,
  onSortToggle,
  onDisplayChange,
  onCompareActivity,
}: {
  mode: "faction" | "war";
  sortBy: FactionFilterState["sortBy"];
  colDisplay: FactionsColDisplay;
  onSortToggle: () => void;
  onDisplayChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onCompareActivity: () => void;
}) {
  const sortText =
    colDisplay === FactionsColDisplay.BATTLE_STATS ? "Stats" : "FF";
  return (
    <div className={`${cls.group} ${cls.groupSort}`}>
      <strong>Sort &amp; Display</strong>
      <div className={cls.sortControls}>
        <button
          type="button"
          id="sort-toggle-btn"
          className={cls.sortBtn}
          onClick={onSortToggle}
        >
          {sortBy === "none"
            ? "Sort: Default"
            : sortBy === "ff-asc"
              ? `Sort: ${sortText} ▲`
              : `Sort: ${sortText} ▼`}
        </button>
        <select
          id={
            mode === "war"
              ? "war-col-display-filter"
              : "factions-col-display-filter"
          }
          value={colDisplay}
          onChange={onDisplayChange}
          className={cls.displaySelect}
          aria-label="Column to display"
        >
          <option value="fair_fight">Show: FF Score</option>
          <option value="battle_stats">Show: BS Estimate</option>
          <option value="none">Show: None (Hide)</option>
        </select>
        {mode === "war" && (
          <button
            type="button"
            id="compare-faction-activity-btn"
            className={cls.compareBtn}
            onClick={onCompareActivity}
          >
            Compare Activity
          </button>
        )}
      </div>
    </div>
  );
}

function ActivityGroup({
  activity,
  onActivityChange,
}: {
  activity: FactionFilterState["activity"];
  onActivityChange: (
    key: keyof FactionFilterState["activity"],
    val: boolean,
  ) => void;
}) {
  return (
    <div className={`${cls.group} ${cls.groupActivity}`}>
      <strong>Activity</strong>
      <div className={cls.options}>
        {(
          [
            ["online", "Online"],
            ["idle", "Idle"],
            ["offline", "Offline"],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={activity[key]}
              onChange={(e) => onActivityChange(key, e.target.checked)}
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}

function StatusGroup({
  mode,
  status,
  outSoon,
  hasUntilData,
  onStatusChange,
  onOutSoonChange,
}: {
  mode: "faction" | "war";
  status: FactionFilterState["status"];
  outSoon: boolean;
  hasUntilData: boolean;
  onStatusChange: (
    key: keyof FactionFilterState["status"],
    val: boolean,
  ) => void;
  onOutSoonChange: (val: boolean) => void;
}) {
  return (
    <div className={`${cls.group} ${cls.groupStatus}`}>
      <strong>Status</strong>
      <div className={cls.options}>
        {(
          [
            ["okay", "Okay"],
            ["hospital", "Hospital"],
            ["jail", "Jail"],
            ["abroad", "Abroad"],
            ["traveling", "Traveling"],
            ["federal", "Fedded"],
            ["fallen", "Fallen"],
          ] as const
        )
          // Fallen members never appear in war member lists, so the Fallen
          // option is only meaningful (and only shown) in faction mode.
          .filter(([key]) => mode !== "war" || key !== "fallen")
          .flatMap(([key, label]) => {
            const items = [
              <label key={key}>
                <input
                  type="checkbox"
                  checked={status[key]}
                  onChange={(e) => onStatusChange(key, e.target.checked)}
                />
                {label}
              </label>,
            ];
            // Out Soon rides under Hospital even though it also covers
            // jail — a second indented copy under Jail would be clutter
            // for a marginal case. War-only, and only when a war-box row
            // actually carries TWSE's data-until attribute.
            if (key === "hospital" && mode === "war" && hasUntilData) {
              items.push(
                <label key="out-soon" className={cls.optionOutSoon}>
                  <input
                    type="checkbox"
                    checked={outSoon}
                    onChange={(e) => onOutSoonChange(e.target.checked)}
                  />
                  Out soon
                </label>,
              );
            }
            return items;
          })}
      </div>
    </div>
  );
}

function RangeGroup({
  className,
  title,
  inputType,
  step,
  inputTitle,
  minLabel,
  maxLabel,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
}: {
  className?: string;
  title: string;
  inputType: "number" | "text";
  step?: string;
  inputTitle?: string;
  minLabel: string;
  maxLabel: string;
  minValue: string;
  maxValue: string;
  onMinChange: (val: string) => void;
  onMaxChange: (val: string) => void;
}) {
  const id = useId();
  const minId = `${id}-min`;
  const maxId = `${id}-max`;
  return (
    <div className={`${cls.group} ${className}`}>
      <strong>{title}</strong>
      <div className={cls.rangeInputs}>
        <label htmlFor={minId} className={cls.srOnly}>
          {minLabel}
        </label>
        <input
          id={minId}
          type={inputType}
          step={step}
          placeholder="Min"
          title={inputTitle}
          value={minValue}
          onChange={(e) => onMinChange(e.target.value)}
        />
        <span>to</span>
        <label htmlFor={maxId} className={cls.srOnly}>
          {maxLabel}
        </label>
        <input
          id={maxId}
          type={inputType}
          step={step}
          placeholder="Max"
          title={inputTitle}
          value={maxValue}
          onChange={(e) => onMaxChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function ColumnsGroup({
  hiddenColumns,
  onColumnVisibilityChange,
}: {
  hiddenColumns?: HiddenColumns;
  onColumnVisibilityChange: (key: keyof HiddenColumns, val: boolean) => void;
}) {
  const cols = hiddenColumns ?? DEFAULT_HIDDEN_COLUMNS;
  return (
    <div className={`${cls.group} ${cls.groupColumns}`}>
      <strong>Visible Columns</strong>
      <div className={cls.options}>
        {(
          [
            ["level", "Level"],
            ["status", "Status"],
            ["score", "Score"],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={!cols[key]}
              onChange={(e) => onColumnVisibilityChange(key, !e.target.checked)}
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}

function FilterBoxLayout({
  rootRef,
  mode,
  collapsed,
  filterState,
  colDisplay,
  hasUntilData,
  hasLastActionData,
  onToggle,
  onToggleFilter,
  onResetFilters,
  onSortToggle,
  onDisplayChange,
  onCompareActivity,
  onActivityChange,
  onStatusChange,
  onOutSoonChange,
  onLevelChange,
  onFFChange,
  onStatsChange,
  onLastActionChange,
  onColumnVisibilityChange,
}: {
  rootRef: React.RefObject<HTMLDetailsElement | null>;
  mode: "faction" | "war";
  collapsed: boolean;
  filterState: FactionFilterState;
  colDisplay: FactionsColDisplay;
  hasUntilData: boolean;
  hasLastActionData: boolean;
  onToggle: (e: React.SyntheticEvent<HTMLDetailsElement>) => void;
  onToggleFilter: (e: React.MouseEvent) => void;
  onResetFilters: (e: React.MouseEvent) => void;
  onSortToggle: () => void;
  onDisplayChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onCompareActivity: () => void;
  onActivityChange: (
    key: keyof FactionFilterState["activity"],
    val: boolean,
  ) => void;
  onStatusChange: (
    key: keyof FactionFilterState["status"],
    val: boolean,
  ) => void;
  onOutSoonChange: (val: boolean) => void;
  onLevelChange: (type: "min" | "max", valStr: string) => void;
  onFFChange: (type: "min" | "max", valStr: string) => void;
  onStatsChange: (type: "min" | "max", valStr: string) => void;
  onLastActionChange: (type: "min" | "max", valStr: string) => void;
  onColumnVisibilityChange: (key: keyof HiddenColumns, val: boolean) => void;
}) {
  const s = filterState;
  return (
    <details
      ref={rootRef}
      className={`${cls.box}${mode === "war" ? ` ${cls.boxNoBorders}` : ""}`}
      open={!collapsed}
      onToggle={onToggle}
    >
      <summary>
        <div className={cls.header}>
          <span>FFScouter Filter &amp; Sort Controls</span>
          <FilterHeaderActions
            filterEnabled={s.filterEnabled}
            onToggleFilter={onToggleFilter}
            onResetFilters={onResetFilters}
          />
        </div>
      </summary>

      <div className={cls.grid}>
        <SortDisplayGroup
          mode={mode}
          sortBy={s.sortBy}
          colDisplay={colDisplay}
          onSortToggle={onSortToggle}
          onDisplayChange={onDisplayChange}
          onCompareActivity={onCompareActivity}
        />

        <ActivityGroup
          activity={s.activity}
          onActivityChange={onActivityChange}
        />

        <StatusGroup
          mode={mode}
          status={s.status}
          outSoon={s.outSoon}
          hasUntilData={hasUntilData}
          onStatusChange={onStatusChange}
          onOutSoonChange={onOutSoonChange}
        />

        <RangeGroup
          className={cls.groupLevel}
          title="Level Range"
          inputType="number"
          minLabel="Minimum level"
          maxLabel="Maximum level"
          minValue={s.levelMin !== null ? String(s.levelMin) : ""}
          maxValue={s.levelMax !== null ? String(s.levelMax) : ""}
          onMinChange={(val) => onLevelChange("min", val)}
          onMaxChange={(val) => onLevelChange("max", val)}
        />

        <RangeGroup
          className={cls.groupFf}
          title="FF Range"
          inputType="number"
          step="0.1"
          minLabel="Minimum fair fight score"
          maxLabel="Maximum fair fight score"
          minValue={s.ffMin !== null ? String(s.ffMin) : ""}
          maxValue={s.ffMax !== null ? String(s.ffMax) : ""}
          onMinChange={(val) => onFFChange("min", val)}
          onMaxChange={(val) => onFFChange("max", val)}
        />

        <RangeGroup
          className={cls.groupStats}
          title="Stats Range"
          inputType="text"
          minLabel="Minimum battle stats"
          maxLabel="Maximum battle stats"
          minValue={s.statsMin !== null ? s.statsMin : ""}
          maxValue={s.statsMax !== null ? s.statsMax : ""}
          onMinChange={(val) => onStatsChange("min", val)}
          onMaxChange={(val) => onStatsChange("max", val)}
        />

        {mode === "war" && hasLastActionData && (
          <RangeGroup
            className={cls.groupLastAction}
            title="Last Action Range"
            inputType="text"
            inputTitle='e.g. "10m", "1h", "4h2m15s"'
            minLabel="Minimum last action"
            maxLabel="Maximum last action"
            minValue={s.lastActionMin !== null ? s.lastActionMin : ""}
            maxValue={s.lastActionMax !== null ? s.lastActionMax : ""}
            onMinChange={(val) => onLastActionChange("min", val)}
            onMaxChange={(val) => onLastActionChange("max", val)}
          />
        )}

        {mode === "war" && (
          <ColumnsGroup
            hiddenColumns={s.hiddenColumns}
            onColumnVisibilityChange={onColumnVisibilityChange}
          />
        )}
      </div>
    </details>
  );
}

type Props = {
  mode: "faction" | "war";
  onFilterChange: (snapshot: FactionFilterSnapshot) => void;
  ref?: Ref<FactionFilterBoxHandle | null>;
  initialHasLastActionData?: boolean;
  initialHasUntilData?: boolean;
  // Set when the Settings-panel "Show ... filter box" toggle for this mode is
  // off. Every snapshot then reports filterEnabled: false (riding the engine's
  // existing filterEnabled short-circuit) while the stored filter state is left
  // untouched, so re-enabling in Settings restores the user's prior filters.
  // Sort still applies — the box stays mounted (hidden) so header-click sort
  // keeps working.
  filteringDisabled?: boolean;
  // Fired once, at the end of the mount effect (after loadState's initial
  // onFilterChange). The mount owner uses this to replay buffered imperative
  // calls so they aren't clobbered by the initial loadState dispatch.
  onReady?: () => void;
};

export function FFFactionFilterBox({
  mode,
  onFilterChange,
  ref,
  initialHasLastActionData = false,
  initialHasUntilData = false,
  filteringDisabled = false,
  onReady,
}: Props) {
  const [filterState, setFilterState] =
    useState<FactionFilterState>(DEFAULT_STATE);
  // Seed collapse synchronously: a correction in the mount effect forces an
  // open→closed flip whose `toggle` event races onToggle's write-back in real
  // browsers. See docs/adr/0004-filter-collapse-sync-init.md.
  const [collapsed, setCollapsed] = useState(() =>
    getSavedCollapsed(mode === "war"),
  );
  const [colDisplay, setColDisplay] = useState(FactionsColDisplay.FAIR_FIGHT);
  const [hasLastActionData, setHasLastActionData] = useState(
    initialHasLastActionData,
  );
  const [hasUntilData, setHasUntilData] = useState(initialHasUntilData);

  // Refs for async-safe access from debounce callbacks and the imperative handle.
  // State-backed refs are written at their update sites (applyStatePatch,
  // loadState and the imperative setters) so they never lag a render; props are
  // mirrored in an effect to keep render pure.
  const filterStateRef = useRef(filterState);
  const collapsedRef = useRef(collapsed);
  const hasLastActionDataRef = useRef(hasLastActionData);
  const hasUntilDataRef = useRef(hasUntilData);
  const modeRef = useRef(mode);
  const filteringDisabledRef = useRef(filteringDisabled);
  const onFilterChangeRef = useRef(onFilterChange);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    modeRef.current = mode;
    filteringDisabledRef.current = filteringDisabled;
    onFilterChangeRef.current = onFilterChange;
    onReadyRef.current = onReady;
  }, [mode, filteringDisabled, onFilterChange, onReady]);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [initialWasMobile] = useState(() => is_narrow_layout());
  const wasMobileRef = useRef(initialWasMobile);
  const rootRef = useRef<HTMLDetailsElement>(null);

  // Patch both the ref (immediate) and React state (async render).
  const applyStatePatch = (patch: Partial<FactionFilterState>) => {
    const next = { ...filterStateRef.current, ...patch };
    filterStateRef.current = next;
    setFilterState(next);
  };

  const getFilterSnapshot = () =>
    buildFilterSnapshot(
      filterStateRef.current,
      filteringDisabledRef.current,
      modeRef.current === "war",
      hasUntilDataRef.current,
    );

  const dispatchChange = () => {
    onFilterChangeRef.current(getFilterSnapshot());
  };

  const saveState = (state: FactionFilterState) => {
    persistFilterState(state, modeRef.current === "war", is_narrow_layout());
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
    const newCollapsed = getSavedCollapsed(isWar);
    collapsedRef.current = newCollapsed;
    setCollapsed(newCollapsed);
    setColDisplay(getSavedColDisplay(isWar));
    const next = normalizeLoadedState(
      getSavedFilterState(isWar),
      is_narrow_layout(),
    );
    filterStateRef.current = next;
    setFilterState(next);
    // Dispatch initial state once loaded
    onFilterChangeRef.current(getFilterSnapshot());
  };

  // Mount: load state from ffconfig and wire up window events.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only effect; all reads go through refs
  useEffect(() => {
    loadState();
    const cleanupEvents = watchFilterBoxEvents(
      modeRef,
      wasMobileRef,
      loadState,
      setColDisplay,
    );
    // Signal readiness after loadState's initial dispatch so the mount owner
    // can replay any buffered imperative calls on top of the loaded state.
    onReadyRef.current?.();
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      cleanupEvents();
    };
  }, []);

  // Update data-ffscouter-hide-* attributes on the .faction-war container.
  useEffect(() => {
    if (mode !== "war") return;
    applyHiddenColumnAttributes(
      rootRef.current,
      filterState.hiddenColumns ?? DEFAULT_HIDDEN_COLUMNS,
    );
  }, [filterState.hiddenColumns, mode]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refs are always current; empty dep array is intentional
  useImperativeHandle(
    ref,
    () =>
      createFilterBoxHandle({
        applyStatePatch,
        getFilterSnapshot,
        dispatchChange,
        executeChangeImmediately,
        filterStateRef,
        hasLastActionDataRef,
        hasUntilDataRef,
        setHasLastActionData,
        setHasUntilData,
      }),
    [],
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  const onToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    const newCollapsed = !e.currentTarget.open;
    // Ignore echo toggles: a programmatic `open` change always matches our
    // current intent, while a genuine user gesture flips away from it. Guards
    // against persisting a spurious mount/reload toggle. See ADR 0004.
    if (newCollapsed === collapsedRef.current) return;
    collapsedRef.current = newCollapsed;
    setCollapsed(newCollapsed);
    persistCollapsed(mode, newCollapsed);
  };

  const onSortToggle = () => {
    const next =
      filterStateRef.current.sortBy === "none"
        ? "ff-desc"
        : filterStateRef.current.sortBy === "ff-desc"
          ? "ff-asc"
          : "none";
    applyStatePatch({ sortBy: next });
    executeChangeImmediately();
  };

  const onDisplayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as FactionsColDisplay;
    setColDisplay(val);
    persistColDisplay(mode, val);
    window.dispatchEvent(new CustomEvent("ff-config-updated"));
    executeChangeImmediately();
  };

  const onToggleFilter = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    applyStatePatch({ filterEnabled: !filterStateRef.current.filterEnabled });
    executeChangeImmediately();
  };

  const onResetFilters = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    applyStatePatch(DEFAULT_FILTER_RESET);
    executeChangeImmediately();
  };

  const onActivityChange = (
    key: keyof FactionFilterState["activity"],
    val: boolean,
  ) => {
    applyStatePatch({
      activity: { ...filterStateRef.current.activity, [key]: val },
    });
    executeChangeImmediately();
  };

  const onStatusChange = (
    key: keyof FactionFilterState["status"],
    val: boolean,
  ) => {
    applyStatePatch({
      status: { ...filterStateRef.current.status, [key]: val },
    });
    executeChangeImmediately();
  };

  const onOutSoonChange = (val: boolean) => {
    applyStatePatch({ outSoon: val });
    executeChangeImmediately();
  };

  const onLevelChange = (type: "min" | "max", valStr: string) => {
    const val = valStr === "" ? null : Number.parseInt(valStr, 10);
    applyStatePatch(type === "min" ? { levelMin: val } : { levelMax: val });
    queueChange();
  };

  const onFFChange = (type: "min" | "max", valStr: string) => {
    const val = valStr === "" ? null : Number.parseFloat(valStr);
    applyStatePatch(type === "min" ? { ffMin: val } : { ffMax: val });
    queueChange();
  };

  const onStatsChange = (type: "min" | "max", valStr: string) => {
    const val = valStr.trim() === "" ? null : valStr;
    applyStatePatch(type === "min" ? { statsMin: val } : { statsMax: val });
    queueChange();
  };

  const onLastActionChange = (type: "min" | "max", valStr: string) => {
    const val = valStr.trim() === "" ? null : valStr;
    applyStatePatch(
      type === "min" ? { lastActionMin: val } : { lastActionMax: val },
    );
    queueChange();
  };

  const onColumnVisibilityChange = (key: keyof HiddenColumns, val: boolean) => {
    applyStatePatch({
      hiddenColumns: {
        ...(filterStateRef.current.hiddenColumns ?? DEFAULT_HIDDEN_COLUMNS),
        [key]: val,
      },
    });
    executeChangeImmediately();
  };

  const onCompareActivity = () => {
    openActivityComparison(rootRef.current);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <FilterBoxLayout
      rootRef={rootRef}
      mode={mode}
      collapsed={collapsed}
      filterState={filterState}
      colDisplay={colDisplay}
      hasUntilData={hasUntilData}
      hasLastActionData={hasLastActionData}
      onToggle={onToggle}
      onToggleFilter={onToggleFilter}
      onResetFilters={onResetFilters}
      onSortToggle={onSortToggle}
      onDisplayChange={onDisplayChange}
      onCompareActivity={onCompareActivity}
      onActivityChange={onActivityChange}
      onStatusChange={onStatusChange}
      onOutSoonChange={onOutSoonChange}
      onLevelChange={onLevelChange}
      onFFChange={onFFChange}
      onStatsChange={onStatsChange}
      onLastActionChange={onLastActionChange}
      onColumnVisibilityChange={onColumnVisibilityChange}
    />
  );
}
