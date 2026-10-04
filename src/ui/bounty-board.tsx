// FF Scouter Bounties: the Bounty Board Modal (desktop floating shell) and
// its body. The body is container-agnostic so the narrow/mobile in-flow
// section can re-wrap it, and the consent state then renders in whichever
// container is active.
import {
  accept_bounty_seller_policy,
  BOUNTY_POLICY_URL,
  type BountySellerBoardResponse,
} from "@utils/api";
import { bounty_board_cache } from "@utils/bounty_board";
import { check_key_status } from "@utils/check_key";
import { getLocalUserId, open_attack_link } from "@utils/dom";
import { ffconfig, WarQuickAttackAction } from "@utils/ffconfig";
import { ffscouter } from "@utils/ffscouter";
import logger from "@utils/logger";
import default_storage from "@utils/storage";
import { parse_suffix_number } from "@utils/strings";
import type { FFData, PlayerId } from "@utils/types";
import { useEffect, useMemo, useReducer, useState } from "react";
import { cls } from "./bounty-board-classes";
import {
  api_error_message,
  type BoardErrorPhase,
  build_board_view,
  classify_board_error,
  ff_ids_to_load,
  type PlayerRowModel,
} from "./bounty-board-rows";
import { BountyRow, FactionBountyCard } from "./bounty-row";
import { TOAST_LEVEL, toast } from "./toast";

const log = logger.child("ui");

// ============================================================================
// View state: the modal manages its own view (filters, expansion, minimized)
// outside the settings panel — settings are for behavior. Lives beside the
// board cache's own keys in the default Storage namespace, so it survives
// reloads and is untouched by "Reset settings to defaults".
// ============================================================================
const VIEW_STATE_KEY = "bounty_board_view";

type BountyBoardViewState = {
  // Raw input text, parsed at filter time ("2.5b" for stats).
  stats_less_than: string;
  ff_less_than: string;
  expanded_tiers: string[];
  expanded_factions: number[];
  minimized: boolean;
};

const DEFAULT_VIEW_STATE: BountyBoardViewState = {
  stats_less_than: "",
  ff_less_than: "",
  expanded_tiers: [],
  expanded_factions: [],
  minimized: false,
};

function load_view_state(): BountyBoardViewState {
  return {
    ...DEFAULT_VIEW_STATE,
    ...(default_storage.get<Partial<BountyBoardViewState>>(VIEW_STATE_KEY) ??
      {}),
  };
}

function useViewState() {
  const [view, setView] = useState<BountyBoardViewState>(load_view_state);
  const update = (patch: Partial<BountyBoardViewState>) => {
    setView((prev) => {
      const next = { ...prev, ...patch };
      default_storage.set(VIEW_STATE_KEY, next);
      return next;
    });
  };
  return [view, update] as const;
}

function toggle_in<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

function parse_ff_limit(raw: string): number | null {
  if (!raw.trim()) return null;
  const n = Number.parseFloat(raw);
  return Number.isNaN(n) ? null : n;
}

// The setting is read at click time, so a settings save applies without a
// remount.
function handleAttack(row: PlayerRowModel) {
  open_attack_link(row.player_id, {
    openInNewTab:
      ffconfig.bounty_attack_action === WarQuickAttackAction.NEW_TAB,
  });
}

// ============================================================================
// Board state machine
// ============================================================================
type BoardState =
  | { phase: "loading" }
  | { phase: "ready"; response: BountySellerBoardResponse }
  | BoardErrorPhase;

type BoardAction =
  | { type: "reload" }
  | { type: "loaded"; response: BountySellerBoardResponse }
  | { type: "failed"; state: BoardErrorPhase };

function board_reducer(_state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case "reload":
      return { phase: "loading" };
    case "loaded":
      return { phase: "ready", response: action.response };
    case "failed":
      return action.state;
  }
}

function initial_board_state(): BoardState {
  return ffconfig.key ? { phase: "loading" } : { phase: "key_missing" };
}

// ============================================================================
// Gates
// ============================================================================

