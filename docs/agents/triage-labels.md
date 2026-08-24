# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

This repo uses a **local-markdown issue tracker** (see `issue-tracker.md`), so these strings are not tracker labels but the values written on the `Status:` line near the top of each issue file, e.g. `Status: ready-for-agent`.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Edit the right-hand column to match whatever vocabulary you actually use.

## Terminal states

The five roles above are all *pre-implementation*: each describes a ticket that has not been built yet. A hosted tracker needs no more than that, because closure there is a native issue **state** sitting orthogonal to labels. This tracker has only the one `Status:` line, so both axes land on it — and a finished ticket had nowhere to say so, leaving tickets 01 and 02 parked at `ready-for-human` long after the human step was taken.

`done` is a local addition closing that gap. It is not a mattpocock role and no skill emits it; it exists so that a finished ticket is distinguishable at a glance from a blocked one.

| Value     | Meaning                                                        |
| --------- | -------------------------------------------------------------- |
| `done`    | Built, verified and merged. Every checkbox ticked, or any left unticked explained in `## Comments` |
| `wontfix` | Will not be actioned                                            |

These two are the terminal values: a ticket at either is finished and nothing should pick it up.

`ready-for-human` is the one most easily misread. It means a ticket is **waiting on** a person, not that a person completed it — move it off as soon as that step is taken.

## A different `Status:` vocabulary under `/wayfinder`

Wayfinder writes `claimed` and `resolved` on the same `Status:` line, for the decision tickets hanging off a `.scratch/<effort>/map.md` (see `issue-tracker.md`). That vocabulary is scoped to a wayfinding effort and has nothing to do with the roles above; implementation tickets never use it, and this repo has no map.
