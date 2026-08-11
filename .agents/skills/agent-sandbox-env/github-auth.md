# GitHub Authentication

The sandbox proxy injects a GitHub token via the `GH_TOKEN` environment variable. `gh auth status` reflects the real authentication state — use it to check whether credentials are working.

## Checking auth status

```bash
gh auth status
```

If authenticated, output looks like:

```
github.com
  ✓ Logged in to github.com account <user> (GH_TOKEN)
  - Active account: true
  ...
```

## When auth is broken

If `gh auth status` shows you are **not** logged in, or `git push` fails with:

```
fatal: could not read Username for 'https://github.com'
```

the injected token is missing or expired. Tell the user to run on their **host**:

```bash
# This sandbox only (takes effect immediately):
gh auth token | sbx secret set $SANDBOX_VM_ID github -t -

# Globally for all future sandboxes:
gh auth token | sbx secret set -g github -t -
```

After the user confirms, retry the operation.
