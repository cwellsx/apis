using System.Collections.Generic;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Core
{
    // copied from 
    using MethodDictionary = Dictionary<MethodMember, MethodReader.Decompiled>;
    // copied from MethodReader
    using TypeDictionary = Dictionary<TypeId, TypeMethods>;

    public class JsonConverterForTypesDictionary : JsonConverter<TypeDictionary>
    {
        public override TypeDictionary? Read(ref Utf8JsonReader reader, System.Type typeToConvert, JsonSerializerOptions options)
        {
            throw new System.NotImplementedException();
        }

        public override void Write(Utf8JsonWriter writer, TypeDictionary value, JsonSerializerOptions options)
        {
            writer.WriteStartArray();
            foreach (var kvp in value)
            {
                writer.WriteStartObject();
                writer.WritePropertyName("type");
                JsonSerializer.Serialize(writer, kvp.Key, options);
                writer.WritePropertyName("methods");
                JsonSerializer.Serialize(writer, kvp.Value, options);
                writer.WriteEndObject();
            }
            writer.WriteEndArray();
        }
    }

    public class JsonConverterForMethodsDictionary : JsonConverter<MethodDictionary>
    {
        public override MethodDictionary? Read(ref Utf8JsonReader reader, System.Type typeToConvert, JsonSerializerOptions options)
        {
            throw new System.NotImplementedException();
        }

        public override void Write(Utf8JsonWriter writer, MethodDictionary value, JsonSerializerOptions options)
        {
            writer.WriteStartArray();
            foreach (var kvp in value)
            {
                writer.WriteStartObject();
                writer.WritePropertyName("method");
                JsonSerializer.Serialize(writer, kvp.Key, options);
                writer.WritePropertyName("details");
                JsonSerializer.Serialize(writer, kvp.Value, options);
                writer.WriteEndObject();
            }
            writer.WriteEndArray();
        }
    }

    static class Serializer
    {
        internal static string ToJson<T>(this T value, bool prettyPrint)
        {
            var json = JsonSerializer.Serialize(value, new JsonSerializerOptions
            {
                IncludeFields = true,
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = prettyPrint,
                // "unsafe relaxed" means not OK for HTML but OK for a UTF-8 reader
                Encoder = prettyPrint ? JavaScriptEncoder.UnsafeRelaxedJsonEscaping : JavaScriptEncoder.Default,
                Converters =
                {
                    new JsonConverterFactoryForValuesOfT(),
                    new JsonConverterForTypesDictionary(),
                    new JsonConverterForMethodsDictionary()
                }
            });
            return json;
        }
    }
}
