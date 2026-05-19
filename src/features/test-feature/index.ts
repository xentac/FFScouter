import logger from "@utils/logger";
import { type Feature, StartTime } from "../feature";

export default {
  name: "Test Feature!",
  description: "It's literally a test feature :P",
  executionTime: StartTime.DocumentStart,

  async shouldRun() {
    return true;
  },

  async run() {
    logger.info("hello world but from feature");
  },

  httpIntercept: {
    before(_url, _init) {
      // something
      return undefined;
    },

    after(_bodyText, _response, _ctx) {
      // even more things
      return undefined;
    },
  },
} satisfies Feature;
