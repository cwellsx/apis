using System;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Core.Serializer
{
    static class AsJson
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
                    new JsonConverterFactoryForShortJson()
                }
            });
            return json;
        }

        // implementation of this class is copied from
        // https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/converters-how-to
        public class JsonConverterFactoryForShortJson : JsonConverterFactory
        {
            public override bool CanConvert(Type typeToConvert)
            {
                return typeof(IShortJson).IsAssignableFrom(typeToConvert);
            }

            public override JsonConverter? CreateConverter(Type typeToConvert, JsonSerializerOptions options)
            {
                return (JsonConverter)Activator.CreateInstance(typeof(JsonConverterForShortJson))!;
            }

            private sealed class JsonConverterForShortJson : JsonConverter<IShortJson>
            {
                public override IShortJson? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
                {
                    throw new NotImplementedException();
                }

                public override void Write(Utf8JsonWriter writer, IShortJson value, JsonSerializerOptions options)
                {
                    if (value is null)
                    {
                        writer.WriteNullValue();
                        return;
                    }

                    var obj = value.SerializeAs;
                    if (obj is null)
                    {
                        writer.WriteNullValue();
                        return;
                    }

                    if (typeof(IShortJson).IsAssignableFrom(obj.GetType()))
                    {
                        throw new Exception();
                    }

                    JsonSerializer.Serialize(writer, obj, obj.GetType(), options);
                }
            }
        }
    }
}
