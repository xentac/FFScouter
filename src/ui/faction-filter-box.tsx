import { FactionsColDisplay, ffconfig } from "@utils/ffconfig";
import { parse_duration_to_seconds, parse_suffix_number } from "@utils/strings";
import {
  type Ref,
  useEffect,
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
  rangeInputs: styles["ff-filter-box__range-inputs"],
};

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
  // Used in feature tests to imperatively set filter state and fire onFilterChange.
  setFilterState: (patch: {
    status?: FactionFilterState["status"];
    activity?: FactionFilterState["activity"];
  }) => void;
  dispatchChange: () => void;
  readonly ready?: boolean;
}

const DEFAULT_HIDDEN_COLUMNS = { level: false, status: false, score: false };

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

export function getFilterBoxHandle(
  el: Element | null | undefined,
): FactionFilterBoxHandle | null {
  if (!el) return null;
  return (
    (el as unknown as { __ffHandle?: FactionFilterBoxHandle }).__ffHandle ??
    null
  );
}

function isMobileView(): boolean {
  return typeof window !== "undefined" && window.innerWidth < 784;
}

type Props = {
  mode: "faction" | "war";
  onFilterChange: (snapshot: FactionFilterSnapshot) => void;
  ref?: Ref<FactionFilterBoxHandle | null>;
  initialHasLastActionData?: boolean;
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
  onReady,
}: Props) {
  const [filterState, setFilterState] = useState<FactionFilterState>(
    () => DEFAULT_STATE,
  );
  const [collapsed, setCollapsed] = useState(false);
  const [colDisplay, setColDisplay] = useState<FactionsColDisplay>(
    FactionsColDisplay.FAIR_FIGHT,
  );
  const [hasLastActionData, setHasLastActionData] = useState(
    initialHasLastActionData,
  );

  // Refs for async-safe access from debounce callbacks and the imperative handle.
  const filterStateRef = useRef(filterState);
  filterStateRef.current = filterState;
  const hasLastActionDataRef = useRef(hasLastActionData);
  hasLastActionDataRef.current = hasLastActionData;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const onFilterChangeRef = useRef(onFilterChange);
  onFilterChangeRef.current = onFilterChange;

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasMobileRef = useRef(isMobileView());
  const rootRef = useRef<HTMLDetailsElement>(null);

  // Patch both the ref (immediate) and React state (async render).
  const applyStatePatch = (patch: Partial<FactionFilterState>) => {
    const next = { ...filterStateRef.current, ...patch };
    filterStateRef.current = next;
    setFilterState(next);
  };

  const getFilterSnapshot = (): FactionFilterSnapshot => {
    const s = filterStateRef.current;
    return {
      sortBy: s.sortBy,
      filterEnabled: s.filterEnabled,
      activity: s.activity,
      status: s.status,
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
  };

  const dispatchChange = () => {
    onFilterChangeRef.current(getFilterSnapshot());
  };

  const saveState = (state: FactionFilterState) => {
    const isWar = modeRef.current === "war";
    const isMobile = isMobileView();
    const existing = isWar
      ? ffconfig.war_filter_state
      : ffconfig.faction_filter_state;
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

    const toSave: FactionFilterState = {
      ...state,
      hiddenColumns: hiddenColumnsToSave,
      hiddenColumnsMobile: hiddenColumnsMobileToSave,
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
    const newCollapsed = isWar
      ? ffconfig.war_filter_collapsed
      : ffconfig.faction_filter_collapsed;
    setCollapsed(newCollapsed);
    setColDisplay(
      isWar ? ffconfig.war_col_display : ffconfig.factions_col_display,
    );

    const parsed = isWar
      ? ffconfig.war_filter_state
      : ffconfig.faction_filter_state;

    let next: FactionFilterState;
    if (parsed) {
      const savedSortBy = parsed.sortBy ?? "none";
      const hiddenColumns = isMobile
        ? {
            level: parsed.hiddenColumnsMobile?.level ?? true,
            status:
              parsed.hiddenColumnsMobile?.status ??
              DEFAULT_HIDDEN_COLUMNS.status,
            score:
              parsed.hiddenColumnsMobile?.score ?? DEFAULT_HIDDEN_COLUMNS.score,
          }
        : {
            level: parsed.hiddenColumns?.level ?? DEFAULT_HIDDEN_COLUMNS.level,
            status:
              parsed.hiddenColumns?.status ?? DEFAULT_HIDDEN_COLUMNS.status,
            score: parsed.hiddenColumns?.score ?? DEFAULT_HIDDEN_COLUMNS.score,
          };
      next = {
        sortBy:
          savedSortBy === "ff-asc" || savedSortBy === "ff-desc"
            ? savedSortBy
            : "none",
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
        hiddenColumns,
      };
    } else {
      next = {
        ...DEFAULT_STATE,
        hiddenColumns: {
          level: isMobile,
          status: DEFAULT_HIDDEN_COLUMNS.status,
          score: DEFAULT_HIDDEN_COLUMNS.score,
        },
      };
    }
    filterStateRef.current = next;
    setFilterState(next);
    // Dispatch initial state once loaded
    onFilterChangeRef.current(getFilterSnapshot());
  };

  // Mount: load state from ffconfig and wire up window events.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only effect; all reads go through refs
  useEffect(() => {
    loadState();

    const onConfigUpdated = () => {
      setColDisplay(
        modeRef.current === "war"
          ? ffconfig.war_col_display
          : ffconfig.factions_col_display,
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

    // Signal readiness after loadState's initial dispatch so the mount owner
    // can replay any buffered imperative calls on top of the loaded state.
    onReady?.();

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      window.removeEventListener("ff-config-updated", onConfigUpdated);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Update data-ffscouter-hide-* attributes on the .faction-war container.
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: refs are always current; empty dep array is intentional
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
        // Immediately fire onFilterChange using the freshly patched ref
        dispatchChange();
      },
      dispatchChange,
      get ready() {
        return true;
      },
    }),
    [],
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  const onToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    const newCollapsed = !e.currentTarget.open;
    setCollapsed(newCollapsed);
    if (mode === "war") {
      ffconfig.war_filter_collapsed = newCollapsed;
    } else {
      ffconfig.faction_filter_collapsed = newCollapsed;
    }
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
    if (mode === "war") {
      ffconfig.war_col_display = val;
    } else {
      ffconfig.factions_col_display = val;
    }
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
    applyStatePatch({
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
      levelMin: null,
      levelMax: null,
      ffMin: null,
      ffMax: null,
      statsMin: null,
      statsMax: null,
      lastActionMin: null,
      lastActionMax: null,
    });
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

  const onColumnVisibilityChange = (
    key: keyof NonNullable<FactionFilterState["hiddenColumns"]>,
    val: boolean,
  ) => {
    applyStatePatch({
      hiddenColumns: {
        ...(filterStateRef.current.hiddenColumns ?? DEFAULT_HIDDEN_COLUMNS),
        [key]: val,
      },
    });
    executeChangeImmediately();
  };

  const onCompareActivity = () => {
    const container = rootRef.current?.closest(".faction-war");
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
    const scouterUrl = `https://ffscouter.com/faction-activity-comparison?faction_id_1=${factionId1}&faction_id_2=${factionId2}&start_at=${encodeURIComponent(formatUTC(start))}&end_at=${encodeURIComponent(formatUTC(now))}&bucket_minutes=5`;
    window.open(scouterUrl, "_blank");
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const s = filterState;
  const hiddenColumns = s.hiddenColumns ?? DEFAULT_HIDDEN_COLUMNS;
  const isEst = colDisplay === FactionsColDisplay.BATTLE_STATS;
  const sortText = isEst ? "Stats" : "FF";

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
          {/* biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: click-stop propagation on a decorative grouping div */}
          <div
            className={cls.headerActions}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <button
              type="button"
              className={`${cls.actionBtn} ${s.filterEnabled ? cls.actionBtnActive : cls.actionBtnInactive}`}
              title={
                s.filterEnabled ? "Turn off filtering" : "Turn on filtering"
              }
              onClick={onToggleFilter}
            >
              {s.filterEnabled ? (
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
        </div>
      </summary>

      <div className={cls.grid}>
        <div className={`${cls.group} ${cls.groupSort}`}>
          <strong>Sort &amp; Display</strong>
          <div className={cls.sortControls}>
            <button
              type="button"
              id="sort-toggle-btn"
              className={cls.sortBtn}
              onClick={onSortToggle}
            >
              {s.sortBy === "none"
                ? "Sort: Default"
                : s.sortBy === "ff-asc"
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
                  checked={s.activity[key]}
                  onChange={(e) => onActivityChange(key, e.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

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
            ).map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={s.status[key]}
                  onChange={(e) => onStatusChange(key, e.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className={`${cls.group} ${cls.groupLevel}`}>
          <strong>Level Range</strong>
          <div className={cls.rangeInputs}>
            <input
              type="number"
              placeholder="Min"
              value={s.levelMin !== null ? String(s.levelMin) : ""}
              onChange={(e) => onLevelChange("min", e.target.value)}
            />
            <span>to</span>
            <input
              type="number"
              placeholder="Max"
              value={s.levelMax !== null ? String(s.levelMax) : ""}
              onChange={(e) => onLevelChange("max", e.target.value)}
            />
          </div>
        </div>

        <div className={`${cls.group} ${cls.groupFf}`}>
          <strong>FF Range</strong>
          <div className={cls.rangeInputs}>
            <input
              type="number"
              step="0.1"
              placeholder="Min"
              value={s.ffMin !== null ? String(s.ffMin) : ""}
              onChange={(e) => onFFChange("min", e.target.value)}
            />
            <span>to</span>
            <input
              type="number"
              step="0.1"
              placeholder="Max"
              value={s.ffMax !== null ? String(s.ffMax) : ""}
              onChange={(e) => onFFChange("max", e.target.value)}
            />
          </div>
        </div>

        <div className={`${cls.group} ${cls.groupStats}`}>
          <strong>Stats Range</strong>
          <div className={cls.rangeInputs}>
            <input
              type="text"
              placeholder="Min"
              value={s.statsMin !== null ? s.statsMin : ""}
              onChange={(e) => onStatsChange("min", e.target.value)}
            />
            <span>to</span>
            <input
              type="text"
              placeholder="Max"
              value={s.statsMax !== null ? s.statsMax : ""}
              onChange={(e) => onStatsChange("max", e.target.value)}
            />
          </div>
        </div>

        {mode === "war" && hasLastActionData && (
          <div className={`${cls.group} ${cls.groupLastAction}`}>
            <strong>Last Action Range</strong>
            <div className={cls.rangeInputs}>
              <input
                type="text"
                placeholder="Min"
                title='e.g. "10m", "1h", "4h2m15s"'
                value={s.lastActionMin !== null ? s.lastActionMin : ""}
                onChange={(e) => onLastActionChange("min", e.target.value)}
              />
              <span>to</span>
              <input
                type="text"
                placeholder="Max"
                title='e.g. "10m", "1h", "4h2m15s"'
                value={s.lastActionMax !== null ? s.lastActionMax : ""}
                onChange={(e) => onLastActionChange("max", e.target.value)}
              />
            </div>
          </div>
        )}

        {mode === "war" && (
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
                    checked={!hiddenColumns[key]}
                    onChange={(e) =>
                      onColumnVisibilityChange(key, !e.target.checked)
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
