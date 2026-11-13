import { OD_INSURANCE_GUIDE_URL } from "@utils/api";
import { copy_text } from "@utils/clipboard";
import {
  type PayablePlan,
  type PlansState,
  payable_plans,
} from "@utils/od_insurance";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./od-insurance.module.css";

const cls = {
  rowBtn: styles["ff-od-insurance__row-btn"],
  rowBtnFull: styles["ff-od-insurance__row-btn-full"],
  rowBtnShort: styles["ff-od-insurance__row-btn-short"],
  overlay: styles["ff-od-insurance__overlay"],
  modal: styles["ff-od-insurance"],
  header: styles["ff-od-insurance__header"],
  title: styles["ff-od-insurance__title"],
  sub: styles["ff-od-insurance__sub"],
  close: styles["ff-od-insurance__close"],
  body: styles["ff-od-insurance__body"],
  intro: styles["ff-od-insurance__intro"],
  plan: styles["ff-od-insurance__plan"],
  planOpen: styles["ff-od-insurance__plan-open"],
  pick: styles["ff-od-insurance__pick"],
  multiplier: styles["ff-od-insurance__multiplier"],
  planName: styles["ff-od-insurance__plan-name"],
  planMeta: styles["ff-od-insurance__plan-meta"],
  button: styles["ff-od-insurance__button"],
  row: styles["ff-od-insurance__row"],
  rowLabel: styles["ff-od-insurance__row-label"],
  code: styles["ff-od-insurance__code"],
  copyStatus: styles["ff-od-insurance__copy-status"],
  note: styles["ff-od-insurance__note"],
  footer: styles["ff-od-insurance__footer"],
  hide: styles["ff-od-insurance__hide"],
};

// Portals need a stable key per slot. A slot element keeps its key for as
// long as it lives.
const slot_keys = new WeakMap<HTMLElement, string>();
let next_slot_key = 0;
function slot_key(slot: HTMLElement): string {
  let key = slot_keys.get(slot);
  if (key === undefined) {
    key = `od-slot-${next_slot_key++}`;
    slot_keys.set(slot, key);
  }
  return key;
}

/** The plans as the modal last saw them; null while the first load runs. */
export type ModalPlans = PlansState | null;

function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

function GuideLink({ children }: { children: string }) {
  return <ExternalLink href={OD_INSURANCE_GUIDE_URL}>{children}</ExternalLink>;
}

function saved_age(fetched_at: number): string {
  const minutes = Math.max(1, Math.round((Date.now() - fetched_at) / 60_000));
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.round(minutes / 60)} h ago`;
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className={cls.row}>
      <span className={cls.rowLabel}>{label}</span>
      <span>{children}</span>
    </div>
  );
}

function CopyMessage({ message }: { message: string }) {
  const [status, setStatus] = useState("");
  const copy = async () => {
    const copied = await copy_text(message);
    setStatus(copied ? "Copied!" : "Copy failed, select the text");
  };
  return (
    <>
      <span className={cls.code}>{message}</span>{" "}
      <button type="button" className={cls.button} onClick={copy}>
        Copy
      </button>{" "}
      <span className={cls.copyStatus} role="status">
        {status}
      </span>
    </>
  );
}

function PlanDetail({
  plan,
  onBack,
}: {
  plan: PayablePlan;
  onBack: () => void;
}) {
  const pay = plan.payment;
  const id = pay.recipient_player_id;
  const recipient = pay.recipient_name
    ? `${pay.recipient_name} [${id}]`
    : `player [${id}]`;
  return (
    <div>
      <button type="button" className={cls.button} onClick={onBack}>
        ← Back to plans
      </button>
      <DetailRow label="Plan:">{plan.name}</DetailRow>
      <DetailRow label="Send:">{pay.xanax_quantity}x Xanax</DetailRow>
      <DetailRow label="To:">
        <ExternalLink href={`https://www.torn.com/profiles.php?XID=${id}`}>
          {recipient}
        </ExternalLink>
      </DetailRow>
      <DetailRow label="Message:">
        <CopyMessage message={pay.message} />
      </DetailRow>
      <DetailRow label="Coverage:">{plan.duration_label}</DetailRow>
      <DetailRow label="Multiplier:">Up to {plan.max_multiplier}x</DetailRow>
      <DetailRow label="Standard payout:">
        {plan.standard_payout_xanax} Xanax
      </DetailRow>
      <DetailRow label="Overdose X payout:">
        {plan.overdose_payout_xanax} Xanax
      </DetailRow>
      <p className={cls.note}>
        Send the Xanax from your items with exactly that message. Your cover
        starts when {recipient} receives it.
      </p>
    </div>
  );
}

