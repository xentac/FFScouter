/// <reference types="vite/client" />

declare const __FF_SCOUTER_V2_VERSION__: string;
declare const __FF_SCOUTER_EDITION__: string;

interface PDAHttpResponse {
  status: number;
  statusText: string;
  responseText: string;
  responseHeaders: string;
}

interface Window {
  navigation?: any;
  PDA_httpGet?: (url: string, headers?: Record<string, string>) => Promise<PDAHttpResponse>;
  PDA_httpPost?: (url: string, headers?: Record<string, string>, body?: unknown) => Promise<PDAHttpResponse>;
}
