import logger from "@utils/logger";
import {
  apply_filters_and_sort,
  resolve_row_container,
} from "./filter-sort-engine";

const log = logger.child("feature:faction");

type SortFilters = Parameters<typeof apply_filters_and_sort>[1];

// More re-sorts that actually moved rows than this before a frame passes means
// something keeps undoing our order (e.g. a broken idempotence check). Past it,
// re-sorts are deferred to one per animation frame instead of chaining through
// microtasks, which would never let the browser paint and freeze the tab.
const MAX_REORDERS_PER_FRAME = 3;

// Watches a list's row container for Torn moving rows into its own order
// (a Native Reorder, e.g. by war score during a Ranked War) and re-sorts by
// FF/Est synchronously in the MutationObserver callback. The callback runs as a
// microtask right after Torn's DOM changes, so the re-sort always lands before
// the browser paints and the user never sees Torn's order — a rAF deferral
// could miss that paint if Torn's own update ran inside a rAF callback.
//
// childList without subtree only reports direct children being added, removed
// or moved, so changes inside a row (score text, our FF bubble) never fire it.
// It's a separate observer from setup_reapply_watcher's attribute observer
// because that one needs subtree: true. Our own reorder fires this observer
// once more; apply_filters_and_sort finds the rows already in order and makes
// no further mutations, which ends the chain.
//
// getFilters returns null when the filter box isn't ready. Returns a dispose
// function that disconnects the observer.
export function watch_native_reorder(
  list: HTMLElement,
  getFilters: () => SortFilters | null,
): () => void {
  let reordersThisFrame = 0;
  let frameScheduled = false;
  let deferred = false;
  let warned = false;

  const resort = () => {
    const filters = getFilters();
    // Torn only moves rows here, and a move can't change which rows are
    // filtered, so there's nothing to do without an active FF sort.
    if (!filters || filters.sortBy === "none") return;
    if (!apply_filters_and_sort(list, filters)) return;

    reordersThisFrame++;
    if (!frameScheduled) {
      frameScheduled = true;
      requestAnimationFrame(on_frame);
    }
  };

  const on_frame = () => {
    frameScheduled = false;
    reordersThisFrame = 0;
    if (deferred) {
      deferred = false;
      resort();
    }
  };

  const observer = new MutationObserver(() => {
    if (deferred) return;
    if (reordersThisFrame >= MAX_REORDERS_PER_FRAME) {
      deferred = true;
      if (!warned) {
        warned = true;
        log.warn(
          "Native reorder re-sorts exceeded the per-frame limit; deferring to animation frames",
          list,
        );
      }
      return;
    }
    resort();
  });

  observer.observe(resolve_row_container(list), { childList: true });
  return () => observer.disconnect();
}
