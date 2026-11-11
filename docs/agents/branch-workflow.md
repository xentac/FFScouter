# Branch Workflow

How features move from `feat/*` branches through beta releases into `main`. All commands use jj in the colocated repo.

## The model

- `main` is the trunk. Each feature lives on its own `feat/<name>` bookmark: a linear stack of commits whose root is on `main`.
- `beta` is the megamerge. A megamerge is a merge commit whose parents are `main` and the feature branches under test. It carries no changes of its own. The user decides which feature branches are parents. Read the current set with `jj log -r 'beta-'`.
- The working copy (`@`) is an empty commit on top of `beta`. The dev build runs from it, so the user tests every feature together.
- `main`, the `release-*` branches, and stable tags (`v3.4`) are never rewritten. Everything else is rewritten freely: `feat/*` branches, `beta`, and commits under beta tags (`v3.5-beta1`). A beta tag records what shipped, and the old commit stays in git through the tag.
- The per-user jj repo configuration removes beta tags from `immutable_heads()`. If jj refuses to rewrite a commit because a beta tag points at it, that configuration is missing. Stop and tell the user. Do not pass `--ignore-immutable`.

## Keep `@` on top of the megamerge

`@` must always be a child of `beta`, never the `beta` merge itself. In a colocated repo, git `HEAD` is the first parent of `@`. If `@` is the merge, git `HEAD` is `main`. Then `git status` shows the feature content as uncommitted, and `bun run release` refuses to run or tags the wrong commit. Edits made there also land inside the merge commit.

If `jj log -r @` shows the `beta` bookmark, run `jj new beta`.

## Add a new commit to a feature branch

Start from `@` on top of `beta`, with the edits already in `@`.

1. Insert an empty commit at the feature tip without moving `@`. Note the change ID that jj prints (`NEW`):

   ```sh
   jj new --no-edit --insert-after feat/<name> -m "<description>"
   ```

2. Move the edits into it. Add `-i` to move only some hunks:

   ```sh
   jj squash --into NEW
   ```

3. Move the bookmark to the new tip. jj does not move it for you:

   ```sh
   jj bookmark move feat/<name> --to NEW
   ```

Done means three things: `@` is empty, its parent is `beta`, and `feat/<name>` points at `NEW`.

## Amend existing commits on a feature branch

When the edits in `@` fix lines that existing feature commits added, run `jj absorb`. It moves each hunk into the commit that last changed those lines. Hunks that jj cannot place stay in `@`. Use the procedure above for those.

## Rebase features onto a new `main`

```sh
jj rebase -b 'bookmarks(glob:"feat/*")' -o main
```

The `beta` merge and `@` follow automatically. Never merge `main` into a feature branch.

## Change which features are in the megamerge

Rebase the merge onto its new parent set. `@` follows.

```sh
jj rebase -s beta -o main -o feat/<a> -o feat/<b>
```

## Conflicts

If two feature branches conflict, jj puts the conflict in the `beta` merge, not in the feature commits. Resolve it in `@` and squash the resolution into `beta` (`jj squash --into beta`). This is the only case where the merge commit carries changes of its own. Each feature branch stays clean against `main`.

## Release a beta

The user runs `bun run release`. Before that, make sure that `@` is an empty child of `beta` and that `git --no-pager status` shows no changes. The script tags git `HEAD`, which is then the `beta` merge.

## Push

If the user asks for a push, push to `origin` and name the bookmarks. Push at no other time.

```sh
jj git push -b feat/<name> -b beta
```

A rewrite of a feature branch also rewrites `beta`, so push both. jj force-pushes rewritten bookmarks. jj refuses to push a commit without a description or with a conflict, so describe every commit and resolve conflicts first.

## Finish a feature

When the user says a feature is done, rebase `feat/<name>` onto `main` and ask the user before you move `main`. Then remove the branch from the megamerge, because `main` contains it.
