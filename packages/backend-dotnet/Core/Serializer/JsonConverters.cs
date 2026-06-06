using Core.Id;
using Core.Output;
using Core.Output.Ids;
using System;
using System.Collections;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Core.Serializer.JsonConverters
{
    // implementation of this class is copied from
    // https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/converters-how-to
    public class AssemblyMapConverterFactory : JsonConverterFactory
    {
        public override bool CanConvert(Type typeToConvert)
        {
            return typeToConvert.IsGenericType && typeToConvert.GetGenericTypeDefinition() == typeof(AssemblyMap<>);
        }

        public override JsonConverter CreateConverter(Type typeToConvert, JsonSerializerOptions options)
        {
            var valueType = typeToConvert.GetGenericArguments()[0];
            var converterType = typeof(AssemblyMapConverter<>).MakeGenericType(valueType);
            return (JsonConverter)Activator.CreateInstance(converterType)!;
        }

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
    }

    public class IdConverter<TId, TLeaf> : JsonConverter<TId>
        where TId : Id<TLeaf>
        where TLeaf : notnull
    {
        public override TId Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            throw new NotSupportedException("Deserialization not supported");
        }

        public override void Write(Utf8JsonWriter writer, TId value, JsonSerializerOptions options)
        {
            object shortName = GetShortName(value);
            JsonSerializer.Serialize(writer, shortName, shortName.GetType(), options);
        }

        public override void WriteAsPropertyName(Utf8JsonWriter writer, TId value, JsonSerializerOptions options)
        {
            object shortName = GetShortName(value);
            writer.WritePropertyName(shortName.ToString()!);
        }

        private static object GetShortName(TId value) => Flatten.FromIId(value);
    }

    public class TypeIdConverter : IdConverter<TypeId, ITypeId> { }
    public class LocalTypeIdConverter : IdConverter<LocalTypeId, ILocalTypeId> { }
    public class GenericParameterIdConverter : IdConverter<GenericParameterId, IGenericParameterId> { }

    public class MethodIdConverter : IdConverter<MethodId, IMethodId> { }
    public class LocalMethodIdConverter : IdConverter<LocalMethodId, ILocalMethodId> { }
    public class BaseMethodIdConverter : IdConverter<BaseMethodId, IBaseMethodId> { }
}
