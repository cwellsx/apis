# Namespaces and type names

## Type names

There are different namespaces.
Even so type names could be confusing -- because we're converting e.g. from Cecil types to Output types, some code needs to use both namespaces.
Therefore the type names have their own naming conventions i.e. it isn't only the namespace that's different.

| Namespace   | Type names                     |
| ----------- | ------------------------------ |
| Mono.Cecil  | `*Definition` and `*Reference` |
| Core.Cecil  | `*Data`                        |
| Core.Output | `*Info`                        |

## Namespaces

### Mono.Cecil

Used in

- Core.Cecil
- Core.CecilToOutput

### Core.Application

Uses

- Core.Cecil
- Core.CecilToOutput
- Core.Decompiler
- Core.Output

### Core.Cecil

Uses

- Mono.Cecil
- Mono.Cecil.Cil
- Core.Loader

### Core.CecilToOutput

Uses

- Mono.Cecil
- Core.Cecil
- Core.Output

### Core.Decompiler

Uses

- ICSharpCode.Decompiler
- ICSharpCode.Decompiler.CSharp
- System.Reflection.Metadata
- System.Reflection.Metadata.Ecma335
- Core.Loader

### Core.Filter

Used in

- Core.CecilToOutput
- Core.Loader

### Core.Loader

Uses

- (only System APIs)
- System.Text.Json (to read framework name from `*.deps.json`)

### Core.Output

Uses

- (only System APIs)

### Core.Serializer

Uses

- System.Text.Json
- YamlDotNet
