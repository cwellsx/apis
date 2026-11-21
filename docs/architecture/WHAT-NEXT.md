# What next

A heuristic for choosing what to work on, at any moment. Written after the fact: the judgements below were
made before they were named, and the point of naming them is that the next one is cheaper.

## Two questions

**Does something break if I don't do this?** A failing build, a failing test, a document the last change made
misleading, a decision made and not recorded. These come first, and they are usually small.

**Do I want the outcome?** A feature the product lacks, a thing worth learning. This is the work.

Anything that answers *neither* is neither. That is where the time goes if nothing stops it, and the labels
below are how it gets justified.

## The labels that justify themselves

- **"It's an enabler."** Enabling *what*, that you want? `node:sqlite` enables `vscode-ext`, which is not
  scheduled; a better edit tool enables nothing and only makes a rare operation cheaper. An enabler must name a
  goal you have chosen, or it is procrastination with a good story.
- **"It's a risk."** Is it reachable -- by anyone but you? A theoretical advisory in a dev-only tree is a
  recorded decision, not a task.
- **"It's only a small job."** Small jobs are not cheap. They cost a context switch, which is the scarcest
  thing a solo project has.

## Is it finished?

Ask what risk the work retires, and whether it is retired.

| work                    | the risk it addressed                              | retired? |
| ----------------------- | -------------------------------------------------- | -------- |
| documentation restructure | the design existed only in the author's head       | yes      |
| audit policy            | "I would not know how to handle a vulnerability"   | yes      |
| Electron upgrade        | the app is on a version with known findings        | no -- planned |

**The feeling of being finished is made of signals.** When it is hard to articulate, these are what it is
usually built from:

- **The theory is in place** -- a policy, a set of commands, an artifact you could read. The deliverable was the
  *capability*, not the work itself.
- **The risk stopped looming** -- it became specific enough to name and small enough to bound.
- **The decisions are written down** -- what was *accepted*, and why, so that the question does not come back.
  A decision closes a question; a task opens one. Write the first kind, and let the second go in `TODO.md` if
  it is real, or nowhere if it is not.
- **Nothing is left broken or misleading** -- no failing build, no document invalidated by the change.

## When not to stop

- **A broken state** -- a failing build, a failing test, a tree half-renamed. Finish it or revert it.
- **A document the change invalidated** -- in the same commit, or the next one.
- **A decision made and not recorded** -- it will be re-made, and re-made differently.

## When to switch

A context switch is expensive, so switch once rather than often. But do switch: **an area being finished is a
reason to leave it, not a reason to stay.** The instinct to work on what is adjacent is right *within* a task
and wrong *between* them.

## What this is not

Not a backlog. What is on the list lives in `TODO.md`, the shape of the project in `ROADMAP.md`, and the
dependency findings in `AUDIT.md` and `SECURITY-AUDIT.md`. This document is about choosing between them, and
says nothing about what is on them -- which is why it does not go stale.

**And the trap to watch for is a backlog in disguise.** A list of things to revisit grows faster than it is
retired, and grooming it feels like progress while being none. Deciding the design before the work needs it is
Big Design Up Front; deciding *when* to do the work before it is needed is the same mistake in scheduling
clothes. Decide at the last responsible moment -- which is when something breaks, or when you want the outcome.
Those are the two questions at the top.
