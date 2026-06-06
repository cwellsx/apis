using Core.Serializer.JsonConverters;
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
                    new AssemblyMapConverterFactory(),

                    new TypeIdConverter(),
                    new LocalTypeIdConverter(),
                    new GenericParameterIdConverter(),

                    new MethodIdConverter(),
                    new LocalMethodIdConverter(),
                    new BaseMethodIdConverter(),
                }
            });
            return json;
        }
    }
}
