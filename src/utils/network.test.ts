import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ffconfig } from "./ffconfig";
import {
  httpInterceptors,
  initNetworkInterception,
  registerHttpInterceptor,
  registerWebSocketInterceptor,
  unregisterHttpInterceptor,
  unregisterWebSocketInterceptor,
  wsInterceptors,
} from "./network";

describe("Network Interception Registry and Patches", () => {
  let originalFetch: typeof fetch;
  let originalXHR: typeof XMLHttpRequest;
  let originalWS: typeof WebSocket;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    originalXHR = globalThis.XMLHttpRequest;
    originalWS = globalThis.WebSocket;

    // Reset interceptor arrays
    httpInterceptors.length = 0;
    wsInterceptors.length = 0;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    globalThis.XMLHttpRequest = originalXHR;
    globalThis.WebSocket = originalWS;
    vi.restoreAllMocks();
  });

  test("should register and sort http interceptors by priority", () => {
    registerHttpInterceptor({ name: "low", priority: 1 });
    registerHttpInterceptor({ name: "high", priority: 10 });
    registerHttpInterceptor({ name: "medium", priority: 5 });

    expect(httpInterceptors[0]!.name).toBe("high");
    expect(httpInterceptors[1]!.name).toBe("medium");
    expect(httpInterceptors[2]!.name).toBe("low");

    unregisterHttpInterceptor("medium");
    expect(httpInterceptors.length).toBe(2);
    expect(httpInterceptors[1]!.name).toBe("low");
  });

  test("should register and sort websocket interceptors by priority", () => {
    registerWebSocketInterceptor({ name: "low", priority: 1 });
    registerWebSocketInterceptor({ name: "high", priority: 10 });

    expect(wsInterceptors[0]!.name).toBe("high");
    expect(wsInterceptors[1]!.name).toBe("low");

    unregisterWebSocketInterceptor("high");
    expect(wsInterceptors.length).toBe(1);
  });

  describe("Fetch Interception", () => {
    let fetchSpy: any;

    beforeEach(() => {
      // Mock original fetch
      fetchSpy = vi.fn().mockImplementation(async (input, _init) => {
        const url = input instanceof Request ? input.url : input.toString();
        return new Response(`response from ${url}`, {
          status: 200,
          headers: { "content-type": "text/plain" },
        });
      });
      globalThis.fetch = fetchSpy;
      initNetworkInterception(true);
    });

    test("should run before hook and modify URL", async () => {
      registerHttpInterceptor({
        name: "test-before",
        before: (url) => {
          if (url.includes("original-url")) {
            return "https://api.torn.com/modified-url";
          }
        },
      });

      const response = await fetch("https://api.torn.com/original-url");
      const text = await response.text();

      expect(text).toBe("response from https://api.torn.com/modified-url");
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.torn.com/modified-url",
        undefined,
      );
    });

    test("should support short-circuiting with mock response", async () => {
      registerHttpInterceptor({
        name: "mock-response",
        before: () => {
          return new Response("mocked data", { status: 418 });
        },
      });

      const response = await fetch("https://api.torn.com/some-url");
      expect(response.status).toBe(418);
      const text = await response.text();
      expect(text).toBe("mocked data");
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    test("should respect match filtering", async () => {
      registerHttpInterceptor({
        name: "match-only",
        match: /matching-url/,
        before: () => {
          return new Response("matched", { status: 200 });
        },
      });

      const res1 = await fetch("https://api.torn.com/other-url");
      expect(res1.status).toBe(200);
      expect(await res1.text()).toBe(
        "response from https://api.torn.com/other-url",
      );

      const res2 = await fetch("https://api.torn.com/matching-url");
      expect(res2.status).toBe(200);
      expect(await res2.text()).toBe("matched");
    });

    test("should run after hook and mutate response text", async () => {
      registerHttpInterceptor({
        name: "test-after",
        after: (body) => {
          return `${body} - mutated`;
        },
      });

      const response = await fetch("https://api.torn.com/data");
      const text = await response.text();

      expect(text).toBe("response from https://api.torn.com/data - mutated");
    });
  });

  describe("XMLHttpRequest Interception", () => {
    beforeEach(() => {
      // Basic mock of native XHR
      class MockNativeXHR {
        readyState = 0;
        status = 0;
        statusText = "";
        responseType = "";
        response = "";
        responseText = "";
        responseHeaders = "";
        _listeners: Record<string, Set<any>> = {};

        open(_method: string, _url: string) {
          this.readyState = 1;
          this.trigger("readystatechange");
        }
        setRequestHeader() {}
        send() {
          setTimeout(() => {
            this.readyState = 4;
            this.status = 200;
            this.statusText = "OK";
            this.responseText = "native xhr response";
            this.response = "native xhr response";
            this.trigger("readystatechange");
            this.trigger("load");
          }, 0);
        }
        getAllResponseHeaders() {
          return "content-type: text/plain\r\n";
        }
        getResponseHeader() {
          return "text/plain";
        }
        addEventListener(type: string, listener: any) {
          if (!this._listeners[type]) this._listeners[type] = new Set();
          this._listeners[type].add(listener);
        }
        removeEventListener(type: string, listener: any) {
          this._listeners[type]?.delete(listener);
        }
        trigger(type: string) {
          const listeners = this._listeners[type];
          if (listeners) {
            for (const l of listeners) {
              l({ type, target: this });
            }
          }
        }
      }

      globalThis.XMLHttpRequest = MockNativeXHR as any;
      initNetworkInterception(true);
    });

    test("should intercept XHR requests and mutate response", async () => {
      registerHttpInterceptor({
        name: "xhr-after",
        after: (body) => {
          return `${body} - xhr-mutated`;
        },
      });

      const xhr = new XMLHttpRequest();
      xhr.open("GET", "https://api.torn.com/xhr-data");

      const loadPromise = new Promise<void>((resolve) => {
        xhr.addEventListener("load", () => {
          resolve();
        });
      });

      xhr.send();
      await loadPromise;

      expect(xhr.responseText).toBe("native xhr response - xhr-mutated");
    });
  });

  describe("WebSocket Interception", () => {
    let nativeSendSpy: any;

    beforeEach(() => {
      nativeSendSpy = vi.fn();
      // Basic mock of native WebSocket
      class MockNativeWS {
        url: string;
        _listeners: Record<string, Set<any>> = {};
        onmessage: any = null;

        constructor(url: string) {
          this.url = url;
        }
        send(data: any) {
          nativeSendSpy(data);
        }
        addEventListener(type: string, listener: any) {
          if (!this._listeners[type]) this._listeners[type] = new Set();
          this._listeners[type].add(listener);
        }
        removeEventListener(type: string, listener: any) {
          this._listeners[type]?.delete(listener);
        }
        trigger(type: string, eventData: any) {
          const ev = { type, data: eventData, target: this };
          if (type === "message" && this.onmessage) {
            this.onmessage(ev);
          }
          const listeners = this._listeners[type];
          if (listeners) {
            for (const l of listeners) {
              if (typeof l === "function") {
                l(ev);
              } else if (l.handleEvent) {
                l.handleEvent(ev);
              }
            }
          }
        }
      }

      globalThis.WebSocket = MockNativeWS as any;
      initNetworkInterception(true);
    });

    test("should preserve ES6 subclassing", () => {
      class CustomWS extends WebSocket {}
      const socket = new CustomWS("ws://localhost/test");

      expect(socket).toBeInstanceOf(CustomWS);
      expect(socket.url).toBe("ws://localhost/test");
    });

    test("should intercept ws beforeSend", () => {
      registerWebSocketInterceptor({
        name: "ws-send",
        beforeSend: (data) => {
          return `${data} - send-mutated`;
        },
      });

      const socket = new WebSocket("ws://localhost/test");
      socket.send("hello");

      expect(nativeSendSpy).toHaveBeenCalledWith("hello - send-mutated");
    });

    test("should intercept ws afterMessage using onmessage getter/setter", () => {
      registerWebSocketInterceptor({
        name: "ws-message",
        afterMessage: (data) => {
          return `${data} - recv-mutated`;
        },
      });

      const socket = new WebSocket("ws://localhost/test");
      let receivedData = "";
      socket.onmessage = (event) => {
        receivedData = event.data;
      };

      // Getter test
      expect(socket.onmessage).not.toBeNull();

      // Trigger message
      (socket as any).trigger("message", "original message");
      expect(receivedData).toBe("original message - recv-mutated");
    });
  });

  describe("Bypass Interception when Disabled", () => {
    let fetchSpy: any;
    let nativeSendSpy: any;

    beforeEach(() => {
      // Setup fetch mock
      fetchSpy = vi.fn().mockImplementation(async (input, _init) => {
        const url = input instanceof Request ? input.url : input.toString();
        return new Response(`response from ${url}`, {
          status: 200,
          headers: { "content-type": "text/plain" },
        });
      });
      globalThis.fetch = fetchSpy;

      // Setup XHR mock
      class MockNativeXHR {
        readyState = 0;
        status = 0;
        statusText = "";
        responseType = "";
        response = "";
        responseText = "";
        _listeners: Record<string, Set<any>> = {};

        open(_method: string, _url: string) {
          this.readyState = 1;
          this.trigger("readystatechange");
        }
        setRequestHeader() {}
        send() {
          setTimeout(() => {
            this.readyState = 4;
            this.status = 200;
            this.statusText = "OK";
            this.responseText = "native xhr response";
            this.response = "native xhr response";
            this.trigger("readystatechange");
            this.trigger("load");
          }, 0);
        }
        getAllResponseHeaders() {
          return "content-type: text/plain\r\n";
        }
        getResponseHeader() {
          return "text/plain";
        }
        addEventListener(type: string, listener: any) {
          if (!this._listeners[type]) this._listeners[type] = new Set();
          this._listeners[type].add(listener);
        }
        removeEventListener(type: string, listener: any) {
          this._listeners[type]?.delete(listener);
        }
        trigger(type: string) {
          const listeners = this._listeners[type];
          if (listeners) {
            for (const l of listeners) {
              l({ type, target: this });
            }
          }
        }
      }
      globalThis.XMLHttpRequest = MockNativeXHR as any;

      // Setup WS mock
      nativeSendSpy = vi.fn();
      class MockNativeWS {
        url: string;
        _listeners: Record<string, Set<any>> = {};
        onmessage: any = null;

        constructor(url: string) {
          this.url = url;
        }
        send(data: any) {
          nativeSendSpy(data);
        }
        addEventListener(type: string, listener: any) {
          if (!this._listeners[type]) this._listeners[type] = new Set();
          this._listeners[type].add(listener);
        }
        removeEventListener(type: string, listener: any) {
          this._listeners[type]?.delete(listener);
        }
        trigger(type: string, eventData: any) {
          const ev = { type, data: eventData, target: this };
          if (type === "message" && this.onmessage) {
            this.onmessage(ev);
          }
          const listeners = this._listeners[type];
          if (listeners) {
            for (const l of listeners) {
              if (typeof l === "function") {
                l(ev);
              } else if (l.handleEvent) {
                l.handleEvent(ev);
              }
            }
          }
        }
      }
      globalThis.WebSocket = MockNativeWS as any;

      initNetworkInterception(true);

      // Disable interception via config
      ffconfig.network_interception_enabled = false;
    });

    afterEach(() => {
      ffconfig.network_interception_enabled = true;
    });

    test("should not intercept Fetch when disabled", async () => {
      registerHttpInterceptor({
        name: "bypass-fetch",
        before: () => {
          return new Response("interceptor-response", { status: 200 });
        },
        after: (body) => {
          return `${body} - mutated`;
        },
      });

      const res = await fetch("https://api.torn.com/data");
      const text = await res.text();

      expect(text).toBe("response from https://api.torn.com/data");
      expect(fetchSpy).toHaveBeenCalled();
    });

    test("should not intercept XHR when disabled", async () => {
      registerHttpInterceptor({
        name: "bypass-xhr",
        after: (body) => {
          return `${body} - mutated`;
        },
      });

      const xhr = new XMLHttpRequest();
      xhr.open("GET", "https://api.torn.com/xhr-data");

      const loadPromise = new Promise<void>((resolve) => {
        xhr.addEventListener("load", () => {
          resolve();
        });
      });

      xhr.send();
      await loadPromise;

      expect(xhr.responseText).toBe("native xhr response");
    });

    test("should not intercept WebSocket when disabled", () => {
      registerWebSocketInterceptor({
        name: "bypass-ws",
        beforeSend: (data) => {
          return `${data} - send-mutated`;
        },
        afterMessage: (data) => {
          return `${data} - recv-mutated`;
        },
      });

      const socket = new WebSocket("ws://localhost/test");
      let receivedData = "";
      socket.onmessage = (event) => {
        receivedData = event.data;
      };

      socket.send("hello");
      expect(nativeSendSpy).toHaveBeenCalledWith("hello");

      (socket as any).trigger("message", "original message");
      expect(receivedData).toBe("original message");
    });
  });
});
