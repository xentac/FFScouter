import type { JSX } from "react";
import { getReact } from "./react-loader";

// A sentinel exported as Fragment. The real React.Fragment is swapped in
// lazily inside jsx/jsxs at call time, when React is guaranteed to be loaded.
const FRAGMENT_SENTINEL = Symbol("ReactFragment");
export const Fragment: symbol = FRAGMENT_SENTINEL;

export function jsx(
  type: JSX.ElementType | symbol,
  { children, ...props }: Record<string, unknown> & { children?: unknown },
  key?: string,
): React.ReactNode {
  const R = getReact();
  // createElement's overloads are too strict for a runtime-resolved
  // type/props pair; this shim intentionally bypasses them, same as before.
  const createElement = R.createElement as (...args: any[]) => React.ReactNode;
  const realType = type === FRAGMENT_SENTINEL ? R.Fragment : type;

  if (key !== undefined) (props as any).key = key;

  if (children === undefined) {
    return createElement(realType, props);
  }

  return Array.isArray(children)
    ? createElement(realType, props, ...children)
    : createElement(realType, props, children);
}

export const jsxs = jsx;
// jsxDEV is the dev-mode variant (extra source info); delegate to jsx.
export const jsxDEV = jsx;
