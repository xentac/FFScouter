// Each feature gets its own folder
// Ideally CSS should be limited to positional shit (or just do inline)

import type { HttpInterceptor } from "@utils/network";

export enum StartTime {
  DocumentStart,
  DocumentEnd,
}

export interface Feature {
  name: string;
  description: string;
  executionTime: StartTime;

  shouldRun: () => Promise<boolean>;
  run: () => Promise<void>;

  httpIntercept?: HttpInterceptor;
}
