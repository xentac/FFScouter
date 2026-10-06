// Claim submission shared by the FF Scouter Bounties board and the Attack Page
// Bounty Row. The POST is authoritative, so a failure — notably 409 code 91
// (exhausted or raced) or 400 code 87 (key lacks attacks access) — is toasted
// with the API's own message. Never rejects, so callers can always clear their
// pending state once it settles; resolves true when the claim went in.
import type { BountyClaimTarget } from "@utils/api";
import { bounty_board_cache } from "@utils/bounty_board";
import { api_error_message } from "./bounty-board-rows";
import { TOAST_LEVEL, toast } from "./toast";

export function submit_claim_with_toast(
  target: BountyClaimTarget,
  success_message: string,
): Promise<boolean> {
  return bounty_board_cache.submit_claim(target).then(
    () => {
      toast(success_message);
      return true;
    },
    (err: unknown) => {
      toast(api_error_message(err), TOAST_LEVEL.ERROR);
      return false;
    },
  );
}
