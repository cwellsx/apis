# Snapshots

What the tests generate, where it goes, what each file is, and the one piece that is committed rather than
discarded.

## How to use

### Snapshots

The `snapshots` folder holds a version-controlled copy of the generated data from one test case — the record of
what that test case's output should look like, which the tests compare against. Pay attention if it shows up as
a diff after you make a code change: the change either altered the output deliberately (then the snapshot is
updated as part of the change) or altered it when it should not have.

### Generated

To keep an archive of a run, rename the folder, e.g. `generated.dotnet.20261121`, and Windiff can compare it
against the current run.

## Generated folders

Tests work with three folders under `packages/backend-test`: two `generated*` folders, gitignored — visible in
the workspace, never in the repository — and `snapshots`, which is version controlled. The generated paths are
chosen in `test/utils/paths.ts`, which is the only place to change them.

### `generated.dotnet`

The .NET test output — the reflection data, the databases built from it, and the per-step sets of the calls
view (described under [Generated files](#generated-files)). Inside it, `db.jsonl` holds the JSONL files the
tests write and `loaded` the load test's printed lists.

### `generated.custom.*`

The custom-test output, one folder per test input: the suffix is the name of whatever input sits in the custom
input folder (`packages/backend-test/custom`), which is not version-controlled.

### `snapshots`

The folder is filled for whichever test cases pass the snapshot parameter: a case calls `printViewState(true)`,
currently the last case of `dotnet.view.ts`. The copy takes only certain file types — the step's `*.nodes.txt`
(the tree) and `*.calls.txt` (the visible calls) — not its `.json`, `.map`, `.dot` or `.svg`. Using the folder is
described under [How to use](#how-to-use).

## Generated files

`test-dotnet-view` writes one set of files per step of the calls view — `calls-0`, `calls-1`, … — and a second
set from the run with `clusterNamespaces` on — `calls-clustered-0`, … — so that either variant can be compared
with the other, and with a previous run. Each set holds the same six files:

| File          | Contents                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------- |
| `.nodes.txt`  | the node tree, as `printForest` prints it — the model's structure                           |
| `.calls.txt`  | the visible calls — each call's endpoint names, with the token pair below, sorted by name   |
| `.json`       | `imageData`: the roots and the edges                                                        |
| `.map`        | the SVG hit areas                                                                           |
| `.dot`        | what the model is turned into before GraphViz lays it out                                   |
| `.svg`        | the laid out graph                                                                          |

The output is not versioned, deliberately. `.dot`, `.svg` and `.map` change whenever GraphViz moves a box, so
committing them would mean a diff nobody can review, and one that every regeneration rewrites. To see what a
change did, keep a copy of a `generated` folder from a run you trust and compare a later run with it — WinMerge
on the two folders — rather than with git.

## UI example

The exception is `docs/ui/example-calls.*`: the first snapshot of the calls view, which the test copies into the
repository because the UI documentation refers to it. It is a snapshot rather than a promise — see
[`../ui/README.md`](../ui/README.md).

Not covered yet: the copied example is the initial state, which is a simple tree. A sequence of node state
updates which produced a complicated one would be better coverage.