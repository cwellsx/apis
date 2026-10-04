Analyzing a distributed system linked via gRPC and network APIs shifts your tool from a standard code viewer into a high-value architectural discovery platform.
You are targeting the exact gap where IDEs fail. Visual Studio's solution folders show organizational structure, but they completely obscure the runtime execution pathways.
By mapping gRPC endpoints, event handlers, and deep call paths directly in your SQLite engine, you can bridge the gap between static code and dynamic runtime reality.
------------------------------

## 1. Identifying the Entry Points (gRPC & Events)

In a distributed .NET system, entry points are rarely standard Main methods. They are defined by framework hooks. Because you are using Mono.Cecil, you can identify these entry points by writing targeted C# metadata queries or backend database aggregations.

- gRPC Endpoints: Look for classes that inherit from ProtoBuf-generated bases or Grpc.Core.ServerServiceDefinition. More specifically, gRPC methods in C# typically follow a distinct signature pattern: public override async Task<RpcResponse> MethodName(RpcRequest request, ServerCallContext context).
- Event Handlers: Message consumers (e.g., MassTransit, RabbitMQ, or MediatR handlers) universally implement marker interfaces like IConsumer<T> or IRequestHandler<T>.

The Visual Prescription: Tag these specific methods in your SQLite database with a special NodeType property (e.g., "Entry_gRPC" or "Entry_Event"). In your React frontend, give these nodes a distinct visual color anchor (like a bold green background). This instantly answers the user's question: "Where does execution start when a network message hits this process?"
------------------------------

## 2. Solving the "Reverse Call Stack" Query

When maintaining code, engineers don't just want to know what a method calls—they desperately need to know who calls it to calculate the blast radius of a change.
Because your SQLite schema stores explicit edges (SourceToken -> TargetToken), computing a reverse call stack is a classic Recursive Common Table Expression (CTE) problem. You can run this directly inside SQLite, completely offloading the heavy graph traversal from TypeScript:

WITH RECURSIVE ReverseCallStack AS (
-- Anchor member: find the exact method the user clicked
SELECT source_token, target_token, 1 AS depth
FROM call_edges
WHERE target_token = '0x06000TARGET' -- The method being inspected

    UNION ALL

    -- Recursive member: find who calls the methods found in the previous step
    SELECT e.source_token, e.target_token, rcs.depth + 1
    FROM call_edges e
    INNER JOIN ReverseCallStack rcs ON e.target_token = rcs.source_token
    WHERE rcs.depth < 10 -- Safety cap to prevent infinite loops in cyclic dependencies

)SELECT DISTINCT source_token, depth FROM ReverseCallStack;

Your headless API can expose this as a specific endpoint: GetReverseCallStack(methodToken). When clicked, the frontend can dim the rest of the graph and highlight only the path leading up to that method.
------------------------------

## 3. Visualizing Runtime Reality vs. Folder Structure

A 100-project .NET solution is an intimidating wall of code. To visualize its true runtime structure, you can leverage your pre-aggregation strategy to let the user pivot between two different views:

| View Mode              | Aggregation Base             | What It Reveals                                                                                                                                       |
| ---------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Logical/Organizational | Solution Folders / Projects  | Shows how the team organized the code on disk. Useful for finding architecture violations (e.g., a domain project incorrectly calling a UI project).  |
| Runtime Execution      | Network Boundaries / Domains | Groups methods purely by execution pathways (e.g., all code touched by the SubmitOrder gRPC endpoint, regardless of which project the files live in). |

By utilizing your database translation layer, you can let the user toggle a switch in your React UI to instantly shift the layout. They can view the graph grouped by Assembly namespaces (where it lives) or grouped by Call clusters (how it behaves).
Your live-fire exercise will be the ultimate validation of this approach. It will immediately show you if your UI aggregation filters are sharp enough to turn a 100-project "hairball" into clean, readable execution lines.
When you begin scanning the distributed codebase for gRPC endpoints, let me know:

- Which gRPC library is the target system using? (e.g., official Grpc.Net.Client / Protobuf, or a code-first variant like protobuf-net.Grpc?)
- Do you want the reverse call stack feature to stop immediately when it hits the main gRPC/Event entry point, or should it attempt to map connections across different processes if they use the same proto files?

I can help you structure the metadata rules to intercept those specific framework boundaries.

---

