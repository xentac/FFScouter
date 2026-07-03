import type { JSX } from "react";

type PageReact = {
  createElement: (
    type: unknown,
    props: unknown,
    ...children: unknown[]
  ) => JSX.Element;
  Fragment: symbol;
};

let _react: PageReact | undefined;
function getReact(): PageReact {
  // biome-ignore lint/suspicious/noAssignInExpressions: lazy init
  return (_react ??= (unsafeWindow as unknown as { React: PageReact }).React);
}

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
  const realType = type === FRAGMENT_SENTINEL ? R.Fragment : type;

  if (key !== undefined) (props as any).key = key;

  if (children === undefined) {
    return R.createElement(realType, props);
  }

  return Array.isArray(children)
    ? R.createElement(realType, props, ...children)
    : R.createElement(realType, props, children);
}

export const jsxs = jsx;
// jsxDEV is the dev-mode variant (extra source info); delegate to jsx.
export const jsxDEV = jsx;
