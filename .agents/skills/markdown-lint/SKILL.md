---
name: markdown-lint
description: Write Markdown files that pass markdownlint cleanly (MD013 line length, MD022/MD031/MD032 blank-line rules, MD040 fenced-code language, MD047 trailing newline, MD004/MD029 list-marker consistency, MD001/MD025/MD041 heading structure, MD034 bare URLs) instead of producing files that flag dozens of lint errors the moment they're opened in an editor. Can also generate a starter markdownlint config file directly in a project that doesn't have one. Use whenever writing or editing a .md file, or when asked to set up/add a markdownlint config.
---

# Writing lint-clean Markdown

Markdown written by an LLM tends to trip a predictable set of markdownlint
rules — mainly because prose gets written as one long unwrapped line instead
of hard-wrapped, and blank-line spacing around headings/lists/code blocks
gets skipped. This skill is a checklist to follow *while writing*, not a
cleanup pass to run after.

## The one habit that fixes most of it

**Hard-wrap prose at 80 columns.** Break lines manually inside paragraphs at
a word boundary near column 80 — don't write one long line and let the
editor soft-wrap it for display. This single habit resolves the large
majority of MD013 (line-length) hits, which is the rule most likely to
flood a file with errors.

Tables, fenced code content, and long URLs often genuinely can't be
wrapped without breaking them. Don't mangle a table to satisfy line length —
see `config.md` for a starter project config that exempts what shouldn't be
hand-wrapped, so the habit above only has to apply to actual prose.

## Structural checklist

- Exactly one blank line before and after every heading (MD022), list
  (MD032), and fenced code block (MD031).
- Never more than one consecutive blank line anywhere (MD012).
- File ends with exactly one trailing newline — no trailing blank lines
  (MD047).
- No trailing whitespace on any line (MD009). Don't use the "two trailing
  spaces = line break" convention; use a real paragraph break instead.
- Every fenced code block has a language tag — use `text` if nothing else
  fits, never a bare ` ``` ` (MD040).
- Use `-` for every bullet in a list, never mixed with `*` or `+` (MD004).
  For ordered lists, using `1.` for every item is always safe under default
  config (MD029 accepts both all-`1.` and sequential numbering).
- One `#` heading as the first line of content (after frontmatter, if any),
  then increment heading levels by exactly one at a time — never jump `##`
  straight to `####` (MD001, MD025, MD041).
- No bare URLs in text — wrap them as `<https://example.com>` or
  `[text](https://example.com)` (MD034).
- Avoid trailing punctuation (`.`, `,`, `;`, `:`) at the end of headings
  (MD026).

## Before treating a file as done

Skim it once specifically for line length and blank-line spacing — those
two categories account for most of what shows up as lint noise on open.
If the project has a markdownlint config (`.markdownlint.yaml`,
`.markdownlint.jsonc`, `.markdownlint-cli2.yaml`), check it for
project-specific overrides before assuming the defaults above apply.

## Generating a config in a project

If a project has no markdownlint config and either the user asks for one or
the project is producing a lot of unavoidable table/code-block
line-length noise, create the config directly rather than just describing
it:

1. Check for an existing config first, under any of: `.markdownlint.yaml`,
   `.markdownlint.yml`, `.markdownlint.json`, `.markdownlint.jsonc`,
   `.markdownlint-cli2.yaml`, `.markdownlint-cli2.jsonc`,
   `.markdownlint-cli2.cjs`, or a `markdownlint-cli2`/`markdownlint` key in
   `package.json`. If one exists, merge in the overrides from `config.md`
   instead of adding a second file — don't clobber unrelated keys already
   there.
2. If none exists, write `.markdownlint.yaml` at the project root using the
   contents in `config.md` verbatim (adjust only if the project's own
   conventions clearly call for JSON/JSONC or the `-cli2` variant instead).
3. State in one line what was created or changed and why — don't leave the
   user to discover a new file in `git status` unexplained.
