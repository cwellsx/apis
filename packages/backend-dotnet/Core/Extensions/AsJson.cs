using System;
using System.IO;
using System.Reflection;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Core.Extensions
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
                    new JsonConverterFactoryForValuesOfT(),
                    new JsonConverterFactoryForShortJson() { PrettyPrint = prettyPrint }
                }
            });
            return json;
        }

        // implementation of this class is copied from
        // https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/converters-how-to
        public class JsonConverterFactoryForValuesOfT : JsonConverterFactory
        {
            public override bool CanConvert(Type typeToConvert)
            {
                return typeToConvert.IsGenericType && typeToConvert.GetGenericTypeDefinition() == typeof(Values<>);
            }

            public override JsonConverter? CreateConverter(Type typeToConvert, JsonSerializerOptions options)
            {
                Type elementType = typeToConvert.GetGenericArguments()[0];

                JsonConverter converter = (JsonConverter)Activator.CreateInstance(
                    typeof(JsonConverterForValuesOfT<>).MakeGenericType(new Type[] { elementType }),
                    BindingFlags.Instance | BindingFlags.Public,
                    binder: null,
                    args: null,
                    culture: null)!;

                return converter;
            }

            private sealed class JsonConverterForValuesOfT<T> : JsonConverter<Values<T>> where T : notnull
            {
                public override Values<T>? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
                {
                    throw new NotImplementedException();
                }

                public override void Write(Utf8JsonWriter writer, Values<T> value, JsonSerializerOptions options)
                {
                    if (value.Array == null)
                    {
                        writer.WriteNullValue();
                        return;
                    }
                    writer.WriteStartArray();
                    foreach (T item in value.Array)
                    {
                        JsonSerializer.Serialize(writer, item, options);
                    }
                    writer.WriteEndArray();
                }
            }
        }

        // implementation of this class is copied from
        // https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/converters-how-to
        public class JsonConverterFactoryForShortJson : JsonConverterFactory
        {
            internal bool PrettyPrint { get; init; }

            public override bool CanConvert(Type typeToConvert)
            {
                return typeof(IShortJson).IsAssignableFrom(typeToConvert);
            }

            public override JsonConverter? CreateConverter(Type typeToConvert, JsonSerializerOptions options)
            {
                return (JsonConverter)Activator.CreateInstance(typeof(JsonConverterForShortJson), new object[] { PrettyPrint })!;
            }

            private sealed class JsonConverterForShortJson : JsonConverter<IShortJson>
            {
                private readonly bool _prettyPrint;

                public JsonConverterForShortJson(bool prettyPrint)
                {
                    _prettyPrint = prettyPrint;
                }

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

                    // Serialize the returned object using the serializer so it respects converters/options
                    if (!_prettyPrint)
                    {
                        JsonSerializer.Serialize(writer, obj, obj.GetType(), options);
                        return;
                    }

                    using var ms = new MemoryStream();
                    //var isArray = false ;// obj is Array;
                    //var nonIndented = new JsonWriterOptions { Indented = !isArray, Encoder = writer.Options.Encoder };
                    var writerOptions = new JsonWriterOptions { Indented = true, Encoder = writer.Options.Encoder };
                    using (var tempWriter = new Utf8JsonWriter(ms, writerOptions))
                    {
                        JsonSerializer.Serialize(tempWriter, obj, obj.GetType(), options);
                        tempWriter.Flush();
                    }

                    string compactValue = Encoding.UTF8.GetString(ms.ToArray());

                    // append the comment to the compact fragment
                    // write the whole fragment as a raw value into the main writer
                    // Use the overload that skips validation if available to avoid the writer re-parsing the fragment.
                    writer.WriteRawValue($"{compactValue} /* foo */", skipInputValidation: true);
                }
            }
        }
    }
}
