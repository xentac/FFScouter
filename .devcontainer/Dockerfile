# Bun is this repo's actual runtime (bun run test/lint/build, per AGENTS.md).
# Pull the pinned binary from the official image instead of piping a remote
# install script into bash: the version is explicit, and the artifact is
# fetched and verified by the image build, not by a mutable URL at build time.
# Built as a separate stage; only the binaries are copied into the final image.
FROM oven/bun:1.4.4-debian AS bun

FROM mcr.microsoft.com/devcontainers/typescript-node:1-22-bookworm

# Install firewall tooling used by init-firewall.sh to build the network allowlist
RUN apt-get update && apt-get install -y --no-install-recommends \
  iptables \
  ipset \
  iproute2 \
  dnsutils \
  aggregate \
  jq \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy the pinned Bun binaries from the `bun` stage above into the final image.
# bunx is a symlink to bun in the official image, so it is copied as a symlink
# and resolves next to the copied bun in /usr/local/bin.
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
COPY --from=bun /usr/local/bin/bunx /usr/local/bin/bunx

# jj (Jujutsu) is this repo's preferred VCS (AGENTS.md); no official devcontainer
# feature exists for it, so install a pinned release binary directly. No apt
# package either - Debian bookworm doesn't carry jj. Bump JJ_VERSION manually
# to update; installed at build time so it isn't subject to the runtime firewall.
ARG JJ_VERSION=0.44.0
RUN curl -fsSL "https://github.com/jj-vcs/jj/releases/download/v${JJ_VERSION}/jj-v${JJ_VERSION}-x86_64-unknown-linux-musl.tar.gz" \
  | tar -xz -C /usr/local/bin ./jj

# jj refuses to create commits without a user identity configured, and there's
# no interactive prompt to set one inside a container. The host's
# ~/.config/jj/config.toml is bind-mounted over this path at container start
# (devcontainer.json's "mounts"); pre-create the directory owned by node so
# that mount point isn't root-owned.
RUN mkdir -p /home/node/.config/jj && \
  chown -R node:node /home/node/.config

# Run the firewall script directly from the bind-mounted workspace rather than
# COPYing it into the image: the official claude-code devcontainer feature
# (installed after this Dockerfile, in a later stage) unconditionally overwrites
# /usr/local/bin/init-firewall.sh with its own bundled copy via a
# setup_firewall_script() step in its install.sh, with no check for a pre-existing
# file - so anything COPYed to that exact path here gets silently clobbered.
# (mcr.microsoft.com/devcontainers/typescript-node already grants the non-root
# `node` user full passwordless sudo out of the box, unlike the rust image's
# vscode user, so no extra sudoers.d rule is needed here to let it run this script.)

# Pre-create the mount points for the named volumes (Claude config, bash
# history) owned by node. An empty named volume inherits the ownership/content
# already present at its mount path on first use - without this, Docker
# creates it root-owned, and node can't write credentials or transcripts into it.
RUN mkdir -p /home/node/.claude /commandhistory && \
  chown node:node /home/node/.claude /commandhistory
