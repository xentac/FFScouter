import { ffconfig } from "@utils/ffconfig";
import type * as ReactTypes from "react";
import type * as ReactDOMTypes from "react-dom";
import type * as ReactDOMClientTypes from "react-dom/client";

export type UnsafeReact = typeof ReactTypes;
export type ReactDOMFull = typeof ReactDOMTypes & typeof ReactDOMClientTypes;

// Prefer Torn's own already-loaded React (matches whatever version the page
// itself runs, no duplicate copy). Where unsafeWindow doesn't bridge to it --
// permanently broken on at least one Safari userscript-manager configuration,
// where unsafeWindow resolves but doesn't carry over page-realm objects --
// fall back to the same-realm copy set up by the react-dom bundle @require'd
// in vite.config.ts (see ADR 0007). @require runs in this script's own realm
// before any of our own module code, so by the time getReact()/getReactDOM()
// are called, that fallback copy (if needed) is already in place -- no async
// gate required.
function unsafeWindowReact(): {
  React?: UnsafeReact;
  ReactDOM?: ReactDOMFull;
} {
  return unsafeWindow as unknown as {
    React?: UnsafeReact;
    ReactDOM?: ReactDOMFull;
  };
}

function requiredReact(): {
  React?: UnsafeReact;
  ReactDOM?: ReactDOMFull;
} {
  return globalThis as unknown as {
    React?: UnsafeReact;
    ReactDOM?: ReactDOMFull;
  };
}

function hasWorkingUnsafeWindowReact(): boolean {
  const w = unsafeWindowReact();
  return Boolean(w.React && w.ReactDOM);
}

// ffconfig.debug_force_react_fallback (Settings > Debug Settings) forces use
// of the @require'd fallback copy even when unsafeWindow already works, so it
// can be exercised on Chrome/Firefox -- where it's normally never triggered --
// ahead of a Safari-specific release.
export function getReact(): UnsafeReact {
  if (!ffconfig.debug_force_react_fallback && hasWorkingUnsafeWindowReact()) {
    return unsafeWindowReact().React as UnsafeReact;
  }
  // Set by the @require'd bundle before this module's own code runs.
  return requiredReact().React as UnsafeReact;
}

export function getReactDOM(): ReactDOMFull {
  if (!ffconfig.debug_force_react_fallback && hasWorkingUnsafeWindowReact()) {
    return unsafeWindowReact().ReactDOM as ReactDOMFull;
  }
  // Set by the @require'd bundle before this module's own code runs.
  return requiredReact().ReactDOM as ReactDOMFull;
}
