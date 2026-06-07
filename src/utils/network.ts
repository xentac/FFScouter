import { ffconfig } from "./ffconfig";
import logger from "./logger";

const log = logger.child("network");

const pageWindow: any =
  typeof unsafeWindow !== "undefined"
    ? unsafeWindow
    : typeof globalThis !== "undefined"
      ? globalThis
      : typeof window !== "undefined"
        ? window
        : undefined;

export type MatchPredicate =
  | string
  | RegExp
  | ((url: string, init?: RequestInit) => boolean);

export interface HttpInterceptor {
  name?: string;
  priority?: number; // Higher numbers run first
  match?: MatchPredicate;
  needBody?:
    | boolean
    | ((ctx: {
        url: string;
        init: RequestInit;
        response: Response;
      }) => boolean);

  before?: (
    url: string,
    init: RequestInit | undefined,
  ) =>
    | undefined
    | string
    | RequestInit
    | {
        url?: string;
        init?: RequestInit;
      }
    | Response
    | Promise<
        | undefined
        | string
        | RequestInit
        | {
            url?: string;
            init?: RequestInit;
          }
        | Response
      >;

  after?: (
    bodyText: string | null,
    response: Response,
    ctx: { url: string; init: RequestInit; response: Response },
  ) => string | Response | undefined | Promise<string | Response | undefined>;
}

export interface WebSocketInterceptor {
  name?: string;
  priority?: number; // Higher numbers run first
  match?: string | RegExp | ((url: string) => boolean);

  beforeSend?: (data: unknown, socket: WebSocket) => unknown;
  afterMessage?: (
    data: unknown,
    event: MessageEvent,
    socket: WebSocket,
  ) => unknown;
}

// Global Registries
export const httpInterceptors: HttpInterceptor[] = [];
export const wsInterceptors: WebSocketInterceptor[] = [];

