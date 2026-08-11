# Remote Control (/rc)

`/remote-control` does not work with the default `claude` sbx agent. This is a known open bug ([docker/sbx-releases#8](https://github.com/docker/sbx-releases/issues/8)).

## Root cause

The sbx proxy unconditionally rewrites the `Authorization` header on all requests to `api.anthropic.com`. This works for normal inference and for the RC calls that use your main OAuth token (session create, credential fetch). However, RC's worker registration and SSE streaming endpoints authenticate with **per-session scoped tokens** — the proxy clobbers those with the injected token, which lacks the right scope → 401/403 → `worker_register_failed` → `Transport closed (code 4091)`.

You can confirm the problem with `sbx policy log` on the host: `api.anthropic.com` will show `forward` (MITM + injection) instead of `forward-bypass`.

## Workaround: custom kit without credential injection

The proxy only intercepts `api.anthropic.com` because the stock `claude` agent declares `serviceDomains: api.anthropic.com: anthropic`. A custom kit that omits that declaration causes the proxy to use `forward-bypass` instead, and scoped tokens pass through intact.

Create a kit spec (e.g. `~/sbx-kits/claude-rc/spec.yaml`):

```yaml
schemaVersion: "1"
kind: sandbox
name: claude-rc
displayName: Claude Code (RC-compatible)
description: Claude Code without Anthropic credential injection, so /rc works.

sandbox:
  image: "docker/sandbox-templates:claude-code-docker"
  aiFilename: CLAUDE.md
  entrypoint:
    run: [claude]

environment:
  variables:
    IS_SANDBOX: "1"   # not set automatically without serviceDomains

network:
  allowedDomains:
    - "api.anthropic.com:443"
    - "platform.claude.com:443"
    - "statsig.anthropic.com:443"
    - "mcp-proxy.anthropic.com:443"
    - "claude.com:443"
    - "downloads.claude.ai:443"
    - "github.com:443"
    - "*.github.com:443"
    - "*.githubusercontent.com:443"
```

Launch it:

```bash
sbx kit validate ~/sbx-kits/claude-rc
sbx run claude-rc --name my-sandbox --kit ~/sbx-kits/claude-rc
```

Then `/login` inside the sandbox (subscription OAuth) and `/rc` should connect.

Verify it worked — on the host, `sbx policy log` should show `api.anthropic.com` as `forward-bypass`.

## Caveats

- **Real token lives in the sandbox.** Without credential injection, `/login` stores your actual OAuth token inside the VM (in `~/.claude/.credentials.json`) rather than keeping it on the host. The stock agent stores only a `proxy-managed` sentinel there.
- **`IS_SANDBOX` must be set manually.** Without a `serviceDomains` block, sbx doesn't set `IS_SANDBOX=1` automatically. The kit above includes it explicitly.
- **API key auth is incompatible with this workaround.** If you authenticate with an `ANTHROPIC_API_KEY` instead of OAuth, you need injection — don't use this kit.