// In-modal equivalent of the faction page's API key notice (ADR 0012): the
// link gains its href only once the local user id resolves, so it never reads
// as a dead link; no scrolling is attempted.
function KeyNudge({ unregistered }: { unregistered: boolean }) {
  const [href, setHref] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    getLocalUserId()
      .then((id) => {
        if (id && !cancelled) {
          setHref(
            `https://www.torn.com/profiles.php?XID=${id}#ff-scouter-api-key`,
          );
        }
      })
      .catch((err: unknown) => {
        log.error(err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <p className={cls.notice}>
      {unregistered
        ? "Your FF Scouter API key isn't registered. Check it in "
        : "FF Scouter Bounties need your FF Scouter API key. Enter it in "}
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer">
          FF Scouter Settings
        </a>
      ) : (
        <strong>FF Scouter Settings</strong>
      )}{" "}
      on your profile page.
    </p>
  );
}

// Bounty Policy Consent: collected here and only here. The script never
// manufactures consent — acceptance is posted only after the explicit click.
function ConsentGate({ onAccepted }: { onAccepted: () => void }) {
  const [submitting, setSubmitting] = useState(false);

  const accept = async () => {
    setSubmitting(true);
    try {
      const resp = await accept_bounty_seller_policy(ffconfig.key, true);
      if (resp.blank || !resp.result.ok) {
        throw new Error("Bounty policy acceptance was not recorded");
      }
      bounty_board_cache.clear_failure();
      onAccepted();
    } catch (err) {
      toast(api_error_message(err), TOAST_LEVEL.ERROR);
      setSubmitting(false);
    }
  };

  return (
    <div>
      <p className={cls.notice}>
        FF Scouter Bounties are a separate system from Torn's own bounties. To
        view and claim them, read the{" "}
        <a href={BOUNTY_POLICY_URL} target="_blank" rel="noopener noreferrer">
          Bounty Board Data Policy and Rules
        </a>
        .
      </p>
      <button
        type="button"
        className={cls.primaryBtn}
        disabled={submitting}
        onClick={() => {
          void accept();
        }}
      >
        I have read the rules and data policy
      </button>
    </div>
  );
}

