# Devcontainer operations for FFScouter.
# Requires: docker, and the devcontainer CLI (npm install -g @devcontainers/cli).
# Recipes assume `just` is run from the repo root, so --workspace-folder defaults
# to the current directory (matching the devcontainer CLI's own default).

# Forwards TMUX/TMUX_PANE/TERM from the invoking shell into the container on
# each exec call (--remote-env is re-resolved fresh per call, unlike
# containerEnv or a baked-in remoteEnv in devcontainer.json). TERM matters as
# much as TMUX here: Claude Code's own terminal-capability detection (mouse
# reporting, extended keys) keys off TERM being tmux-256color, not just TMUX
# being set. This is detection-only - the tmux socket path is host-local, so
# nothing inside the container can actually control tmux; also add
# `set -g allow-passthrough on`, `set -s extended-keys on`, and
# `set -as terminal-features 'xterm*:extkeys'` to the HOST's ~/.tmux.conf
# (where the real tmux server runs), per
# https://code.claude.com/docs/en/terminal-config#configure-tmux
tmux_env := "--remote-env TMUX=" + env_var_or_default("TMUX", "") + " --remote-env TMUX_PANE=" + env_var_or_default("TMUX_PANE", "") + " --remote-env TERM=" + env_var_or_default("TERM", "")

# Forwards a narrowly-scoped GH_TOKEN (NOT your host `gh auth` session) into
# the container so `gh` works with no per-container login step - gh reads
# GH_TOKEN directly and skips its stored config entirely. docs/agents/issue-tracker.md
# runs every triage operation through `gh`, so this needs write scopes on
# issues/PRs for xentac/FFScouter. Set GH_DEVCONTAINER_TOKEN once in your shell
# profile to a fine-grained PAT scoped to only what's needed (Contents/Issues/PRs
# read-write, no admin scopes). Reuse that same token across every devcontainer
# you roll this pattern out to - don't create one per repo.
gh_env := "--remote-env GH_TOKEN=" + env_var_or_default("GH_DEVCONTAINER_TOKEN", "")

default:
    @just --list

# Start (or resume) the devcontainer.
up:
    devcontainer up

# Full rebuild (needed after editing Dockerfile or devcontainer.json).
rebuild:
    devcontainer up --remove-existing-container --build-no-cache

# Open an interactive shell inside the devcontainer.
shell:
    devcontainer exec {{ tmux_env }} {{ gh_env }} bash

# Launch Claude Code inside the devcontainer.
claude:
    devcontainer exec {{ tmux_env }} {{ gh_env }} claude

# Run an arbitrary command inside the devcontainer, e.g. `just exec bun run test --run`.
exec *args:
    devcontainer exec {{ tmux_env }} {{ gh_env }} {{ args }}

# Stop the running devcontainer (the CLI has no stop/down command, so this uses docker directly).
stop:
    #!/usr/bin/env bash
    set -euo pipefail
    id=$(docker ps -q --filter "label=devcontainer.local_folder=$(pwd)")
    if [ -z "$id" ]; then
        echo "No running devcontainer found."
    else
        docker stop "$id"
    fi

# Stop and remove the container + built image (named volumes are preserved).
clean: stop
    #!/usr/bin/env bash
    set -euo pipefail
    ids=$(docker ps -aq --filter "label=devcontainer.local_folder=$(pwd)")
    [ -n "$ids" ] && docker rm -f $ids
    images=$(docker images --filter "reference=vsc-ffscouter-*" -q)
    [ -n "$images" ] && docker rmi -f $images
    echo "Container and image removed. Volumes (Claude login, bash history) preserved."

# Full reset: clean, plus wipe named volumes (you'll need to /login again after).
nuke: clean
    #!/usr/bin/env bash
    set -euo pipefail
    vols=$(docker volume ls -q --filter "name=ffscouter-")
    [ -n "$vols" ] && docker volume rm $vols
    echo "Volumes removed. Run 'just rebuild' for a completely fresh start."

# Re-run init-firewall.sh inside the running container (no rebuild needed - it runs from the mount).
firewall-reload:
    devcontainer exec sudo bash /workspaces/ffscouter/.devcontainer/init-firewall.sh

# Sanity-check the firewall: a non-allowlisted host should be blocked, an allowlisted one reachable.
firewall-check:
    #!/usr/bin/env bash
    set -euo pipefail
    echo "Checking that a non-allowlisted host is blocked..."
    if devcontainer exec curl -sS --connect-timeout 5 https://example.com >/dev/null 2>&1; then
        echo "FAIL: reached https://example.com (firewall not blocking as expected)"
    else
        echo "OK: https://example.com blocked"
    fi
    echo "Checking that an allowlisted host is reachable..."
    if devcontainer exec curl -sS --connect-timeout 5 https://registry.npmjs.org >/dev/null 2>&1; then
        echo "OK: https://registry.npmjs.org reachable"
    else
        echo "FAIL: could not reach https://registry.npmjs.org"
    fi
