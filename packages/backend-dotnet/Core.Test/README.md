## 1. Async state machine (`<Foo>d__N`)
```csharp
using System;
using System.Threading.Tasks;

class AsyncExample
{
    public async Task<int> ComputeAsync(int x)
    {
        await Task.Delay(10);
        return x * 2;
    }
}
```
👉 Produces a nested type like `AsyncExample+<ComputeAsync>d__0` with `[AsyncStateMachine]`.

---

## 2. Iterator state machine (`<Foo>d__N`)
```csharp
using System;
using System.Collections.Generic;

class IteratorExample
{
    public IEnumerable<int> GetNumbers()
    {
        yield return 1;
        yield return 2;
        yield return 3;
    }
}
```
👉 Produces `IteratorExample+<GetNumbers>d__0` with `[IteratorStateMachine]`.

---

## 3. Anonymous type (`<>f__AnonymousType…`)
```csharp
class AnonymousExample
{
    public void MakePerson()
    {
        var person = new { Name = "Alice", Age = 30 };
        Console.WriteLine(person.Name);
    }
}
```
👉 Produces a compiler‑generated type like `<>f__AnonymousType0` with properties `Name` and `Age`.

---

## 4. Display/closure class (`<>c__DisplayClass…`)
```csharp
using System;

class DisplayClassExample
{
    public void Run()
    {
        int captured = 42;
        Action a = () => Console.WriteLine(captured);
        a();
    }
}
```
👉 Produces `DisplayClassExample+<>c__DisplayClass0_0` to hold the captured variable.

---

## 5. Lambda cache (`<>c`, `<>c__N`)
```csharp
using System;
using System.Linq;

class LambdaCacheExample
{
    public void Run()
    {
        var data = new[] { 1, 2, 3 };
        // The compiler will cache this lambda in a <>c class
        var doubled = data.Select(x => x * 2).ToArray();
        Console.WriteLine(string.Join(",", doubled));
    }
}
```
👉 Produces `LambdaCacheExample+<>c` with a static `Instance` and a method `<Run>b__0_0`.

---

## 6. Hoisted locals / pattern matching helpers
```csharp
class HoistedLocalsExample
{
    public void Run(object o)
    {
        if (o is int x)
        {
            Console.WriteLine(x);
        }
    }
}
```
👉 Produces helper structs like `HoistedLocalsExample+<>f__Switch…` or similar, depending on compiler version.


---

## 1. Async state machine using a cached lambda
```csharp
using System;
using System.Threading.Tasks;

class AsyncCacheExample
{
    public async Task RunAsync()
    {
        // LINQ inside async → compiler emits a state machine (<RunAsync>d__0)
        // and caches the lambda in <>c
        var data = new[] { 1, 2, 3 };
        var doubled = data.Select(x => x * 2).ToArray();

        await Task.Delay(10);
        Console.WriteLine(string.Join(",", doubled));
    }
}
```
- The async state machine type `<RunAsync>d__0.MoveNext` will reference the cached delegate in `AsyncCacheExample.<>c`.

---

## 2. Iterator state machine using a cached lambda
```csharp
using System;
using System.Collections.Generic;
using System.Linq;

class IteratorCacheExample
{
    public IEnumerable<int> GetNumbers()
    {
        var data = new[] { 1, 2, 3 };
        // LINQ inside iterator → compiler emits <GetNumbers>d__0
        // which calls into <>c.<GetNumbers>b__0_0
        var doubled = data.Select(x => x * 2).ToArray();

        foreach (var d in doubled)
            yield return d;
    }
}
```
- The iterator state machine `<GetNumbers>d__0.MoveNext` will load the cached delegate from `<>c`.

---

## 3. Display class calling a cached lambda
```csharp
using System;
using System.Linq;

class DisplayCacheExample
{
    public void Run()
    {
        int captured = 42;
        // Captured variable → compiler emits <>c__DisplayClass0_0
        // The display class method will itself call into a cached lambda in <>c
        var data = new[] { captured, captured + 1 };
        var doubled = data.Select(x => x * 2).ToArray();

        Console.WriteLine(string.Join(",", doubled));
    }
}
```
- The closure class `<>c__DisplayClass0_0` is generated to hold `captured`.
- Its generated method will invoke the cached delegate from `<>c`.

---

## Interator state mechine inside local function
```csharp
internal class IteratorInsideLocalExample
{
    IEnumerable<int> Foo()
    {
        IEnumerable<int> Local()
        {
            yield return 1;
        }
        return Local();
    }
}
```
- `IteratorInsideLocalExample/<Foo>g__Local|0_0>d` 