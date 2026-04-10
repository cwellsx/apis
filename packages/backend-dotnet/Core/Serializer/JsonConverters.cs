using System;
using System.Collections;
using System.Text.Json;
using System.Text.Json.Serialization;
using Core.Output;

namespace Core.Serializer.JsonConverters
{
    internal class AssemblyMapConverter<T> : JsonConverter<AssemblyMap<T>>
    {
        public override AssemblyMap<T> Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            throw new NotSupportedException();
        }

        public override void Write(Utf8JsonWriter writer, AssemblyMap<T> value, JsonSerializerOptions options)
        {
            JsonSerializer.Serialize(writer, (IDictionary)value, options);
        }
    }

    public class AssemblyMapConverterFactory : JsonConverterFactory
    {
        public override bool CanConvert(Type typeToConvert)
        {
            return typeToConvert.IsGenericType &&
                   typeToConvert.GetGenericTypeDefinition() == typeof(AssemblyMap<>);
        }

        public override JsonConverter CreateConverter(Type typeToConvert, JsonSerializerOptions options)
        {
            var valueType = typeToConvert.GetGenericArguments()[0];

            var converterType = typeof(AssemblyMapConverter<>).MakeGenericType(valueType);

            return (JsonConverter)Activator.CreateInstance(converterType)!;
        }
    }
}
