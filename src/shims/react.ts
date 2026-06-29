import type * as ReactTypes from "react";

type UnsafeReact = typeof ReactTypes;

let _react: UnsafeReact | undefined;
function getReact(): UnsafeReact {
  // biome-ignore lint/suspicious/noAssignInExpressions: lazy init
  return (_react ??= (unsafeWindow as unknown as { React: UnsafeReact }).React);
}

// Proxy so every property access reads from unsafeWindow.React at call time,
// not at module evaluation time (which would be before React is on the window).
const ReactProxy = new Proxy({} as UnsafeReact, {
  get(_, prop: string) {
    return getReact()[prop as keyof UnsafeReact];
  },
});

export default ReactProxy;

// Named exports as wrapper functions so they're also lazy.
// The cast through unknown is necessary because TypeScript can't verify that
// a generic variadic wrapper satisfies the overloaded hook signatures.
export const useState = ((...args: unknown[]) =>
  getReact().useState(
    ...(args as Parameters<UnsafeReact["useState"]>),
  )) as unknown as UnsafeReact["useState"];

export const useEffect = ((...args: unknown[]) =>
  getReact().useEffect(
    ...(args as Parameters<UnsafeReact["useEffect"]>),
  )) as unknown as UnsafeReact["useEffect"];

export const useLayoutEffect = ((...args: unknown[]) =>
  getReact().useLayoutEffect(
    ...(args as Parameters<UnsafeReact["useLayoutEffect"]>),
  )) as unknown as UnsafeReact["useLayoutEffect"];

export const useRef = ((...args: unknown[]) =>
  getReact().useRef(
    ...(args as Parameters<UnsafeReact["useRef"]>),
  )) as unknown as UnsafeReact["useRef"];

export const useCallback = ((...args: unknown[]) =>
  getReact().useCallback(
    ...(args as Parameters<UnsafeReact["useCallback"]>),
  )) as unknown as UnsafeReact["useCallback"];

export const useMemo = ((...args: unknown[]) =>
  getReact().useMemo(
    ...(args as Parameters<UnsafeReact["useMemo"]>),
  )) as unknown as UnsafeReact["useMemo"];

export const useContext = ((...args: unknown[]) =>
  getReact().useContext(
    ...(args as Parameters<UnsafeReact["useContext"]>),
  )) as unknown as UnsafeReact["useContext"];

export const useReducer = ((...args: unknown[]) =>
  getReact().useReducer(
    ...(args as Parameters<UnsafeReact["useReducer"]>),
  )) as unknown as UnsafeReact["useReducer"];

export const useId = (() =>
  getReact().useId()) as unknown as UnsafeReact["useId"];

export const useDebugValue = ((...args: unknown[]) =>
  getReact().useDebugValue(
    ...(args as Parameters<UnsafeReact["useDebugValue"]>),
  )) as unknown as UnsafeReact["useDebugValue"];

export const useDeferredValue = ((...args: unknown[]) =>
  getReact().useDeferredValue(
    ...(args as Parameters<UnsafeReact["useDeferredValue"]>),
  )) as unknown as UnsafeReact["useDeferredValue"];

export const useTransition = (() =>
  getReact().useTransition()) as unknown as UnsafeReact["useTransition"];

export const useSyncExternalStore = ((...args: unknown[]) =>
  getReact().useSyncExternalStore(
    ...(args as Parameters<UnsafeReact["useSyncExternalStore"]>),
  )) as unknown as UnsafeReact["useSyncExternalStore"];

export const useImperativeHandle = ((...args: unknown[]) =>
  getReact().useImperativeHandle(
    ...(args as Parameters<UnsafeReact["useImperativeHandle"]>),
  )) as unknown as UnsafeReact["useImperativeHandle"];

export const createElement = ((...args: unknown[]) =>
  getReact().createElement(
    ...(args as Parameters<UnsafeReact["createElement"]>),
  )) as unknown as UnsafeReact["createElement"];

export const createContext = ((...args: unknown[]) =>
  getReact().createContext(
    ...(args as Parameters<UnsafeReact["createContext"]>),
  )) as unknown as UnsafeReact["createContext"];

export const createRef = (() =>
  getReact().createRef()) as unknown as UnsafeReact["createRef"];

export const memo = ((...args: unknown[]) =>
  getReact().memo(
    ...(args as Parameters<UnsafeReact["memo"]>),
  )) as unknown as UnsafeReact["memo"];

export const cloneElement = ((...args: unknown[]) =>
  getReact().cloneElement(
    ...(args as Parameters<UnsafeReact["cloneElement"]>),
  )) as unknown as UnsafeReact["cloneElement"];

export const isValidElement = ((...args: unknown[]) =>
  getReact().isValidElement(
    ...(args as Parameters<UnsafeReact["isValidElement"]>),
  )) as unknown as UnsafeReact["isValidElement"];

export const startTransition = ((...args: unknown[]) =>
  getReact().startTransition(
    ...(args as Parameters<UnsafeReact["startTransition"]>),
  )) as unknown as UnsafeReact["startTransition"];

// These are values (not functions), but they're accessed lazily via the Proxy
// default export. Re-export them as getters so named imports also stay lazy.
export const Fragment: UnsafeReact["Fragment"] = new Proxy(
  {} as UnsafeReact["Fragment"],
  {
    get: (_, prop) =>
      (getReact().Fragment as unknown as Record<string, unknown>)[
        prop as string
      ],
  },
);

export const StrictMode: UnsafeReact["StrictMode"] = new Proxy(
  {} as UnsafeReact["StrictMode"],
  {
    get: (_, prop) =>
      (getReact().StrictMode as unknown as Record<string, unknown>)[
        prop as string
      ],
  },
);

export const Suspense: UnsafeReact["Suspense"] = new Proxy(
  {} as UnsafeReact["Suspense"],
  {
    get: (_, prop) =>
      (getReact().Suspense as unknown as Record<string, unknown>)[
        prop as string
      ],
  },
);

export const Children: UnsafeReact["Children"] = new Proxy(
  {} as UnsafeReact["Children"],
  {
    get: (_, prop) =>
      (getReact().Children as unknown as Record<string, unknown>)[
        prop as string
      ],
  },
);
