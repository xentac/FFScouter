import { FFApiError } from "@utils/api";
import { check_key_status } from "@utils/check_key";
import { ffscouter } from "@utils/ffscouter";
import logger from "@utils/logger";
import { get_current_time_seconds } from "@utils/time";
import type { PlayerFlightsResponse } from "@utils/types";
import { useEffect, useRef, useState } from "react";

const log = logger.child("ui");

const PREMIUM_UPGRADE_URL = "https://ffscouter.com/premium";

function format_duration_human(totalSeconds: number, compact: boolean): string {
  const clampedSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clampedSeconds / 3600);
  const minutes = Math.floor((clampedSeconds % 3600) / 60);
  const seconds = clampedSeconds % 60;
  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (hours > 0 || minutes > 0) {
    parts.push(`${minutes}m`);
  }
  parts.push(`${seconds}s`);
  if (compact) {
    return parts.join("");
  }
  return parts.join(" ");
}

function format_tct_time(unixSeconds: number): string | null {
  if (!Number.isFinite(unixSeconds)) return null;
  const d = new Date(unixSeconds * 1000);
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

type Props = {
  playerId: number | null;
  compact?: boolean;
};

export function FFFlightProfileStatus({ playerId, compact = false }: Props) {
  const [data, setData] = useState<PlayerFlightsResponse | null>(null);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(
    get_current_time_seconds,
  );

  // Reset dependent state during render (not in an effect) when playerId
  // changes, so the previous player's flight data never paints before the
  // reset commits. See https://react.dev/learn/you-might-not-need-an-effect
  const [prevPlayerId, setPrevPlayerId] = useState(playerId);
  if (playerId !== prevPlayerId) {
    setPrevPlayerId(playerId);
    setData(null);
    setError(null);
    setLoading(true);
    setIsPremium(null);
  }

  // Ref so interval callbacks can read the latest data without stale closures.
  const dataRef = useRef<PlayerFlightsResponse | null>(null);
  dataRef.current = data;

  useEffect(() => {
    if (!playerId) return;

    let active = true;

    const fetchData = async () => {
      if (!active) return;

      let isPremiumResult: boolean | null;
      try {
        isPremiumResult = await check_key_status.is_premium();
      } catch (err) {
        log.error("Failed to check premium status", err);
        if (active) setLoading(false);
        return;
      }

      if (!active) return;
      setIsPremium(isPremiumResult);

      if (!isPremiumResult) {
        setLoading(false);
        return;
      }

      try {
        const result = await ffscouter.get_flights(playerId);
        if (!active) return;
        setData(result);
        setError(null);
      } catch (err) {
        if (!active) return;
        log.error("Failed to fetch flight data", err);

        if (err instanceof FFApiError) {
          const code = err.ff_api_error?.code;
          if (code === 19) {
            setIsPremium(false);
          } else if (code === 2 || code === 10 || code === 12) {
            setError("Invalid API key");
          } else if (code === 20) {
            setError("Rate limit exceeded. Retrying...");
          } else {
            setError(
              err.ff_api_error?.error ??
                err.message ??
                "Flight tracking unavailable",
            );
          }
        } else {
          setError(
            err instanceof Error ? err.message : "Flight tracking unavailable",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();

    const tick = setInterval(() => {
      setCurrentTimeSeconds(get_current_time_seconds());
      const d = dataRef.current;
      if (d?.rechecking && d.next_retry_at && Date.now() >= d.next_retry_at) {
        fetchData();
      }
    }, 1000);

    // Only re-fetch on the 30s interval when not rechecking (rechecking uses
    // its own retry schedule driven by the tick above).
    const fetchInterval = setInterval(() => {
      if (!dataRef.current?.rechecking) {
        fetchData();
      }
    }, 30000);

    return () => {
      active = false;
      clearInterval(tick);
      clearInterval(fetchInterval);
    };
  }, [playerId]);

  if (!playerId) return null;

  if (isPremium === false) {
    return (
      <div className="ff-scouter-profile-flight-info">
        <a
          href={PREMIUM_UPGRADE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontWeight: "bold", textDecoration: "underline" }}
        >
          Upgrade to FFScouter Flight Tracking
        </a>
      </div>
    );
  }

  let content: React.ReactNode;

  if (error) {
    content = <span style={{ color: "#ff6b6b" }}>Error: {error}</span>;
  } else if (loading && !data) {
    content = compact ? "Estimating..." : "Landing: estimating...";
  } else {
    const current = data?.current;
    if (data?.rechecking) {
      const next = data.next_retry_at ?? 0;
      const seconds = Math.max(0, Math.ceil((next - Date.now()) / 1000));
      content = compact ? (
        <>
          No data.
          <br />
          Rechecking...
        </>
      ) : (
        `No data. Rechecking in ${seconds} seconds.`
      );
    } else if (
      !current ||
      (!current.earliest_arrival_time && !current.latest_arrival_time)
    ) {
      content = compact
        ? "Unavailable"
        : "Landing: unavailable for current route";
    } else {
      const earliest = Number(current.earliest_arrival_time);
      const latest = Number(current.latest_arrival_time);
      if (!Number.isFinite(earliest) || !Number.isFinite(latest)) {
        content = compact
          ? "Unavailable"
          : "Landing: unavailable for current route";
      } else {
        const earliestRemaining = earliest - currentTimeSeconds;
        const latestRemaining = latest - currentTimeSeconds;
        const earliestTct = format_tct_time(earliest);
        const latestTct = format_tct_time(latest);

        if (latestRemaining <= -5 * 60) {
          content = compact ? (
            "Late"
          ) : (
            <>
              Landing: Late, probably flight delayed.
              <br />({latestTct} TCT latest)
            </>
          );
        } else if (latestRemaining <= 0) {
          content = compact ? (
            <>
              Just landed
              <br />
              (Latest: {latestTct} TCT)
            </>
          ) : (
            <>
              Landing: just landed
              <br />({latestTct} TCT latest)
            </>
          );
        } else if (earliestRemaining <= 0) {
          content = compact ? (
            <>
              Imminent
              <br />
              {format_duration_human(latestRemaining, compact)}
              <br />
            </>
          ) : (
            <>
              Landing: imminent -{" "}
              {format_duration_human(latestRemaining, compact)}
              <br />
              (Latest: {latestTct} TCT)
            </>
          );
        } else {
          content = compact ? (
            <>
              {format_duration_human(earliestRemaining, compact)}
              <br />
              {format_duration_human(latestRemaining, compact)}
            </>
          ) : (
            <>
              Landing: {format_duration_human(earliestRemaining, compact)} -{" "}
              {format_duration_human(latestRemaining, compact)}
              <br />({earliestTct} - {latestTct} TCT)
            </>
          );
        }
      }
    }
  }

  return <div className="ff-scouter-profile-flight-info">{content}</div>;
}
