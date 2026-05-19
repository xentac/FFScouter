import logger from "./logger";

// This was entirely vibe coded.

const pageWindow = (unsafeWindow as unknown as Window) || (window as Window);

export interface HttpInterceptor {
  before?: (
    url: string,
    init: RequestInit | undefined,
  ) =>
    | undefined
    | string
    | {
        url?: string;
        init?: RequestInit;
      };
  after?: (
    bodyText: string,
    response: Response,
    ctx: { url: string; init?: RequestInit },
  ) => string | Promise<string> | undefined | Promise<string | undefined>;
}

let httpInterceptor: HttpInterceptor | null = null;
let httpPatched = false;

export function setHttpInterceptor(interceptor: HttpInterceptor): void {
  if (httpInterceptor) {
    throw new Error("HTTP interceptor already set. Only one allowed.");
  }
  httpInterceptor = interceptor;
  if (!httpPatched) patchFetch();

  // TODO: Potentially look into adding XHR support
}

function patchFetch(): void {
  try {
    //@ts-expect-error TODO: maybe one day remove this :P
    const originalFetch: typeof fetch = pageWindow.fetch.bind(pageWindow);
    (pageWindow as Window & { fetch: typeof fetch }).fetch =
      async function patchedFetch(
        input: RequestInfo | URL,
        init?: RequestInit,
      ): Promise<Response> {
        if (!httpInterceptor) return originalFetch(input, init);

        const requestIsObj = input instanceof Request;
        let url = requestIsObj
          ? (input as Request).url
          : typeof input === "string"
            ? input
            : input.toString();
        let currentInit = init as RequestInit | undefined;

        if (
          requestIsObj &&
          !currentInit &&
          (httpInterceptor.before || httpInterceptor.after)
        ) {
          const r = input as Request;
          currentInit = {
            method: r.method,
            headers: r.headers as unknown as HeadersInit,
            body:
              r.method !== "GET" && r.method !== "HEAD"
                ? (r.clone().body as BodyInit | null)
                : undefined,
            credentials: r.credentials,
            mode: r.mode,
            cache: r.cache,
            redirect: r.redirect,
            referrer: r.referrer,
            referrerPolicy: r.referrerPolicy,
            integrity: (r as Request & { integrity?: string }).integrity,
          };
        }

        if (httpInterceptor.before) {
          try {
            const res = httpInterceptor.before(url, currentInit);
            if (typeof res === "string") url = res;
            else if (res) {
              if (res.url) url = res.url;
              if (res.init) currentInit = res.init;
            }
          } catch (err) {
            logger.error("HTTP before interceptor error:", err);
          }
        }

        const finalRequest: RequestInfo | URL = requestIsObj
          ? url === (input as Request).url && currentInit === init
            ? (input as Request)
            : new Request(url, currentInit ?? {})
          : url;

        const response = await originalFetch(finalRequest, currentInit);
        if (!httpInterceptor.after) return response;

        let bodyText = "";
        try {
          bodyText = await response.clone().text();
        } catch (err) {
          logger.error("Failed reading response body for interceptor:", err);
          return response;
        }

        try {
          const maybeNew = await httpInterceptor.after(bodyText, response, {
            url,
            init: currentInit,
          });
          if (typeof maybeNew === "string") {
            return new Response(maybeNew, {
              status: response.status,
              statusText: response.statusText,
              headers: new Headers(response.headers),
            });
          }
        } catch (err) {
          logger.error("HTTP after interceptor error:", err);
        }
        return response;
      } as typeof fetch;
    httpPatched = true;
    logger.debug("Fetch patched for HTTP interception");
  } catch (err) {
    logger.error("Failed to patch fetch:", err);
  }
}

export interface WebSocketInterceptor {
  beforeSend?: (data: unknown, socket: WebSocket) => unknown | undefined;
  afterMessage?: (
    data: unknown,
    event: MessageEvent,
    socket: WebSocket,
  ) => unknown | undefined;
}

