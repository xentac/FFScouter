// The Attack Page Bounty Row never prompts: an unconsented or unregistered
// user simply gets no row. Without this record every attack-page open would
// re-hit the seller board for a 403 (the cache's own failure memory only
// spans the 60s freshness floor), so a gate failure silences the attack page
// for an hour — the hourly re-check that picks up consent or registration
// granted elsewhere. Accepting consent in the modal clears it immediately.
import default_storage, { Time } from "./storage";

const SILENCE_KEY = "bounty_attack_silenced";

const SILENCE_DURATION = { amount: 1, unit: Time.Hours };

export const ATTACK_BOUNTY_SILENCE_MS =
  SILENCE_DURATION.amount * SILENCE_DURATION.unit;

export function is_attack_bounty_silenced(): boolean {
  return default_storage.has(SILENCE_KEY);
}

export function silence_attack_bounty(): void {
  default_storage.set(SILENCE_KEY, true, SILENCE_DURATION);
}

export function clear_attack_bounty_silence(): void {
  default_storage.remove(SILENCE_KEY);
}