/** Picks a plan for the Send Helper, with a multiplier. */
export type OnPick = (plan: PayablePlan, multiplier: number) => void;

// A whole number from 1 to the plan's cap, or null.
function parse_multiplier(value: string, max: number): number | null {
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n >= 1 && n <= max ? n : null;
}

function HelperPick({ plan, onPick }: { plan: PayablePlan; onPick: OnPick }) {
  const [value, setValue] = useState("1");
  const multiplier = parse_multiplier(value, plan.max_multiplier);
  return (
    <div className={cls.pick}>
      <label>
        Multiplier{" "}
        <input
          type="number"
          className={cls.multiplier}
          min={1}
          max={plan.max_multiplier}
          step={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      <span>
        {multiplier === null
          ? `1 to ${plan.max_multiplier}`
          : `${plan.payment.xanax_quantity * multiplier} Xanax total`}
      </span>
      <button
        type="button"
        className={cls.button}
        disabled={multiplier === null}
        onClick={() => {
          if (multiplier !== null) onPick(plan, multiplier);
        }}
      >
        Buy with helper
      </button>
    </div>
  );
}

function PlanList({
  plans,
  onSelect,
  onPick,
}: {
  plans: PayablePlan[];
  onSelect: (plan: PayablePlan) => void;
  onPick: OnPick;
}) {
  return (
    <>
      {plans.map((plan) => (
        <fieldset
          key={plan.plan_key}
          className={cls.plan}
          aria-label={plan.name}
        >
          <button
            type="button"
            className={cls.planOpen}
            onClick={() => onSelect(plan)}
          >
            <span className={cls.planName}>{plan.name}</span>
            <span className={cls.planMeta}>
              {plan.xanax_quantity}x Xanax · {plan.duration_label} · Standard
              payout {plan.standard_payout_xanax} Xanax · Overdose X payout{" "}
              {plan.overdose_payout_xanax} Xanax · Up to {plan.max_multiplier}x
            </span>
          </button>
          <HelperPick plan={plan} onPick={onPick} />
        </fieldset>
      ))}
    </>
  );
}

function ModalBody({
  plans,
  onRetry,
  onPick,
}: {
  plans: ModalPlans;
  onRetry: () => void;
  onPick: OnPick;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  if (plans === null) {
    return <p className={cls.intro}>Loading plans…</p>;
  }
  if (plans.status === "failed") {
    return (
      <>
        <p className={cls.intro}>Plans did not load.</p>
        <button type="button" className={cls.button} onClick={onRetry}>
          Retry
        </button>{" "}
        <GuideLink>Read the OD Insurance guide</GuideLink>
      </>
    );
  }

  const payable = payable_plans(plans.response);
  const plan = payable.find((p) => p.plan_key === selected);
  if (plan) {
    return <PlanDetail plan={plan} onBack={() => setSelected(null)} />;
  }
  return (
    <>
      {plans.status === "stale" && (
        <p className={cls.note}>
          The live list did not load. Showing plans saved{" "}
          {saved_age(plans.fetched_at)}.
        </p>
      )}
      {payable.length > 0 ? (
        <>
          <p className={cls.intro}>
            Tap a plan to see how to buy it, or buy it with the helper. The
            helper walks you through the Xanax send, one tap for each change.
          </p>
          <PlanList
            plans={payable}
            onSelect={(p) => setSelected(p.plan_key)}
            onPick={onPick}
          />
        </>
      ) : (
        <p className={cls.intro}>
          OD Insurance is not taking new policies right now.{" "}
          <GuideLink>Read the OD Insurance guide</GuideLink>
        </p>
      )}
    </>
  );
}

export function OdInsuranceModal({
  plans,
  onClose,
  onRetry,
  onHide,
  onPick,
}: {
  plans: ModalPlans;
  onClose: () => void;
  onRetry: () => void;
  // Turns the whole feature off, the same as the Settings toggle.
  onHide: () => void;
  onPick: OnPick;
}) {
  // Mounted only while open, so the Escape listener exists only then.
  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeydown);
    return () => document.removeEventListener("keydown", onKeydown);
  }, [onClose]);

  const response =
    plans !== null && plans.status !== "failed" ? plans.response : null;
  const manager = response?.manager_player_id ?? null;

  return (
    <div className={cls.overlay}>
      <dialog
        open
        className={cls.modal}
        aria-modal="true"
        aria-label="OD Insurance"
      >
        <div className={cls.header}>
          <div>
            <div className={cls.title}>OD Insurance</div>
            {manager !== null && (
              <div className={cls.sub}>
                Managed by {response?.manager_name ?? ""} [{manager}]
              </div>
            )}
          </div>
          <button
            type="button"
            className={cls.close}
            aria-label="Close OD Insurance"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className={cls.body}>
          <ModalBody plans={plans} onRetry={onRetry} onPick={onPick} />
          <div className={cls.footer}>
            OD Insurance is a paid ffscouter.com service.{" "}
            <GuideLink>How it works</GuideLink>.
            <div>
              <button type="button" className={cls.hide} onClick={onHide}>
                Hide OD Insurance
              </button>{" "}
              You can turn it back on in FF Scouter Settings.
            </div>
          </div>
        </div>
      </dialog>
    </div>
  );
}

