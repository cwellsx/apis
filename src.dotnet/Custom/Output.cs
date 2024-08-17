using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Custom
{
    // this matches the custom JSON format supported by the application, which is declared in src/customJson.ts
    public record Node(string Id, string? Label, string Layer, string[]? Tags, string[]? Details, Dependency[] Dependencies);

    [JsonConverter(typeof(JsonDependencyConverter))]
    public record Dependency(string Id, string Label, string[]? Details, Dictionary<string, bool>? Properties);
}
