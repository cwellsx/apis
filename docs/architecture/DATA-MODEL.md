# Data model

What the data *is*: the model `Core.exe` produces, and the four properties of it that the rest of the code
depends on. How it arrives and where it goes is `DATA-FLOW.md`.

- **Metadata tokens.** The compiler gives every type and method a numeric metadata token, unique within an
  assembly. Together with the assembly name it becomes the key of a row, which is why ids in this codebase
  look the way they do.
- **Compiler-generated types.** Anonymous delegates and async state machines create types the user never
  wrote. `Core.exe` maps them back to the method that owns them — *lifting*, in decompiler terms — so they
  never surface to the user. That is now an implementation detail inside `Core.exe`: the backend only sees
  the result.
- **Microsoft assemblies.** Platform assemblies are not reflected or decompiled in full — only the signatures
  of referenced members are read.
- **Custom data.** A second kind of data source
  ([`customJson`](../../packages/backend/contracts/customJson.ts)) renders hand- or tool-authored graphs
  alongside the reflected ones.

## Aggregation

The model is not a transcript of what `Core.exe` emitted. Two aggregations happen as it is inserted, and they
are what make it a model rather than a copy: the application reads relationships instead of deriving them.

**Ancestors.** Inserting a token inserts the tree above it — assembly, namespace, type, method — so a node's
parents are rows rather than something inferred.

**Calls.** `Core.exe` emits method-to-method calls. `insertCalls` then rolls each side up through type,
namespace and assembly, so a row exists for any pair of ids at the same granularity — and the ordering does the
work: the from-side passes run first, the to-side passes second, and because those read the table they roll up
the already-rolled rows too. That is what yields every combination rather than two independent one-level steps.

A query may therefore assume that whatever is below a node is already a row.

Two edges of the shape are worth knowing:

- Rows stop at assemblies. A group of assemblies exists only to add and remove assemblies from the graph, and
  never has edges of its own.
- A call whose target is a **methodSpec** — a generic method reference — is resolved to its definition before
  any roll-up pass runs, so it too has rows at every level. The spec rows are kept, because they are what the
  dataset had; the resolution is not recorded as ancestry, because a spec is an instantiation of a definition
  rather than a child of it.


