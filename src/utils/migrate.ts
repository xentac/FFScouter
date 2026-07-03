const V2_PREFIX = "ffscouterv2-";
const V3_PREFIX = "ffsv3-config";
const V2_IDB_NAME = "ffscouter-cache";

function v2_get(key: string): string | null {
  return localStorage.getItem(V2_PREFIX + key);
}

function v3_has(key: string): boolean {
  return localStorage.getItem(V3_PREFIX + key) !== null;
}

function v3_set<T>(key: string, value: T): void {
  localStorage.setItem(
    V3_PREFIX + key,
    JSON.stringify({ value, expiration: null }),
  );
}

function migrate_bool(old_key: string, new_key: string): void {
  if (v3_has(new_key)) return;
  const v = v2_get(old_key);
  if (v !== null) v3_set(new_key, v === "true");
}

function migrate_string(
  old_key: string,
  new_key: string,
  valid: string[],
): void {
  if (v3_has(new_key)) return;
  const v = v2_get(old_key);
  if (v !== null && valid.includes(v)) v3_set(new_key, v);
}

function migrate_float(old_key: string, new_key: string): void {
  if (v3_has(new_key)) return;
  const v = v2_get(old_key);
  if (v !== null) {
    const n = parseFloat(v);
    if (!Number.isNaN(n)) v3_set(new_key, n);
  }
}

export function run_migration(): void {
  // API key was stored without the v2 prefix
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
    "none",
  ]);
  migrate_string("chain-link-type", "chain_link_type", ["attack", "profile"]);
  migrate_string("chain-tab-type", "chain_tab_type", ["newtab", "sametab"]);

  migrate_float("chain-ff-target", "chain_ff_target");

  // FF ranges were a single JSON blob in v2
  if (
    !v3_has("low_ff_range") &&
    !v3_has("high_ff_range") &&
    !v3_has("max_ff_range")
  ) {
    const raw = localStorage.getItem("ffscouterv2-ranges");
    if (raw) {
      try {
        const { low, high, max } = JSON.parse(raw);
        if (typeof low === "number") v3_set("low_ff_range", low);
        if (typeof high === "number") v3_set("high_ff_range", high);
        if (typeof max === "number") v3_set("max_ff_range", max);
      } catch {}
    }
  }

  // Sort order: pick the column matching the saved display mode
  if (!v3_has("faction_filter_state")) {
    const col_display = v2_get("factions-col-display") ?? "battle_stats";
    const sort_key =
      col_display === "fair_fight"
        ? "factions-ff-sort-order"
        : "factions-est-sort-order";
    const sort_order = v2_get(sort_key);
    if (sort_order === "asc" || sort_order === "desc") {
      v3_set("faction_filter_state", {
        sortBy: sort_order === "asc" ? "ff-asc" : "ff-desc",
      });
    }
  }
}

export function clear_v2_data(): void {
  localStorage.removeItem("limited_key");
  const to_delete = Object.keys(localStorage).filter((k) =>
    k.startsWith(V2_PREFIX),
  );
  for (const key of to_delete) {
    localStorage.removeItem(key);
  }
  try {
    indexedDB.deleteDatabase(V2_IDB_NAME);
  } catch {}
}
