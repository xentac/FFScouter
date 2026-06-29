import { check_key_status } from "@utils/check_key";
import { ffscouter } from "@utils/ffscouter";
import logger from "@utils/logger";
import {
  format_difficulty_text,
  format_ff_score,
  format_relative_time,
  get_contrast_color,
  get_ff_colour,
} from "@utils/strings";
import type { FFData, PlayerId } from "@utils/types";
import { useEffect, useState } from "react";

const log = logger.child("ui");

const PREMIUM_UPGRADE_URL = "https://ffscouter.com/premium";

type Props = {
  playerId: PlayerId;
};

export function FFHeaderLine({ playerId }: Props) {
  const [data, setData] = useState<FFData | null>(null);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [premiumLoading, setPremiumLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ffscouter
      .get(playerId)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        log.error(err);
      });
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  useEffect(() => {
    if (!data) return;
    setPremiumLoading(true);
    let cancelled = false;
    check_key_status
      .is_premium()
      .then((premium) => {
        if (!cancelled) setIsPremium(premium);
      })
      .catch((err: unknown) => {
        log.error(err);
      })
      .finally(() => {
        if (!cancelled) setPremiumLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [data]);

  if (data === null) {
    return (
      <>
        <span style={{ fontWeight: "bold", marginRight: "6px" }}>
          FairFight:
        </span>
        <span style={{ fontStyle: "italic" }}>Loading...</span>
      </>
    );
  }

  if (data.no_data) {
    return (
      <>
        <span style={{ fontWeight: "bold", marginRight: "6px" }}>
          FairFight:
        </span>
        <span
          style={{
            background: "#444",
            color: "#fff",
            fontWeight: "bold",
            padding: "2px 6px",
            borderRadius: "4px",
            display: "inline-block",
          }}
        >
          No data
        </span>
      </>
    );
  }

  const ffString = format_ff_score(data);
  const difficulty = format_difficulty_text(data);
  const fresh = format_relative_time(data.last_updated);
  const backgroundColor = get_ff_colour(data);
  const textColor = get_contrast_color(backgroundColor);

  let extraDetailsLine: React.ReactNode = null;
  if (data.distribution?.distribution_human) {
    const ageStr = format_relative_time(data.distribution.last_updated);
    extraDetailsLine = (
      <span
        style={{
          display: "block",
          marginTop: "2px",
          fontSize: "12px",
          fontStyle: "normal",
        }}
      >
        <span style={{ fontWeight: "bold", marginRight: "6px" }}>
          Top Stats:
        </span>
        <span style={{ fontWeight: "normal" }}>
          {data.distribution.distribution_human} {ageStr}
        </span>
      </span>
    );
  } else if (premiumLoading) {
    extraDetailsLine = null;
  } else if (isPremium === false && data.premium_insights_available) {
    extraDetailsLine = (
      <span className="ff-premium-upgrade-line">
        <a
          href={PREMIUM_UPGRADE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontWeight: "bold", textDecoration: "underline" }}
        >
          Premium Data Available - Upgrade To View
        </a>
      </span>
    );
  }

  return (
    <>
      <span style={{ fontWeight: "bold", marginRight: "6px" }}>FairFight:</span>
      <span
        style={{
          background: backgroundColor,
          color: textColor,
          fontWeight: "bold",
          padding: "2px 6px",
          borderRadius: "4px",
          display: "inline-block",
        }}
      >
        {ffString} ({difficulty}) {fresh}
      </span>
      <span
        style={{
          fontSize: "11px",
          fontWeight: "normal",
          marginLeft: "6px",
          verticalAlign: "middle",
          fontStyle: "italic",
        }}
      >
        Est. Stats: <span>{data.bs_estimate_human}</span>
      </span>
      {extraDetailsLine}
    </>
  );
}