export function OdInsuranceButton({ onOpen }: { onOpen: () => void }) {
  return (
    // The short label shows in Torn's narrow layout (below 784px), where the
    // row has less room. The CSS picks the label; the accessible name stays
    // the full one.
    <button
      type="button"
      className={cls.rowBtn}
      aria-label="OD Insurance"
      onClick={(e) => {
        // The row itself opens Torn's item info on click.
        e.preventDefault();
        e.stopPropagation();
        onOpen();
      }}
    >
      <span className={cls.rowBtnFull}>OD Insurance</span>
      <span className={cls.rowBtnShort}>OD Ins</span>
    </button>
  );
}

/**
 * The whole feature in one root: a button in each row slot (through
 * portals) and the modal while open. `load` asks the plans cache; it costs no
 * request while the stored list is fresh.
 */
export function OdInsurance({
  slots,
  load,
  onHide,
  onPick = () => {},
  helper = null,
}: {
  slots: HTMLElement[];
  load: () => Promise<PlansState>;
  onHide: () => void;
  // A pick closes the modal first, then creates the Selected Plan.
  onPick?: OnPick;
  // The Send Helper while a Selected Plan exists.
  helper?: ReactNode;
}) {
  const [plans, setPlans] = useState<ModalPlans>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  const refresh = () => {
    void load().then(setPlans);
  };

  // On mount: fetch unless fresh, so the buttons can go away when nothing
  // is payable.
  useEffect(() => {
    let live = true;
    void load().then((state) => {
      if (live) setPlans(state);
    });
    return () => {
      live = false;
    };
  }, [load]);

  const nothing_payable =
    plans !== null &&
    plans.status !== "failed" &&
    payable_plans(plans.response).length === 0;

  return (
    <>
      {!nothing_payable &&
        slots.map((slot) =>
          createPortal(
            <OdInsuranceButton
              onOpen={() => {
                setOpen(true);
                refresh();
              }}
            />,
            slot,
            slot_key(slot),
          ),
        )}
      {open && (
        <OdInsuranceModal
          plans={plans}
          onClose={close}
          onRetry={() => {
            setPlans(null);
            refresh();
          }}
          onHide={onHide}
          onPick={(plan, multiplier) => {
            setOpen(false);
            onPick(plan, multiplier);
          }}
        />
      )}
      {helper}
    </>
  );
}
