## Async methods

Cause: methods which use `await`

Example: `MyClass.MyMethodAsync` → compiler emits `MyClass.<MyMethodAsync>d__5`

Async methods are annotated with `[AsyncStateMachine(typeof(<Foo>d__N))]`

## Iterator methods

Cause: methods which use `yield return`

Example: `MyClass.GetItems` → compiler emits `MyClass.<GetItems>d__7`.

Iterator methods are annotated with `[IteratorStateMachine(typeof(<Foo>d__N))]`

## Anonymous types

Cause: methods with code like `var person = new { Name = "Alice", Age = 30 };`

Example: → compiler emits `MyClass.<>f__AnonymousType...`

Method has `newobj`

Compiler can reuse an anonymous type if multiple methods require the same shape

## Display/closure classes

Cause: capsure local variables for lambdas or local functions

Example: → compiler emits `MyClass.<>c__DisplayClass...`

Method has `newobj`

## Lambda cache

Cause: static nest classes with cached delegates for lambdas

Example: → compiler emits `MyClass.<>c.Instance`

Method references these via ldftn -> newobj

## Hoisted locals

Cause: helpers structs for pattern matching, tuples, or switch expressions

Example: → compiler emits names like `MyClass.<>f__Switch`

Method has `newobj`

