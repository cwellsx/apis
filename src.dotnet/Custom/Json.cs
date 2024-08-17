using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Custom
{
    public static class Json
    {
        public static string ToJson(this Node[] value, bool prettyPrint)
        {
            var json = JsonSerializer.Serialize(value, new JsonSerializerOptions
            {
                IncludeFields = true,
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = prettyPrint,
                // "unsafe relaxed" means not OK for HTML but OK for a UTF-8 reader
                Encoder = prettyPrint ? JavaScriptEncoder.UnsafeRelaxedJsonEscaping : JavaScriptEncoder.Default,
            });
            return json;
        }
    }
}
