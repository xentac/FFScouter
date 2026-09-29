import { extract_last_updated, extract_source } from "@utils/estimate";
import { format_age_phrase, get_source_marker } from "@utils/strings";
import type { FFDataComplete } from "@utils/types";
import styles from "./info-line.module.css";

const GUIDE_URL = "https://ffscouter.com/guides/fair-fight-explained";
const FAQ_URL = "https://ffscouter.com/faq#profile-stats-old-inaccurate";

// The circled-i trigger for the Estimate-Age Explainer (issue #21). Drawn in
// the Source Marker visual language — hand-drawn SVG, black outline stroke
// around a solid fill, never an emoji (see [[Source Marker]] in CONTEXT.md for
// why) — but in a neutral slate fill so it doesn't read as a third estimate
// source next to the spy-blue lens and premium-gold star.
const INFO_GLYPH_COLOR = "#607d8b";

type GlyphProps = {
  open: boolean;
  onToggle: () => void;
};

export function ExplainerGlyphButton({ open, onToggle }: GlyphProps) {
  return (
    <button
      type="button"
      className={styles["ffscouter-explainer-glyph"]}
      aria-expanded={open}
      aria-label="Explain this estimate"
      onClick={onToggle}
    >
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <circle
          cx={10}
          cy={10}
          r={9}
          fill={INFO_GLYPH_COLOR}
          stroke="#000000"
          strokeWidth={1.5}
        />
        <circle cx={10} cy={5.8} r={1.6} fill="#ffffff" />
        <rect
          x={8.6}
          y={8.4}
          width={2.8}
          height={7.2}
          rx={1.4}
          fill="#ffffff"
        />
      </svg>
    </button>
  );
}

function GuideLink() {
  return (
    <a href={GUIDE_URL} target="_blank" rel="noopener noreferrer">
      Read how it works
    </a>
  );
}

function FaqLink() {
  return (
    <a href={FAQ_URL} target="_blank" rel="noopener noreferrer">
      More in the FAQ
    </a>
  );
}

// The bold dynamic line that acts as the card's heading. Premium/spies wording
// reuses get_source_marker's label vocabulary so the card and the marker
// tooltip can't drift; bss has no marker but gets the "Fair Fight data" label.
// An unrecognized runtime source (a server newer than this client) drops the
// source clause entirely — never assert a wrong source.
function dynamic_line(data: FFDataComplete): string {
  const source = extract_source(data);
  const label =
    get_source_marker(source)?.label ??
    (source === "bss" ? "Fair Fight data" : null);
  const age = format_age_phrase(extract_last_updated(data));
  const agePhrase = age === "" ? "less than a day old" : `${age} old`;
  return label
    ? `This player's estimate comes from ${label} and is ${agePhrase}.`
    : `This player's estimate is ${agePhrase}.`;
}

type CardProps = {
  // null renders the no-estimate (no_data) copy variant.
  data: FFDataComplete | null;
  onClose: () => void;
};

// The inline push-down card. Copy is locked by issue #21 — deliberate
// omissions (do not add): "clean"-attack criteria, the exact 1.00/3.00
// endpoint rule, and any premium/upsell content.
export function EstimateExplainerCard({ data, onClose }: CardProps) {
  return (
    <div className={styles["ffscouter-explainer-card"]}>
      <button
        type="button"
        className={styles["ffscouter-explainer-card__close"]}
        aria-label="Close"
        onClick={onClose}
      >
        ×
      </button>
      {data ? (
        <>
          <p>
            <strong>{dynamic_line(data)}</strong>
          </p>
          <p>
            Estimates come from Fair Fight scores recorded when FFScouter users
            attack this player. Only recent attacks with a Fair Fight score
            between roughly 1.05 and 3.00 count. If nobody has landed a
            qualifying attack lately, the estimate simply ages. <GuideLink />.
          </p>
          <p>
            Be more cautious with estimates over 28 days old and with brand-new
            players. <FaqLink />.
          </p>
        </>
      ) : (
        <>
          <p>
            <strong>FFScouter has no estimate for this player yet.</strong>
          </p>
          <p>
            Estimates come from Fair Fight scores recorded when FFScouter users
            attack a player. Only recent attacks with a Fair Fight score between
            roughly 1.05 and 3.00 count, so there's no estimate when no
            FFScouter user has attacked this player, or when their fights fell
            outside that range. <GuideLink />.
          </p>
          <p>
            Brand-new players and rarely-attacked players often have no estimate
            at all. <FaqLink />.
          </p>
        </>
      )}
    </div>
  );
}
