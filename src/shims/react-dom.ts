import type * as ReactDOMTypes from "react-dom";
import type * as ReactDOMClientTypes from "react-dom/client";
import { getReactDOM } from "./react-loader";

type ReactDOMFull = typeof ReactDOMTypes & typeof ReactDOMClientTypes;

// Proxy so every property access reads from getReactDOM() at call
// time, not at module evaluation time (before ReactDOM is on the window).
const ReactDOMProxy = new Proxy({} as ReactDOMFull, {
  get(_, prop: string) {
    return getReactDOM()[prop as keyof ReactDOMFull];
  },
});

export default ReactDOMProxy;

export const createRoot = ((
  ...args: Parameters<typeof ReactDOMClientTypes.createRoot>
) =>
  getReactDOM().createRoot(...args)) as typeof ReactDOMClientTypes.createRoot;

export const createPortal = ((
  ...args: Parameters<typeof ReactDOMTypes.createPortal>
) => getReactDOM().createPortal(...args)) as typeof ReactDOMTypes.createPortal;

export const flushSync = ((
  ...args: Parameters<typeof ReactDOMTypes.flushSync>
) => getReactDOM().flushSync(...args)) as typeof ReactDOMTypes.flushSync;
