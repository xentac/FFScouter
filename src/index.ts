import { StartTime } from "@features/feature";
import { Features } from "@features/index";
import { wait_for_body } from "@utils/dom";
import { ffconfig } from "@utils/ffconfig";
import { ffscouter } from "@utils/ffscouter";
import logger, { LogLevel } from "@utils/logger";
import { setHttpInterceptor } from "@utils/network";
import { init_ui } from "./ui";

const INJECTION_KEY = "__FF_SCOUTER_V3_INJECTED__";

async function main() {
  const w = window as unknown as Record<string, boolean>;
  if (w[INJECTION_KEY]) {
    logger.info("Script already injected");
    return;
  }
  w[INJECTION_KEY] = true;

  logger.info("Initializing", __FF_SCOUTER_V2_VERSION__);

  init_ui();

  if (ffscouter.analytics_enabled) {
    (unsafeWindow as any).ffscouter = ffscouter;
    (window as any).ffscouter = ffscouter;
  }

  // todo: settings panel

  // loop over features, check if enabled, see if we need to wait for document ready

  // this needs to be redone as we lose the ability to change url in before & resp in after
  setHttpInterceptor({
    // also a check if the feature's active and it has before / after set up
    // (unsure why this doesn't throw an error btw)
    before(url, init) {
      for (const feat of Features) {
        if (feat.httpIntercept?.before) {
          feat.httpIntercept.before(url, init);
        }
      }

      return undefined;
    },

    after(bodyText, response, ctx) {
      for (const feat of Features) {
        if (feat.httpIntercept?.after) {
          feat.httpIntercept.after(bodyText, response, ctx);
        }
      }

      return undefined;
    },
  });

  for (const feat of Features) {
    // + check if feature is toggled
    if (
      feat.executionTime === StartTime.DocumentStart &&
      (await feat.shouldRun())
    )
      feat.run();
  }

  await wait_for_body(10_000);

  for (const feat of Features) {
    // + check if feature is toggled
    if (
      feat.executionTime === StartTime.DocumentBody &&
      (await feat.shouldRun())
    )
      feat.run();
  }
}

main();
