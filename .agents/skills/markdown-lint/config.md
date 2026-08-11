# Starter markdownlint config

Drop this in a project as `.markdownlint.yaml` (or merge it into an
existing `.markdownlint-cli2.yaml`) when a project has no config yet and is
producing a lot of unavoidable line-length noise from tables or code
blocks. It keeps MD013 enforcing wrapped prose but stops fighting content
that can't be wrapped without breaking it.

```yaml
# MD013: line length — keep prose wrapped, but tables and code blocks
# often can't be wrapped without breaking them, so exempt those.
MD013:
  line_length: 80
  code_blocks: false
  tables: false

# MD033: inline HTML — off by default here since reference docs sometimes
# need a raw <br> or <details> block; turn this back on for stricter repos.
MD033: false
```

## Why these specific overrides, not others

- `code_blocks: false` — fenced code often has its own formatting
  conventions (e.g. a long shell command or URL); wrapping it to satisfy
  line length would change what it actually does when copy-pasted.
- `tables: false` — a markdown table row's width is driven by its content
  and column count, not prose; forcing it under 80 chars usually means
  abbreviating data rather than improving readability.
- `MD033: false` (inline HTML) is included as a common, low-risk default
  for reference documentation, not because it's required to fix line
  length — drop this override if the project wants to enforce pure
  CommonMark.
- Everything else is left at markdownlint's default, since the checklist
  in `SKILL.md` is written to satisfy those defaults directly rather than
  relying on project-level overrides.

Don't reach for broader overrides (disabling MD022/MD032 blank-line rules,
raising `line_length` well past 80, etc.) just to silence errors faster —
those defaults exist because they're what most editors and renderers
assume, and satisfying them is usually less work than it looks once the
habits in `SKILL.md` are in place.
