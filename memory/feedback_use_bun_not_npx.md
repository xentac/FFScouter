---
name: feedback_use_bun_not_npx
description: Always use bun to run scripts/tools, never npx
metadata:
  type: feedback
---

Always use `bun` to run scripts and tools. Never use `npx`.

**Why:** User preference — this project uses bun as its runtime/package manager.

**How to apply:** Replace any `npx <tool>` with `bun <tool>` (e.g., `bun biome check ...` instead of `npx biome check ...`).