// ============================================================================
// Body
// ============================================================================
function BountyBoardBody({
  view,
  updateView,
}: {
  view: BountyBoardViewState;
  updateView: (patch: Partial<BountyBoardViewState>) => void;
}) {
  const [state, dispatch] = useReducer(
    board_reducer,
    undefined,
    initial_board_state,
  );
  const [ffMap, setFfMap] = useState<ReadonlyMap<PlayerId, FFData>>(
    () => new Map(),
  );
  const [claimPending, setClaimPending] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  // Ids already sent to the stats cache, so re-renders and card expansions
  // only look up players not requested yet.
  const [ffRequested] = useState(() => new Set<PlayerId>());

  // The board fetch is the only bounty traffic the modal generates: nothing
  // here runs unless the modal is mounted, which the master toggle gates.
  useEffect(() => {
    if (state.phase !== "loading") return;
    let cancelled = false;
    void Promise.all([
      check_key_status.is_registered().catch(() => null),
      bounty_board_cache.get_board().then(
        (response) => ({ ok: true as const, response }),
        (err: unknown) => ({ ok: false as const, err }),
      ),
    ]).then(([registered, result]) => {
      if (cancelled) return;
      // Only an explicit false nudges; null (unknown) fails open.
      if (registered === false) {
        dispatch({ type: "failed", state: { phase: "key_unregistered" } });
      } else if (result.ok) {
        dispatch({ type: "loaded", response: result.response });
      } else {
        dispatch({ type: "failed", state: classify_board_error(result.err) });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [state.phase]);

  // FF is joined from the batched stats cache, not the board payload, so a
  // row's FF may be slightly staler than its estimate.
  const targets = state.phase === "ready" ? state.response.board.targets : null;
  useEffect(() => {
    if (!targets) return;
    const ids = ff_ids_to_load(targets, view.expanded_factions).filter(
      (id) => !ffRequested.has(id),
    );
    if (ids.length === 0) return;
    for (const id of ids) ffRequested.add(id);
    const lookups = ids.map((id) => ffscouter.get(id));
    ffscouter.complete();
    Promise.all(lookups)
      .then((results) => {
        setFfMap((prev) => {
          const next = new Map(prev);
          for (const data of results) next.set(data.player_id, data);
          return next;
        });
      })
      .catch((err: unknown) => {
        log.error(err);
      });
  }, [targets, view.expanded_factions, ffRequested]);

  const filters = useMemo(
    () => ({
      stats_less_than: parse_suffix_number(view.stats_less_than),
      ff_less_than: parse_ff_limit(view.ff_less_than),
    }),
    [view.stats_less_than, view.ff_less_than],
  );
  const rows = useMemo(
    () => (targets ? build_board_view(targets, ffMap, filters) : []),
    [targets, ffMap, filters],
  );

  // Fire-and-acknowledge: no claim progress or payout state is ever shown —
  // tracking payment is the website's job.
  const handleClaim = (row: PlayerRowModel) => {
    setClaimPending((prev) => new Set(prev).add(row.row_key));
    bounty_board_cache
      .submit_claim(row.claim_target)
      .then(() => {
        toast(`Bounty claim submitted for ${row.name}.`);
      })
      .catch((err: unknown) => {
        toast(api_error_message(err), TOAST_LEVEL.ERROR);
      })
      .finally(() => {
        setClaimPending((prev) => {
          const next = new Set(prev);
          next.delete(row.row_key);
          return next;
        });
      });
  };

  const renderRow = (row: PlayerRowModel) => (
    <BountyRow
      key={row.row_key}
      row={row}
      ff={ffMap.get(row.player_id)}
      expanded={view.expanded_tiers.includes(row.row_key)}
      onToggleExpanded={(key) =>
        updateView({ expanded_tiers: toggle_in(view.expanded_tiers, key) })
      }
      onAttack={handleAttack}
      onClaim={handleClaim}
      claimPending={claimPending.has(row.row_key)}
    />
  );

  switch (state.phase) {
    case "loading":
      return <p className={cls.notice}>Loading FF Scouter Bounties…</p>;
    case "key_missing":
      return <KeyNudge unregistered={false} />;
    case "key_unregistered":
      return <KeyNudge unregistered={true} />;
    case "consent":
      return <ConsentGate onAccepted={() => dispatch({ type: "reload" })} />;
    case "error":
      return (
        <p className={cls.notice}>
          Couldn't load FF Scouter Bounties: {state.message}
        </p>
      );
    case "ready":
      break;
  }

  const anyEnabled = state.response.board.targets.some((t) => !t.disabled);
  return (
    <div>
      <div className={cls.filters}>
        <label className={cls.filter}>
          Stats less than
          <input
            type="text"
            inputMode="decimal"
            placeholder="e.g. 2.5b"
            aria-label="Only show targets with stats less than"
            value={view.stats_less_than}
            onChange={(e) => updateView({ stats_less_than: e.target.value })}
          />
        </label>
        <label className={cls.filter}>
          FF less than
          <input
            type="text"
            inputMode="decimal"
            placeholder="e.g. 3"
            aria-label="Only show targets with FF less than"
            value={view.ff_less_than}
            onChange={(e) => updateView({ ff_less_than: e.target.value })}
          />
        </label>
      </div>
      {rows.length === 0 ? (
        <p className={cls.notice}>
          {anyEnabled
            ? "No FF Scouter Bounties match your filters."
            : "No open FF Scouter Bounties right now."}
        </p>
      ) : (
        <ul className={cls.list}>
          {rows.map((row) =>
            row.kind === "faction" ? (
              <FactionBountyCard
                key={row.row_key}
                card={row}
                expanded={view.expanded_factions.includes(row.faction_id)}
                onToggleExpanded={(id) =>
                  updateView({
                    expanded_factions: toggle_in(view.expanded_factions, id),
                  })
                }
                renderMember={renderRow}
              />
            ) : (
              renderRow(row)
            ),
          )}
        </ul>
      )}
    </div>
  );
}

// ============================================================================
// Desktop floating shell
// ============================================================================
export function BountyBoardModal() {
  const [view, updateView] = useViewState();
  return (
    <section
      className={`${cls.modal}${view.minimized ? ` ${cls.modalMinimized}` : ""}`}
      aria-label="FF Scouter Bounties"
    >
      <div className={cls.header}>
        <h2 className={cls.title}>FF Scouter Bounties</h2>
        <button
          type="button"
          className={cls.headerBtn}
          aria-expanded={!view.minimized}
          aria-label={
            view.minimized
              ? "Expand FF Scouter Bounties"
              : "Minimize FF Scouter Bounties"
          }
          onClick={() => updateView({ minimized: !view.minimized })}
        >
          {view.minimized ? "+" : "−"}
        </button>
      </div>
      {view.minimized ? null : (
        <div className={cls.body}>
          <BountyBoardBody view={view} updateView={updateView} />
        </div>
      )}
    </section>
  );
}
