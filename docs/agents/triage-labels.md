# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Edit the right-hand column to match whatever vocabulary you actually use.

## Release lifecycle labels

Fixes flow commit → beta release → main release. Two extra labels
(outside the five triage roles above) track an issue whose fix exists
but hasn't fully shipped:

| Label          | Meaning                                             |
| -------------- | --------------------------------------------------- |
| `pending-beta` | Fix committed/pushed but not yet in a beta release  |
| `in-beta`      | Fix is in a beta release, awaiting a main release   |

When a fix lands, remove the triage label (e.g. `ready-for-agent`) and
apply `pending-beta`. Swap it for `in-beta` at the next beta release.
Issues auto-close via `Fixes #N` when the commit reaches main; if one
doesn't, close it manually and drop `in-beta` at the main release.
