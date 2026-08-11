# Sandbox Environment Reference

## What runs where

The `sbx` CLI is **not available inside the sandbox** — all `sbx` commands must be run on the host.

| Task | Where |
|---|---|
| Agent code, file edits, shell commands | Inside the sandbox |
| `sbx policy allow network [--sandbox <name>] <domain>` | Host terminal |
| `sbx secret set <name> github -t -` | Host terminal |
| `sbx ports <name> --publish <port>` | Host terminal |
| `sbx exec -it <name> bash` | Host terminal |

## Key facts

- **Workspace path** is identical inside and outside the sandbox (direct mode default).
- **Installed packages** (apt, npm, pip, etc.) persist across sandbox stops and restarts, but are lost on `sbx rm`.
- **`/etc/sandbox-persistent.sh`** is sourced before every bash command — append `export VAR=val` here for env vars that must persist across shell invocations.
- **Services** must bind to `0.0.0.0` (not `127.0.0.1`) to be reachable via port publishing.
- **Docker** is available inside the sandbox with its own isolated daemon and image cache.

## Reaching the host

To reach a service on the host machine, use `host.docker.internal` instead of `localhost`:

```bash
curl http://host.docker.internal:3000
```

## Exposing a sandbox port to the host

The user runs this on their host:

```bash
sbx ports $SANDBOX_VM_ID --publish 8080:8080/tcp
```
