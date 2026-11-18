# Documentation

How this documentation is written and maintained: what it is for, how it is divided, and the conventions that
have earned their place. Most of the rules below were paid for by a mistake, and the mistake is named.

## What it is for

**Say why.** What the code does can be read from the code; the reason it is that way cannot. The reasons are
also the part that goes missing. Migrating `ARCHITECTURE.md`, its facts were copied and its explanation was
not — that `backend` is not a package because merging source maps is the only way to debug both packages in one
process — and a plausible reason took its place until a hand-written document from years earlier was found.

**Prefer the author's reason to a reasonable one.** The real reason is often oddly specific: a native module
that cannot be loaded from inside an archive, a tree whose depth is not known in advance. A tidy
generalisation is a warning sign rather than an improvement.

**Documentation aggregates.** Some of its value is that a set of facts exists in one place — the rules, the
stack, the package list. That is worth a chapter even when each fact is also stated where it is used.

**Writing a document is a design review.** Describing the backend made it plain that `presenter` was doing
work that belonged to `openDataSource`, and the code was changed as a result. If a structure cannot be
described cleanly, suspect the structure.

## Dividing it up

**One document answers one question, and the index holds the questions.** The index is the source of truth for
what is in the folder; a document missing from it is invisible.

**Split when a document answers two questions, not when it grows long.** `DATA.md` became `DATA-FLOW.md` and
`DATA-MODEL.md` because "where does the data go" and "what is the data" are asked at different times — and the
second then took the aggregation material too, because aggregation is what the data *is*.

**Each half says in one line what the other covers.** More than a line means they should not have been split.

**Group past a handful.** A list of a dozen documents tells a reader neither where to start nor how they relate,
so past about four entries they want grouping. A group is a **subject** — Backend, Electron app, Contributing —
rather than the name of an artefact: a document about `sqlio` belongs in Backend, and one about the renderer
beside `ELECTRON-APP.md`. `##` is a group, `###` a document.

**A name that lies is worse than a vague one.** `FRONT-ENDS.md` described one front end, `BUILD.md` only the
app's build, and `dotnetApi` was named after a mechanism rather than a job. Each rename exposed a distinction
worth making.

## Pacing

**What it is, then why it is that way, then what follows.** A rule with its reason attached reads as an
explanation; a rule alone reads as an assertion, and is harder to keep true.

**Short intro, then chapters with intros of their own.** A long opening blurb is a sign the material wants to
be chapters — which is where it went.

**Do not bury a decision in a table cell.** A cell holds a phrase; anything with a *because* in it belongs in
prose. The `image` folder's README and `sqlAppConfig`'s odd-one-out status both had to be lifted out.

**A diagram shows structure; prose carries the mechanism.** Aim for a diagram that is only a diagram, with
what it used to say beneath it living in the chapters it belongs to.

**Explain at the level the reader works at** — folders rather than files, unless the file is the subject, as
`shared.ts` is for the IPC.

## Formatting

**No labels on Mermaid edges.** They wrap badly and break on punctuation. The same information belongs in a
table beside the diagram, where it can also be checked against the code.

**An edge goes to a cluster when one thing fans out, to a node when the pairing matters.**
`openDataSource → sql` says "this orchestrates"; `viewDotnet → sqlDotnet` says which view reads which store.

**Headings are links, and named after the folder.** A heading that is a concept cannot be linked, which is how
"The panels" became `configuration/` and `details/`.

**Give edge styles a legend, and keep one vocabulary.** Dashed and dotted both came to mean "run-time only" in
two documents — small, but enough to make a reader doubt the rest.

**Prettier will not fix structure.** It padded the tables and left a heading with no blank line above it and
three below. After inserting into a document, read the join, not just the diff.

## Linking

**Link to distant things — source folders, other areas, external references — not to the document next door.**
The index already says what is adjacent.

**Link where the concept is named, rather than in a list at the end.** A `Related` section arrives after the
reader has stopped needing it.

**Stale descriptions are as bad as stale links.** "See `BACKEND.md` for the contracts" outlives the contracts'
departure; "the two front ends" outlives one of them. Moving or renaming something means finding its
*descriptions*, not only its references.

**Keep one home for a rule, and state it where it is needed.** The pointer belongs in one place; the statement
may appear wherever a reader would otherwise have to go looking — at the cost that a changed rule must then be
found in several.

**A link is a promise.** Every reference is something to maintain, which is why most of them were deleted.

## Working on it

**Verify identifiers against the code before writing them.** `GraphQuery`, `viewModel` and `compilerMethods.ts`
were all in prose and none of them in the tree.

**Mine old documents for reasons, not only facts.** The best finds were all explanations in a hand-written file
from years earlier: the source-maps reason, the methodSpec decision, and how `vscode-ext` reads the model
without `Core.exe`.

**Know how many documents there are.** Documentation inside `src` is invisible to a search, and a recursive
`dir` gives false positives from `node_modules`. If a document belongs in `docs/`, move it and delete the
original rather than leaving both.

**Prefer the smallest change that makes a document true**, and make it in the same commit as the code that made
it untrue.
