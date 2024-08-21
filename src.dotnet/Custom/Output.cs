using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Custom
{
    // this matches the custom JSON format supported by the application, which is declared in src/customJson.ts
    // Shape if specified should be a Graphviz Node shape value e.g. "folder" -- https://graphviz.org/doc/info/shapes.html
    public record Node(string Id, string? Label, string Layer, string[]? Tags, string[]? Details, Dependency[] Dependencies, string? Shape);

    [JsonConverter(typeof(JsonDependencyConverter))]
    public record Dependency(string Id, string Label, string[]? Details, Dictionary<string, bool>? Properties);
}
