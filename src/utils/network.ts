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

// Patches
export function initNetworkInterception(_force = false): void {
  // Network interception has been fully disabled to prevent issues.
}

// Auto-initialize on import
initNetworkInterception();
