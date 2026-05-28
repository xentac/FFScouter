import logger from "@utils/logger";
import { Storage, Time } from "@utils/storage";
import { check_key, type FFApiCheckResponse, type FFCheckSuccess } from "./api";
import { type FFConfig, ffconfig } from "./ffconfig";

const log = logger.child("api");

const CHECK_KEY = "check-key-status";

// Class for managing and caching requests to check-key
export class CheckKeyStatus {
  private config: FFConfig;
  private storage: Storage;

  constructor(config: FFConfig, storage: Storage) {
    this.config = config;
    this.storage = storage;
  }

  check_key_status = async (
    force: boolean = false,
  ): Promise<FFCheckSuccess | null> => {
    // See if we have a cached value, if so return it
    if (!force) {
      const cached = this.storage.get(CHECK_KEY) as FFCheckSuccess;
      if (cached) {
        return cached;
      }
    }

    let result: FFApiCheckResponse;
    try {
      result = await check_key(this.config.key);
    } catch (err) {
      log.error(
        "Received error response querying ffscouter check-key api:",
        err,
      );
      result = { blank: true };
    }

    if (result.blank) {
      return null;
    }

    this.storage.set(CHECK_KEY, result.result, {
      amount: 5,
      unit: Time.Minutes,
    });

    return result.result;
  };

  is_premium = async (force: boolean = false) => {
    const status = await this.check_key_status(force);
    if (!status) {
      return false;
    }

    return status.is_premium;
  };

  clear = (): void => {
    this.storage.remove(CHECK_KEY);
  };
}

export const check_key_status = new CheckKeyStatus(
  ffconfig,
  new Storage("ffsv3-check"),
);
