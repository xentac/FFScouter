import { BroadcastChannel as NodeBroadcastChannel } from "node:worker_threads";
// @real-react* bypasses the unsafeWindow shim aliases to get the actual packages.
import * as React from "@real-react";
import * as ReactDOM from "@real-react-dom";
import * as ReactDOMClient from "@real-react-dom-client";
import { afterEach } from "vitest";
import { setup } from "vitest-indexeddb";

// React's scheduler runs deferred work via a MessageChannel macrotask. A
// render/unmount near the end of a test can leave a task queued that fires
// *after* the jsdom environment is torn down, throwing an unhandled
// "window is not defined" (and failing the whole run despite passing tests).
// Drain it by posting our OWN MessageChannel message: same-type macrotasks run
// FIFO, so our callback runs after React's pending task — a plain setTimeout
// does NOT reliably drain it (a timer macrotask can fire first). React also
// time-slices, so one drained task can schedule a continuation; loop a few
// rounds so those settle too. Registered here so every test file is covered
// without per-file teardown boilerplate.
function drainMacrotask(): Promise<void> {
  return new Promise<void>((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      resolve();
    };
    channel.port2.postMessage(undefined);
  });
}

afterEach(async () => {
  // Detach any mounted nodes first: custom elements (e.g. <ff-settings-panel>)
  // synchronously unmount their React root in disconnectedCallback, so no live
  // root survives into the file teardown. Then drain the scheduler's pending
  // MessageChannel task(s) so nothing fires against a torn-down window.
  if (typeof document !== "undefined") {
    document.body.innerHTML = "";
  }
  for (let i = 0; i < 5; i++) {
    await drainMacrotask();
  }
});

// The shims read from unsafeWindow.React / unsafeWindow.ReactDOM at call time.
// In tests there is no Tampermonkey, so we expose the devDependency build here.
// Merge react-dom and react-dom/client so the shim's createRoot call works.
const ReactDOMFull = { ...ReactDOM, ...ReactDOMClient };
(
  globalThis as unknown as {
    unsafeWindow: { React: unknown; ReactDOM: unknown };
  }
).unsafeWindow = { React, ReactDOM: ReactDOMFull };

setup();

if (typeof globalThis.BroadcastChannel === "undefined") {
  globalThis.BroadcastChannel = NodeBroadcastChannel as any;
}

// Polyfill localStorage if it's missing or incomplete (e.g. Node 25+ or Bun native stubs)
if (
  typeof globalThis.localStorage === "undefined" ||
  typeof globalThis.localStorage.clear !== "function"
) {
  const createLocalStorageMock = () => {
    const mock = Object.create(null);
    let store: Record<string, string> = {};

    Object.defineProperties(mock, {
      getItem: {
        value: (key: string) => store[key] ?? null,
        writable: true,
        configurable: true,
      },
      setItem: {
        value: (key: string, value: string) => {
          store[key] = String(value);
          Object.defineProperty(mock, key, {
            value: store[key],
            writable: true,
            configurable: true,
            enumerable: true,
          });
        },
        writable: true,
        configurable: true,
      },
      removeItem: {
        value: (key: string) => {
          delete store[key];
          delete mock[key];
        },
        writable: true,
        configurable: true,
      },
      clear: {
        value: () => {
          for (const key of Object.keys(store)) {
            delete mock[key];
          }
          store = {};
        },
        writable: true,
        configurable: true,
      },
      length: {
        get: () => Object.keys(store).length,
        configurable: true,
      },
      key: {
        value: (index: number) => Object.keys(store)[index] || null,
        writable: true,
        configurable: true,
      },
    });

    return mock;
  };

  const mockStorage = createLocalStorageMock();
  try {
    Object.defineProperty(globalThis, "localStorage", {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
  } catch {
    try {
      (globalThis as any).localStorage = mockStorage;
    } catch (e) {
      console.warn("Failed to polyfill localStorage:", e);
    }
  }
}