export function registerHttpInterceptor(interceptor: HttpInterceptor): void {
  httpInterceptors.push(interceptor);
  // Sort by priority (higher priority first)
  httpInterceptors.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

export function unregisterHttpInterceptor(name: string): void {
  const index = httpInterceptors.findIndex((i) => i.name === name);
  if (index !== -1) {
    httpInterceptors.splice(index, 1);
  }
}

export function registerWebSocketInterceptor(
  interceptor: WebSocketInterceptor,
): void {
  wsInterceptors.push(interceptor);
  // Sort by priority (higher priority first)
  wsInterceptors.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

export function unregisterWebSocketInterceptor(name: string): void {
  const index = wsInterceptors.findIndex((i) => i.name === name);
  if (index !== -1) {
    wsInterceptors.splice(index, 1);
  }
}

// Backward Compatibility
export function setHttpInterceptor(interceptor: HttpInterceptor): void {
  registerHttpInterceptor(interceptor);
}

export function setWebSocketInterceptor(
  interceptor: WebSocketInterceptor,
): void {
  registerWebSocketInterceptor(interceptor);
}

export function hasHttpInterceptor(): boolean {
  return httpInterceptors.length > 0;
}

export function hasWebSocketInterceptor(): boolean {
  return wsInterceptors.length > 0;
}

function matchesUrl(
  url: string,
  init: RequestInit | undefined,
  predicate: MatchPredicate | undefined,
): boolean {
  if (predicate === undefined) return true;
  if (typeof predicate === "string") {
    return url.includes(predicate);
  }
  if (predicate && typeof (predicate as any).test === "function") {
    return (predicate as any).test(url);
  }
  if (typeof predicate === "function") {
    return predicate(url, init);
  }
  return false;
}

function matchesWsUrl(
  url: string,
  predicate: string | RegExp | ((url: string) => boolean) | undefined,
): boolean {
  if (predicate === undefined) return true;
  if (typeof predicate === "string") {
    return url.includes(predicate);
  }
  if (predicate && typeof (predicate as any).test === "function") {
    return (predicate as any).test(url);
  }
  if (typeof predicate === "function") {
    return predicate(url);
  }
  return false;
}

// Patches
export function initNetworkInterception(force = false): void {
  if (!pageWindow) return;

  const currentFetch = pageWindow.fetch;
  if (currentFetch && (force || !(currentFetch as any).__isPatched)) {
    patchFetch();
  }

  const currentXHR = pageWindow.XMLHttpRequest;
  if (currentXHR && (force || !(currentXHR as any).__isPatched)) {
    patchXMLHttpRequest();
  }

  const currentWS = pageWindow.WebSocket;
  if (currentWS && (force || !(currentWS as any).__isPatched)) {
    patchWebSocket();
  }
}

function patchFetch(): void {
  try {
    const originalFetch = pageWindow.fetch;
    if (!originalFetch || (originalFetch as any).__isPatched) return;

    const patched = async function patchedFetch(
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> {
      if (
        !ffconfig.network_interception_enabled ||
        httpInterceptors.length === 0
      ) {
        return originalFetch(input, init);
      }

      const requestIsObj = input instanceof Request;
      let currentUrl = requestIsObj
        ? (input as Request).url
        : typeof input === "string"
          ? input
          : input.toString();
      let currentInit = init;

      // 1. RUN BEFORE HOOKS
      for (const interceptor of httpInterceptors) {
        if (
          interceptor.before &&
          matchesUrl(currentUrl, currentInit, interceptor.match)
        ) {
          try {
            const res = await interceptor.before(currentUrl, currentInit);
            if (res instanceof Response) {
              return res; // Mock response short-circuit
            }
            if (typeof res === "string") {
              currentUrl = res;
            } else if (res) {
              if ("url" in res && res.url) {
                currentUrl = res.url;
              }
              if ("init" in res && res.init) {
                currentInit = res.init;
              } else if (!("url" in res)) {
                currentInit = res as RequestInit;
              }
            }
          } catch (err) {
            log.error(
              `HTTP before interceptor error in ${interceptor.name || "unnamed"}:`,
              err,
            );
          }
        }
      }

      // Reconstruct Request safely if input was a Request object and parameters changed
      let finalRequest: RequestInfo | URL;
      if (requestIsObj) {
        const originalRequest = input as Request;
        if (currentUrl !== originalRequest.url || currentInit !== init) {
          const newInit: RequestInit = {
            method: originalRequest.method,
            headers: originalRequest.headers,
            body: originalRequest.body,
            credentials: originalRequest.credentials,
            mode: originalRequest.mode,
            cache: originalRequest.cache,
            redirect: originalRequest.redirect,
            referrer: originalRequest.referrer,
            referrerPolicy: originalRequest.referrerPolicy,
            integrity: originalRequest.integrity,
            signal: originalRequest.signal,
            ...currentInit,
          };
          if (
            newInit.body &&
            originalRequest.method !== "GET" &&
            originalRequest.method !== "HEAD"
          ) {
            (newInit as any).duplex = "half";
          }
          finalRequest = new Request(currentUrl, newInit);
        } else {
          finalRequest = originalRequest;
        }
      } else {
        finalRequest = currentUrl;
      }

      const response = requestIsObj
        ? await originalFetch(finalRequest)
        : await originalFetch(finalRequest, currentInit);

      // 2. RUN AFTER HOOKS
      const matchedAfterInterceptors = [];
      let needsBody = false;
      const resContextInit = currentInit ?? {};
      for (const interceptor of httpInterceptors) {
        if (
          interceptor.after &&
          matchesUrl(currentUrl, currentInit, interceptor.match)
        ) {
          matchedAfterInterceptors.push(interceptor);
          if (interceptor.needBody !== undefined) {
            const resContext = {
              url: currentUrl,
              init: resContextInit,
              response,
            };
            if (typeof interceptor.needBody === "function") {
              if (interceptor.needBody(resContext)) {
                needsBody = true;
              }
            } else if (interceptor.needBody) {
              needsBody = true;
            }
          } else {
            needsBody = true;
          }
        }
      }

      if (matchedAfterInterceptors.length === 0) return response;

      let bodyText: string | null = null;
      if (needsBody) {
        const contentType = response.headers.get("content-type") || "";
        const isBinaryOrStream =
          contentType.includes("image/") ||
          contentType.includes("video/") ||
          contentType.includes("audio/") ||
          contentType.includes("application/octet-stream") ||
          contentType.includes("application/zip") ||
          contentType.includes("application/pdf") ||
          contentType.includes("text/event-stream");

        if (!isBinaryOrStream) {
          try {
            bodyText = await response.clone().text();
          } catch (err) {
            log.error("Failed reading response body for interceptor:", err);
          }
        }
      }

      let currentResponse = response;
      let currentBody = bodyText;

      for (const interceptor of matchedAfterInterceptors) {
        try {
          const resContext = {
            url: currentUrl,
            init: resContextInit,
            response: currentResponse,
          };
          const maybeNew = await interceptor.after!(
            currentBody,
            currentResponse,
            resContext,
          );
          if (maybeNew instanceof Response) {
            currentResponse = maybeNew;
            currentBody = null; // Re-evaluate text body if needed (or assume consumed)
          } else if (typeof maybeNew === "string") {
            currentBody = maybeNew;

            const cleanHeaders = new Headers(currentResponse.headers);
            cleanHeaders.delete("content-encoding");
            cleanHeaders.delete("content-length");

            const modified = new Response(maybeNew, {
              status: currentResponse.status,
              statusText: currentResponse.statusText,
              headers: cleanHeaders,
            });

            Object.defineProperty(modified, "url", {
              value: currentResponse.url,
            });
            Object.defineProperty(modified, "redirected", {
              value: currentResponse.redirected,
            });
            Object.defineProperty(modified, "type", {
              value: currentResponse.type,
            });

            currentResponse = modified;
          }
        } catch (err) {
          log.error(
            `HTTP after interceptor error in ${interceptor.name || "unnamed"}:`,
            err,
          );
        }
      }

      return currentResponse;
    };
    (patched as any).__isPatched = true;
    (pageWindow as any).fetch = patched;
    log.debug("Fetch patched for network interception");
  } catch (err) {
    log.error("Failed to patch fetch:", err);
  }
}

function patchXMLHttpRequest(): void {
  try {
    const OriginalXHR = pageWindow.XMLHttpRequest;
    if (!OriginalXHR || (OriginalXHR as any).__isPatched) return;

    class PatchedXMLHttpRequest implements XMLHttpRequest {
      private readonly _xhr: XMLHttpRequest;
      private _method = "";
      private _url = "";
      private _async = true;
      private _requestHeaders: Record<string, string> = {};

      private _isIntercepted = false;
      private _status = 0;
      private _statusText = "";
      private _responseHeaders = "";
      private _response: any = null;
      private _responseText = "";
      private _responseXML: Document | null = null;

      private readonly _listeners: Record<
        string,
        Set<EventListenerOrEventListenerObject>
      > = {};
      private _onreadystatechange:
        | ((this: XMLHttpRequest, ev: Event) => any)
        | null = null;
      private _onload: ((this: XMLHttpRequest, ev: Event) => any) | null = null;
      private _onloadstart: ((this: XMLHttpRequest, ev: Event) => any) | null =
        null;
      private _onprogress:
        | ((this: XMLHttpRequest, ev: ProgressEvent) => any)
        | null = null;
      private _onabort: ((this: XMLHttpRequest, ev: Event) => any) | null =
        null;
      private _onerror: ((this: XMLHttpRequest, ev: Event) => any) | null =
        null;
      private _ontimeout: ((this: XMLHttpRequest, ev: Event) => any) | null =
        null;
      private _onloadend: ((this: XMLHttpRequest, ev: Event) => any) | null =
        null;

      static readonly UNSENT = 0;
      static readonly OPENED = 1;
      static readonly HEADERS_RECEIVED = 2;
      static readonly LOADING = 3;
      static readonly DONE = 4;

      readonly UNSENT = 0;
      readonly OPENED = 1;
      readonly HEADERS_RECEIVED = 2;
      readonly LOADING = 3;
      readonly DONE = 4;

      constructor() {
        this._xhr = new OriginalXHR();
        this._setupNativeListeners();
      }

      get readyState() {
        return this._xhr.readyState;
      }
      get responseType() {
        return this._xhr.responseType;
      }
      set responseType(val) {
        this._xhr.responseType = val;
      }
      get timeout() {
        return this._xhr.timeout;
      }
      set timeout(val) {
        this._xhr.timeout = val;
      }
      get withCredentials() {
        return this._xhr.withCredentials;
      }
      set withCredentials(val) {
        this._xhr.withCredentials = val;
      }
      get upload() {
        return this._xhr.upload;
      }
      get responseURL() {
        return this._xhr.responseURL;
      }

      get status() {
        return this._isIntercepted ? this._status : this._xhr.status;
      }
      get statusText() {
        return this._isIntercepted ? this._statusText : this._xhr.statusText;
      }
      get response() {
        return this._isIntercepted ? this._response : this._xhr.response;
      }
      get responseText() {
        return this._isIntercepted
          ? this._responseText
          : this._xhr.responseText;
      }
      get responseXML() {
        return this._isIntercepted ? this._responseXML : this._xhr.responseXML;
      }

      open(
        method: string,
        url: string | URL,
        async = true,
        username?: string | null,
        password?: string | null,
      ): void {
        this._method = method;
        this._url = url.toString();
        this._async = async;

        if (!ffconfig.network_interception_enabled) {
          if (username !== undefined) {
            this._xhr.open(method, url, async, username, password);
          } else {
            this._xhr.open(method, url, async);
          }
          return;
        }

        let finalUrl = this._url;
        let finalMethod = this._method;

        for (const interceptor of httpInterceptors) {
          if (
            interceptor.before &&
            matchesUrl(
              this._url,
              {
                method: this._method,
                headers: new Headers(this._requestHeaders),
              },
              interceptor.match,
            )
          ) {
            try {
              const res = interceptor.before(this._url, {
                method: this._method,
                headers: new Headers(this._requestHeaders),
              });
              if (typeof res === "string") {
                finalUrl = res;
              } else if (
                res &&
                !(res instanceof Response) &&
                typeof res === "object"
              ) {
                const resObj = res as any;
                if (resObj.url) finalUrl = resObj.url;
                if (resObj.init) {
                  const initObj = resObj.init as RequestInit;
                  if (initObj.method) finalMethod = initObj.method;
                  if (initObj.headers) {
                    const headers = new Headers(initObj.headers);
                    headers.forEach((val, key) => {
                      this._requestHeaders[key] = val;
                    });
                  }
                } else if (!("url" in resObj)) {
                  const initObj = resObj as RequestInit;
                  if (initObj.method) finalMethod = initObj.method;
                  if (initObj.headers) {
                    const headers = new Headers(initObj.headers);
                    headers.forEach((val, key) => {
                      this._requestHeaders[key] = val;
                    });
                  }
                }
              }
            } catch (err) {
              log.error(
                `XHR before interceptor error in ${interceptor.name || "unnamed"}:`,
                err,
              );
            }
          }
        }

        if (username !== undefined) {
          this._xhr.open(
            finalMethod,
            finalUrl,
            this._async,
            username,
            password,
          );
        } else {
          this._xhr.open(finalMethod, finalUrl, this._async);
        }
      }

      setRequestHeader(name: string, value: string): void {
        this._requestHeaders[name] = value;
        this._xhr.setRequestHeader(name, value);
      }

      send(body?: any): void {
        this._xhr.send(body);
      }

      abort(): void {
        this._xhr.abort();
      }

      getAllResponseHeaders(): string {
        return this._isIntercepted
          ? this._responseHeaders
          : this._xhr.getAllResponseHeaders();
      }

      getResponseHeader(name: string): string | null {
        const headersStr = this.getAllResponseHeaders();
        if (!headersStr) return null;
        const lines = headersStr.split("\r\n");
        for (const line of lines) {
          const parts = line.split(":");
          if (
            parts[0] &&
            parts[0].trim().toLowerCase() === name.toLowerCase()
          ) {
            return parts.slice(1).join(":").trim();
          }
        }
        return null;
      }

      overrideMimeType(mime: string): void {
        this._xhr.overrideMimeType(mime);
      }

      addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        _options?: boolean | AddEventListenerOptions,
      ): void {
        if (!this._listeners[type]) {
          this._listeners[type] = new Set();
        }
        this._listeners[type].add(listener);
      }

      removeEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        _options?: boolean | EventListenerOptions,
      ): void {
        if (this._listeners[type]) {
          this._listeners[type].delete(listener);
        }
      }

      dispatchEvent(event: Event): boolean {
        const type = event.type;
        const listeners = this._listeners[type];
        if (!listeners && !this._hasAttributeHandler(type)) return true;

        const proxyEvent = new Proxy(event, {
          get: (target, prop) => {
            if (prop === "target" || prop === "currentTarget") return this;
            const val = Reflect.get(target, prop);
            return typeof val === "function" ? val.bind(target) : val;
          },
        });

        const attrHandler = this._getAttributeHandler(type);
        if (attrHandler) {
          try {
            attrHandler.call(this as any, proxyEvent);
          } catch (err) {
            log.error(`Error in on${type} handler:`, err);
          }
        }

        if (listeners) {
          for (const listener of listeners) {
            try {
              if (typeof listener === "function") {
                listener.call(this, proxyEvent);
              } else if (
                listener &&
                typeof listener.handleEvent === "function"
              ) {
                listener.handleEvent(proxyEvent);
              }
            } catch (err) {
              log.error(`Error in ${type} event listener:`, err);
            }
          }
        }
        return !proxyEvent.defaultPrevented;
      }

      get onreadystatechange() {
        return this._onreadystatechange;
      }
      set onreadystatechange(val) {
        this._onreadystatechange = val;
      }
      get onload() {
        return this._onload;
      }
      set onload(val) {
        this._onload = val;
      }
      get onloadstart() {
        return this._onloadstart;
      }
      set onloadstart(val) {
        this._onloadstart = val;
      }
      get onprogress() {
        return this._onprogress;
      }
      set onprogress(val) {
        this._onprogress = val;
      }
      get onabort() {
        return this._onabort;
      }
      set onabort(val) {
        this._onabort = val;
      }
      get onerror() {
        return this._onerror;
      }
      set onerror(val) {
        this._onerror = val;
      }
      get ontimeout() {
        return this._ontimeout;
      }
      set ontimeout(val) {
        this._ontimeout = val;
      }
      get onloadend() {
        return this._onloadend;
      }
      set onloadend(val) {
        this._onloadend = val;
      }

      private _hasAttributeHandler(type: string): boolean {
        return this._getAttributeHandler(type) !== null;
      }

      private _getAttributeHandler(
        type: string,
      ): ((this: XMLHttpRequest, ev: any) => any) | null {
        switch (type) {
          case "readystatechange":
            return this._onreadystatechange;
          case "load":
            return this._onload;
          case "loadstart":
            return this._onloadstart;
          case "progress":
            return this._onprogress;
          case "abort":
            return this._onabort;
          case "error":
            return this._onerror;
          case "timeout":
            return this._ontimeout;
          case "loadend":
            return this._onloadend;
          default:
            return null;
        }
      }

      private _setupNativeListeners(): void {
        const passthroughEvents = [
          "loadstart",
          "progress",
          "abort",
          "error",
          "timeout",
        ];
        for (const eventName of passthroughEvents) {
          this._xhr.addEventListener(eventName, (e) => {
            if (this.readyState < 4) {
              this.dispatchEvent(e);
            }
          });
        }

        this._xhr.addEventListener("readystatechange", (e) => {
          if (this.readyState === 4) {
            this._handleCompletion();
          } else {
            this.dispatchEvent(e);
          }
        });
      }

      private async _handleCompletion(): Promise<void> {
        if (!this._async || !ffconfig.network_interception_enabled) {
          this.dispatchEvent(new Event("readystatechange"));
          this.dispatchEvent(new Event("load"));
          this.dispatchEvent(new Event("loadend"));
          return;
        }

        const matchedAfterInterceptors = [];
        let needsBody = false;
        const resContextInit = {
          method: this._method,
          headers: new Headers(this._requestHeaders),
        };

        for (const interceptor of httpInterceptors) {
          if (
            interceptor.after &&
            matchesUrl(this._url, resContextInit, interceptor.match)
          ) {
            matchedAfterInterceptors.push(interceptor);
            if (interceptor.needBody !== undefined) {
              const dummyResponse = new Response("", {
                status: this._xhr.status,
                statusText: this._xhr.statusText,
                headers: this._parseResponseHeaders(
                  this._xhr.getAllResponseHeaders(),
                ),
              });
              const resContext = {
                url: this._url,
                init: resContextInit,
                response: dummyResponse,
              };
              if (typeof interceptor.needBody === "function") {
                if (interceptor.needBody(resContext)) {
                  needsBody = true;
                }
              } else if (interceptor.needBody) {
                needsBody = true;
              }
            } else {
              needsBody = true;
            }
          }
        }

        if (matchedAfterInterceptors.length === 0) {
          this.dispatchEvent(new Event("readystatechange"));
          this.dispatchEvent(new Event("load"));
          this.dispatchEvent(new Event("loadend"));
          return;
        }

        let rawResponseText = "";
        if (needsBody && this._xhr.status > 0) {
          try {
            const type = this._xhr.responseType;
            if (type === "" || type === "text") {
              rawResponseText = this._xhr.responseText;
            } else if (type === "json") {
              rawResponseText = JSON.stringify(this._xhr.response);
            } else if (type === "arraybuffer") {
              rawResponseText = new TextDecoder("utf-8").decode(
                this._xhr.response,
              );
            } else if (type === "blob") {
              rawResponseText = await (this._xhr.response as Blob).text();
            } else if (type === "document") {
              rawResponseText = new XMLSerializer().serializeToString(
                this._xhr.response,
              );
            }
          } catch (err) {
            log.error("Failed to read response body for XHR interceptor:", err);
          }
        }

        let currentResponseText = rawResponseText;
        let currentResponse = new Response(rawResponseText, {
          status: this._xhr.status,
          statusText: this._xhr.statusText,
          headers: this._parseResponseHeaders(
            this._xhr.getAllResponseHeaders(),
          ),
        });

        for (const interceptor of matchedAfterInterceptors) {
          try {
            const resContext = {
              url: this._url,
              init: resContextInit,
              response: currentResponse,
            };
            const maybeNew = await interceptor.after!(
              currentResponseText,
              currentResponse,
              resContext,
            );
            if (maybeNew instanceof Response) {
              currentResponse = maybeNew;
              currentResponseText = await maybeNew.clone().text();
            } else if (typeof maybeNew === "string") {
              currentResponseText = maybeNew;
              currentResponse = new Response(maybeNew, {
                status: currentResponse.status,
                statusText: currentResponse.statusText,
                headers: currentResponse.headers,
              });
            }
          } catch (err) {
            log.error(
              `XHR after interceptor error in ${interceptor.name || "unnamed"}:`,
              err,
            );
          }
        }

        if (currentResponseText !== rawResponseText) {
          this._isIntercepted = true;
          this._status = this._xhr.status;
          this._statusText = this._xhr.statusText;
          this._responseHeaders = this._xhr.getAllResponseHeaders();
          this._responseText = currentResponseText;

          const type = this._xhr.responseType;
          try {
            if (type === "" || type === "text") {
              this._response = currentResponseText;
            } else if (type === "json") {
              this._response = JSON.parse(currentResponseText);
            } else if (type === "arraybuffer") {
              this._response = new TextEncoder().encode(
                currentResponseText,
              ).buffer;
            } else if (type === "blob") {
              this._response = new Blob([currentResponseText], {
                type:
                  this._xhr.getResponseHeader("content-type") || "text/plain",
              });
            } else if (type === "document") {
              const parser = new DOMParser();
              const mime =
                this._xhr.getResponseHeader("content-type")?.split(";")[0] ||
                "text/xml";
              this._responseXML = parser.parseFromString(
                currentResponseText,
                mime as any,
              );
              this._response = this._responseXML;
            }
          } catch (err) {
            log.error(
              "Failed to convert modified response text to type:",
              type,
              err,
            );
            this._isIntercepted = false;
          }
        }

        this.dispatchEvent(new Event("readystatechange"));
        this.dispatchEvent(new Event("load"));
        this.dispatchEvent(new Event("loadend"));
      }

      private _parseResponseHeaders(headersStr: string): Headers {
        const headers = new Headers();
        if (!headersStr) return headers;
        const lines = headersStr.split("\r\n");
        for (const line of lines) {
          if (!line.trim()) continue;
          const index = line.indexOf(":");
          if (index > -1) {
            const key = line.substring(0, index).trim();
            const val = line.substring(index + 1).trim();
            headers.append(key, val);
          }
        }
        return headers;
      }
    }

    PatchedXMLHttpRequest.prototype.constructor = OriginalXHR;
    Object.defineProperty(PatchedXMLHttpRequest, "__isPatched", {
      value: true,
      enumerable: false,
    });

    (pageWindow as any).XMLHttpRequest = PatchedXMLHttpRequest as any;
    log.debug("XMLHttpRequest patched for network interception");
  } catch (err) {
    log.error("Failed to patch XMLHttpRequest:", err);
  }
}

function patchWebSocket(): void {
  try {
    const OriginalWS = pageWindow.WebSocket;
    if (!OriginalWS || (OriginalWS as any).__isPatched) return;

    const onmessageHandlerSym = Symbol("onmessageHandler");
    const onmessageWrappedSym = Symbol("onmessageWrapped");
    const listenersMapSym = Symbol("listenersMap");

    function getWrappedListener(
      socket: WebSocket,
      listener: EventListenerOrEventListenerObject,
    ): EventListenerOrEventListenerObject {
      if (
        typeof listener !== "function" &&
        (!listener || typeof listener.handleEvent !== "function")
      ) {
        return listener;
      }

      let map = (socket as any)[listenersMapSym];
      if (!map) {
        map = new WeakMap();
        (socket as any)[listenersMapSym] = map;
      }

      if (map.has(listener)) {
        return map.get(listener)!;
      }

      const socketInstance = socket;
      const wrapped = function (this: WebSocket, event: Event) {
        const msgEvent = event as MessageEvent;
        if (!ffconfig.network_interception_enabled) {
          if (typeof listener === "function") {
            listener.call(this || socketInstance, msgEvent);
          } else {
            listener.handleEvent(msgEvent);
          }
          return;
        }
        let currentData = msgEvent.data;
        let modified = false;

        for (const interceptor of wsInterceptors) {
          if (
            interceptor.afterMessage &&
            matchesWsUrl(socketInstance.url, interceptor.match)
          ) {
            try {
              const proxyEvent = new Proxy(msgEvent, {
                get(target, prop, receiver) {
                  if (prop === "data") return currentData;
                  const val = Reflect.get(target, prop, receiver);
                  return typeof val === "function" ? val.bind(target) : val;
                },
              });
              const maybe = interceptor.afterMessage(
                currentData,
                proxyEvent,
                this || socketInstance,
              );
              if (maybe !== undefined) {
                currentData = maybe;
                modified = true;
              }
            } catch (err) {
              log.error(
                `WS afterMessage interceptor error in ${interceptor.name || "unnamed"}:`,
                err,
              );
            }
          }
        }

        let finalEvent: MessageEvent = msgEvent;
        if (modified && currentData !== msgEvent.data) {
          finalEvent = new Proxy(msgEvent, {
            get(target, prop, receiver) {
              if (prop === "data") return currentData;
              if (prop === "target" || prop === "currentTarget")
                return this || socketInstance;
              const val = Reflect.get(target, prop, receiver);
              return typeof val === "function" ? val.bind(target) : val;
            },
          }) as any;
        }

        if (typeof listener === "function") {
          listener.call(this || socketInstance, finalEvent);
        } else {
          listener.handleEvent(finalEvent);
        }
      } as unknown as EventListener;

      map.set(listener, wrapped);
      return wrapped;
    }

    const WrappedWS = function WebSocket(this: any, ...args: any[]) {
      if (!new.target) {
        throw new TypeError(
          "Failed to construct 'WebSocket': Please use the 'new' operator.",
        );
      }
      return Reflect.construct(OriginalWS, args, new.target);
    } as unknown as typeof WebSocket;

    WrappedWS.prototype = Object.create(OriginalWS.prototype);
    WrappedWS.prototype.constructor = WrappedWS;

    const states = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"] as const;
    for (const state of states) {
      Object.defineProperty(WrappedWS, state, {
        value: OriginalWS[state],
        writable: false,
        enumerable: true,
        configurable: false,
      });
    }

    const originalSend = OriginalWS.prototype.send;
    WrappedWS.prototype.send = function (this: WebSocket, data: any) {
      if (!ffconfig.network_interception_enabled) {
        originalSend.call(this, data);
        return;
      }
      let currentData = data;
      for (const interceptor of wsInterceptors) {
        if (
          interceptor.beforeSend &&
          matchesWsUrl(this.url, interceptor.match)
        ) {
          try {
            const maybe = interceptor.beforeSend(currentData, this);
            if (maybe !== undefined) {
              currentData = maybe;
            }
          } catch (err) {
            log.error(
              `WS beforeSend interceptor error in ${interceptor.name || "unnamed"}:`,
              err,
            );
          }
        }
      }
      originalSend.call(this, currentData);
    };

    const originalAddEventListener = OriginalWS.prototype.addEventListener;
    WrappedWS.prototype.addEventListener = function (
      this: WebSocket,
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) {
      if (type === "message") {
        const wrapped = getWrappedListener(this, listener);
        originalAddEventListener.call(this, type, wrapped, options);
      } else {
        originalAddEventListener.call(this, type, listener, options);
      }
    };

    const originalRemoveEventListener =
      OriginalWS.prototype.removeEventListener;
    WrappedWS.prototype.removeEventListener = function (
      this: WebSocket,
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions,
    ) {
      if (type === "message") {
        const map = (this as any)[listenersMapSym];
        const wrapped = map ? map.get(listener) : null;
        originalRemoveEventListener.call(
          this,
          type,
          wrapped || listener,
          options,
        );
        if (map && wrapped) {
          map.delete(listener);
        }
      } else {
        originalRemoveEventListener.call(this, type, listener, options);
      }
    };

    Object.defineProperty(WrappedWS.prototype, "onmessage", {
      configurable: true,
      enumerable: true,
      get(this: WebSocket) {
        return (this as any)[onmessageHandlerSym] ?? null;
      },
      set(
        this: WebSocket,
        handler: ((this: WebSocket, ev: MessageEvent) => any) | null,
      ) {
        const self = this as any;
        if (self[onmessageWrappedSym]) {
          this.removeEventListener("message", self[onmessageWrappedSym]);
          self[onmessageWrappedSym] = null;
        }

        if (typeof handler === "function") {
          self[onmessageHandlerSym] = handler;
          const wrapper = function (this: WebSocket, ev: MessageEvent) {
            return handler.call(this, ev);
          };
          self[onmessageWrappedSym] = wrapper;
          this.addEventListener("message", wrapper);
        } else {
          self[onmessageHandlerSym] = null;
        }
      },
    });

    Object.defineProperty(WrappedWS, "__isPatched", {
      value: true,
      enumerable: false,
    });

    (pageWindow as any).WebSocket = WrappedWS;
    log.debug("WebSocket patched for network interception");
  } catch (err) {
    log.error("Failed to patch WebSocket:", err);
  }
}

// Auto-initialize on import
initNetworkInterception();