let wsInterceptor: WebSocketInterceptor | null = null;
let wsPatched = false;

export function setWebSocketInterceptor(
  interceptor: WebSocketInterceptor,
): void {
  if (wsInterceptor)
    throw new Error("WebSocket interceptor already set. Only one allowed.");
  wsInterceptor = interceptor;
  if (!wsPatched) patchWebSocket();
}

function patchWebSocket(): void {
  try {
    const OriginalWS: typeof WebSocket = (
      pageWindow as Window & { WebSocket: typeof WebSocket }
    ).WebSocket;
    const WrappedWS = function (
      this: unknown,
      url: string | URL,
      protocols?: string | string[],
    ) {
      const socket: WebSocket = protocols
        ? new OriginalWS(url, protocols)
        : new OriginalWS(url);
      if (!wsInterceptor) return socket;

      const originalSend = socket.send.bind(socket);
      socket.send = function sendPatched(this: WebSocket, data: unknown): void {
        if (wsInterceptor?.beforeSend) {
          try {
            const maybe = wsInterceptor.beforeSend(data, socket);
            if (maybe !== undefined) data = maybe;
          } catch (err) {
            logger.error("WS beforeSend interceptor error:", err);
          }
        }
        (originalSend as (payload: unknown) => void)(data);
      };

      const originalAdd = socket.addEventListener.bind(socket);
      socket.addEventListener = function addEvent(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
      ): void {
        if (type !== "message" || !wsInterceptor?.afterMessage) {
          originalAdd(
            type,
            listener as EventListener,
            options as AddEventListenerOptions,
          );
          return;
        }
        const wrapped = (event: MessageEvent): void => {
          let newData: unknown;
          try {
            const maybe = wsInterceptor?.afterMessage?.(
              event.data,
              event,
              socket,
            );
            if (maybe !== undefined) newData = maybe;
          } catch (err) {
            logger.error("WS afterMessage interceptor error:", err);
          }
          if (newData !== undefined && newData !== event.data) {
            try {
              Object.defineProperty(event, "data", { value: newData });
            } catch {
              const synthetic = new MessageEvent("message", { data: newData });
              if (typeof listener === "function") {
                (listener as (e: MessageEvent) => unknown)(synthetic);
                return;
              }
              (listener as EventListenerObject).handleEvent?.(synthetic);
              return;
            }
          }
          if (typeof listener === "function") {
            (listener as (e: MessageEvent) => unknown)(event);
            return;
          }
          (listener as EventListenerObject).handleEvent?.(event);
        };
        originalAdd(
          type,
          wrapped as unknown as EventListener,
          options as AddEventListenerOptions,
        );
      };

      Object.defineProperty(socket, "onmessage", {
        configurable: true,
        get() {
          return undefined;
        },
        set(handler: ((this: WebSocket, ev: MessageEvent) => unknown) | null) {
          if (!handler) return;
          socket.addEventListener("message", (ev) => handler.call(socket, ev));
        },
      });

      return socket;
    } as unknown as typeof WebSocket;

    (["CONNECTING", "OPEN", "CLOSING", "CLOSED"] as const).forEach((k) => {
      try {
        (WrappedWS as unknown as Record<string, unknown>)[k] = (
          OriginalWS as unknown as Record<string, unknown>
        )[k];
      } catch {
        /* ignore */
      }
    });

    WrappedWS.prototype = OriginalWS.prototype;

    (pageWindow as Window & { WebSocket: typeof WebSocket }).WebSocket =
      WrappedWS;

    wsPatched = true;

    logger.debug("WebSocket patched for interception");
  } catch (err) {
    logger.error("Failed to patch WebSocket:", err);
  }
}

export function hasHttpInterceptor(): boolean {
  return !!httpInterceptor;
}
export function hasWebSocketInterceptor(): boolean {
  return !!wsInterceptor;
}
