# Data model

What the data *is*: the model `Core.exe` produces, and the four properties of it that the rest of the code
depends on. How it arrives and where it goes is `DATA-FLOW.md`.

## Metadata tokens

The compiler gives every type and method a numeric metadata token, unique within an assembly. Together with
the assembly name it becomes the key of a row, which is why ids in this codebase look the way they do.

Those ids are branded types -- `TypeId`, `MethodId` and the rest, in `packages/backend/src/id` -- so that an
assembly id cannot be passed where a method id is wanted. The same token and assembly name therefore identify
a row whatever table it is in, and the code that moves between tables carries the id rather than a string.
- **Compiler-generated types.** Anonymous delegates and async state machines create types the user never
  wrote. `Core.exe` maps them back to the method that owns them -- *lifting*, in decompiler terms -- so they
  never surface to the user. That is now an implementation detail inside `Core.exe`: the backend only sees
  the result.
- **Microsoft assemblies.** Platform assemblies are not reflected or decompiled in full -- only the signatures
  of referenced members are read.
- **Custom data.** A second kind of data source
  ([`customJson`](../../packages/backend/contracts/customJson.ts)) renders hand- or tool-authored graphs
  alongside the reflected ones.

## Aggregation

The model is not a transcript of what `Core.exe` emitted. Two aggregations happen as it is inserted, and they
are what make it a model rather than a copy: the application reads relationships instead of deriving them.

**Ancestors.** Inserting a token inserts the tree above it -- assembly, namespace, type, method -- so a node's
parents are rows rather than something inferred.

**Calls.** `Core.exe` emits method-to-method calls. `insertCalls` then rolls each side up through type,
namespace and assembly, so a row exists for any pair of ids at the same granularity -- and the ordering does the
work: the from-side passes run first, the to-side passes second, and because those read the table they roll up
the already-rolled rows too. That is what yields every combination rather than two independent one-level steps.

A query may therefore assume that whatever is below a node is already a row.

Two edges of the shape are worth knowing:

- Rows stop at assemblies. A group of assemblies exists only to add and remove assemblies from the graph, and
  never has edges of its own.
- A call whose target is a **methodSpec** -- a generic method reference -- is resolved to its definition before
  any roll-up pass runs, so it too has rows at every level. The spec rows are kept in `calls` rather than
  replaced, because they are what the dataset actually had. The resolution is *not* recorded as ancestry,
  though it would be truthful to do so: the roll-up tables record the tree, a spec is not a child of the
  definition's type, and the popup does not care which of the two it shows. It will matter when call stacks
  are shown, since that means following the calls as they were, instantiations included.


