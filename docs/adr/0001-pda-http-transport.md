# Dual HTTP transport: PDA_httpGet/Post in Torn PDA, GM_xmlhttpRequest elsewhere

`GM_xmlhttpRequest` returns an empty `{}` body with a non-200 status when called from a userscript running inside Torn PDA's Flutter WebView, making all ffscouter.com API calls fail silently. Torn PDA ships a userscript helper (`TornPDA_API.js`) that exposes `PDA_httpGet` and `PDA_httpPost` as window globals; these route requests through the native mobile HTTP stack and return a response object with the same shape as `GM_xmlhttpRequest`'s `onload` payload (`status`, `statusText`, `responseText`, `responseHeaders`). We detect the PDA environment by checking `typeof window.PDA_httpGet === "function"` at call time in `gmRequest`, and dispatch to whichever transport is available. `GM_xmlhttpRequest` remains the path for all other environments (desktop browsers, other userscript managers).

## Considered Options

- **Intercept at the network level** (Fetch/XHR patch): rejected — network interception was deliberately disabled in this codebase due to prior instability; re-enabling it for PDA would reintroduce that complexity.
- **Use `callHandler("PDA_httpGet", ...)` directly**: rejected — `TornPDA_API.js` wraps this with `__PDA_platformReadyPromise` handling internally; calling the global functions avoids re-implementing that readiness logic ourselves.