These interfaces are not standard primitives built into the .NET runtime library (BCL). They are defined and distributed by specific, third-party framework implementations that handle in-memory messaging or distributed service buses. [1, 2, 3]
However, because these specific libraries are the dominant, de facto industry standards for messaging in the .NET ecosystem, these interfaces appear universally across enterprise microservices codebases. [1, 4]
Here is exactly where they originate and how they behave under the hood:

## 1. IConsumer<T> — MassTransit

This interface is defined by [MassTransit](https://masstransit.massient.com/), the most popular open-source distributed application framework for .NET. It acts as a wrapper over message brokers like RabbitMQ, Azure Service Bus, or Amazon SQS. [3, 4, 5]

-
- The Namespace: MassTransit
- The Full Signature: public interface IConsumer<in TMessage> where TMessage : class
- How it looks to your decompiler: When a class implements this, it guarantees a method signature of Task Consume(ConsumeContext<TMessage> context). [3, 5, 6]
-

## 2. IRequestHandler<TRequest, TResponse> — MediatR

This interface is defined by [MediatR](https://github.com/jbogard/MediatR), the standard open-source library used to implement the Mediator pattern and CQRS (Command Query Responsibility Segregation) in-process messaging within .NET applications. [1, 7]

-
- The Namespace: MediatR
- The Full Signature: public interface IRequestHandler<in TRequest, TResponse> where TRequest : IRequest<TResponse>
- How it looks to your decompiler: It enforces the method signature Task<TResponse> Handle(TRequest request, CancellationToken cancellationToken). [8]
-

---

## What This Means for Your Architecture

Because your decompiler relies on Mono.Cecil to inspect assembly metadata, you cannot assume these interfaces will always be present in every binary you parse. If a target project does not pull in the MassTransit or MediatR NuGet packages, your code scanning for these exact names will yield nothing.
To turn this into a robust "Entry Point Discovery" feature, you should approach the configuration using one of two strategies:

## Strategy A: The "Framework Blueprint" Preset (Easiest)

In your C# parser, you can hardcode a registry of known framework interface names. When mapping types, you check if the TypeDefinition.Interfaces collection contains matching strings:

// Inside your Cecil scanning loopif (interfaceRef.FullName.StartsWith("MassTransit.IConsumer`1")) {
    // Flag this method as a Distributed Event Entry Point!
}if (interfaceRef.FullName.StartsWith("MediatR.IRequestHandler`2")) {
// Flag this method as an In-Memory Command Entry Point!
}

## Strategy B: The "Convention-Based Engine" (Most Robust)

Many modern .NET systems drop MediatR entirely and use Microsoft.Extensions.DependencyInjection alongside custom, home-grown abstractions (e.g., a custom ICommandHandler<T> interface). [9]
Instead of locking your tool to third-party package names, your database schema can allow for a configurable "Entry Point Rule" pattern.

-
- In your SQLite database, you can create an entry_point_rules table.
- It stores match patterns like _Consumer<_> or _Handler_.
- When your parser runs, it tags any custom type that fits the convention.
-

This flexible mapping layer ensures that whether a system uses MassTransit, RabbitMQ native APIs, MediatR, or a bespoke company framework, your graph rendering engine will flawlessly identify where execution starts. [4, 9]
As you begin identifying entry points for the live-fire exercise, would it be helpful to see a SQLite query example showing how to join these entry point nodes with your call_edges table to isolate only the downstream paths triggered by a specific event?

[1] [https://www.youtube.com](https://www.youtube.com/watch?v=qIxNHf3wbLw&t=213)
[2] [https://learn.microsoft.com](https://learn.microsoft.com/en-us/dotnet/csharp/event-pattern)
[3] [https://masstransit.massient.com](https://masstransit.massient.com/concepts/consumers)
[4] [https://wrapt.dev](https://wrapt.dev/blog/building-an-event-driven-dotnet-application-setting-up-masstransit-and-rabbitmq)
[5] [https://dev.to](https://dev.to/stevsharp/masstransit-in-aspnet-core-a-practical-guide-to-event-driven-net-c4k)
[6] [https://stackoverflow.com](https://stackoverflow.com/questions/69217398/azure-service-bus-and-masstransit-iconsumer-business-logic)
[7] [https://medium.com](https://medium.com/@callmeyaz/mediatr-how-to-setup-a-request-handler-asp-net-core-357a00ac22be)
[8] [https://github.com](https://github.com/LuckyPennySoftware/MediatR/blob/master/src/MediatR/IRequestHandler.cs)
[9] [https://www.youtube.com](https://www.youtube.com/watch?v=j1OUToRyVHc&t=90)
