import { StartTime } from "@features/feature";
import { Features } from "@features/index";
import { wait_for_body } from "@utils/dom";
import { ffscouter } from "@utils/ffscouter";
import logger from "@utils/logger";
import { run_migration } from "@utils/migrate";
import { registerHttpInterceptor } from "@utils/network";
import { init_ui } from "./ui";

const log = logger.child("boot");

const INJECTION_KEY = "__FF_SCOUTER_V3_INJECTED__";

async function main() {
  const w = window as unknown as Record<string, boolean>;
  if (w[INJECTION_KEY]) {
    log.info("Script already injected");
    return;
  }
  w[INJECTION_KEY] = true;

  log.info("Initializing", __FF_SCOUTER_V2_VERSION__);

  run_migration();
  init_ui();

  if (ffscouter.analytics_enabled) {
    (unsafeWindow as any).ffscouter = ffscouter;
    (window as any).ffscouter = ffscouter;
  }

  // loop over features, check if enabled, see if we need to wait for document ready

  for (const feat of Features) {
    // + check if feature is toggled
    if (
      feat.executionTime === StartTime.DocumentStart &&
      (await feat.shouldRun())
    ) {
      if (feat.httpIntercept) {
        feat.httpIntercept.name = feat.name;
        registerHttpInterceptor(feat.httpIntercept);
      }
      feat.run();
    }
  }

  await wait_for_body(10_000);

  for (const feat of Features) {
    // + check if feature is toggled
    if (
      feat.executionTime === StartTime.DocumentBody &&
      (await feat.shouldRun())
    ) {
      if (feat.httpIntercept) {
        feat.httpIntercept.name = feat.name;
        registerHttpInterceptor(feat.httpIntercept);
      }
      feat.run();
    }
  }
}

main();
