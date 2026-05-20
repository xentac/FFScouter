import { setup } from "vitest-indexeddb";

setup();

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

