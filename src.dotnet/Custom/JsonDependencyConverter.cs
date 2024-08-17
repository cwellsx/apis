using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Custom
{
    public class JsonDependencyConverter : JsonConverter<Dependency>
    {
        public override Dependency? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            throw new NotImplementedException();
        }

        public override void Write(Utf8JsonWriter writer, Dependency value, JsonSerializerOptions options)
        {
            writer.WriteStartObject();
            writer.WriteString("id", value.Id);
            if (value.Label != null)
            {
                writer.WriteString("label", value.Label);
            }
            if (value.Details != null)
            {
                writer.WriteStartArray("dependencies");
                foreach (var detail in value.Details)
                {
                    writer.WriteStringValue(detail);
                }
                writer.WriteEndArray();
            }
            // this is why we need a custom JsonConverter
            // i.e. so that if there are Properties then they're written as properties of the object itself and not as a subkey named "properties"
            if (value.Properties != null)
            {
                foreach (var kvp in value.Properties)
                {
                    writer.WriteBoolean(ToCamelCase(kvp.Key), kvp.Value);
                }
            }
            writer.WriteEndObject();
        }

        static string ToCamelCase(string s) => $"{char.ToLower(s[0])}{s.Substring(1)}";
    }
}
