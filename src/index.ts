import type { Feature } from "@features/feature";
import { StartTime } from "@features/feature";
import { Features } from "@features/index";
import { wait_for_body } from "@utils/dom";
import { ffscouter } from "@utils/ffscouter";
import logger from "@utils/logger";
import { run_migration } from "@utils/migrate";
import { registerHttpInterceptor } from "@utils/network";
import { init_ui } from "./ui";

const log = logger.child("boot");

// Anchored to the DOM rather than `window` because some delivery mechanisms
// (e.g. Firefox's native userScripts API, or simply duplicate script
// registrations) inject this script into more than one isolated JS realm per
// page. Each realm gets its own `window`, so a window-based flag never
// actually deduplicates. The document is the one thing every realm shares.
const INJECTION_KEY = "__FF_SCOUTER_V2_INJECTED__";

// Runs `shouldRun()`/`run()` without letting one feature's bug take down or
// hide the rest. `shouldRun()` is awaited directly in the loop below, so an
// unguarded throw there would abort the whole loop and silently skip every
// feature after it; `run()` is fire-and-forget, so an unguarded rejection
// would just be an invisible unhandled rejection.
async function safeShouldRun(feat: Feature): Promise<boolean> {
  try {
    return await feat.shouldRun();
  } catch (err) {
    log.error(`shouldRun() threw for feature "${feat.name}"`, err);
    return false;
  }
}

function safeRun(feat: Feature): void {
  feat.run().catch((err) => {
    log.error(`run() threw for feature "${feat.name}"`, err);
  });
}

async function main() {
  if (document.documentElement.hasAttribute(INJECTION_KEY)) {
    log.info("Script already injected");
    return;
  }
  document.documentElement.setAttribute(INJECTION_KEY, "1");

  log.info("Initializing", __FF_SCOUTER_V2_VERSION__);

  run_migration();
  init_ui();

  if (ffscouter.analytics_enabled) {
    // unsafeWindow is a userscript-manager convention; bare injection
    // environments (e.g. Torn PDA's WebView) don't define it at all.
    if (typeof unsafeWindow !== "undefined") {
      (unsafeWindow as any).ffscouter = ffscouter;
    }
    (window as any).ffscouter = ffscouter;
  }

  // loop over features, check if enabled, see if we need to wait for document ready

  for (const feat of Features) {
    // + check if feature is toggled
    if (
      feat.executionTime === StartTime.DocumentStart &&
      (await safeShouldRun(feat))
    ) {
      if (feat.httpIntercept) {
        feat.httpIntercept.name = feat.name;
        registerHttpInterceptor(feat.httpIntercept);
      }
      safeRun(feat);
    }
  }

  await wait_for_body(10_000);

  for (const feat of Features) {
    // + check if feature is toggled
    if (
      feat.executionTime === StartTime.DocumentBody &&
      (await safeShouldRun(feat))
    ) {
      if (feat.httpIntercept) {
        feat.httpIntercept.name = feat.name;
        registerHttpInterceptor(feat.httpIntercept);
      }
      safeRun(feat);
    }
  }
}

main();
