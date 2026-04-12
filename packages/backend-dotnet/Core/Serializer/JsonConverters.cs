using Core.Id;
using Core.Output;
using Core.Output.Ids;
using System;
using System.Collections;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Core.Serializer.JsonConverters
{
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

        // implementation of this class is copied from
        // https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/converters-how-to
        public class IdConverterFactory : JsonConverterFactory
        {
            public override bool CanConvert(Type typeToConvert)
            {
                return typeToConvert.IsGenericType && typeToConvert.GetGenericTypeDefinition() == typeof(Id<>);
            }

            public override JsonConverter? CreateConverter(Type typeToConvert, JsonSerializerOptions options)
            {
                var t = typeToConvert.GetGenericArguments()[0];
                var converterType = typeof(IdConverter<>).MakeGenericType(t);
                return (JsonConverter)Activator.CreateInstance(converterType)!;
            }

            private sealed class IdConverter<T> : JsonConverter<Id<T>> where T : notnull
            {
                public override Id<T>? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
                {
                    throw new NotImplementedException();
                }

                public override void Write(Utf8JsonWriter writer, Id<T> value, JsonSerializerOptions options)
                {
                    var leafId = value.LeafId;

                    object shortName;
                    switch (leafId)
                    {
                        case ITypeId typeId:
                            shortName = Factory.ToShortName(typeId);
                            break;
                        case Output.MethodId methodId:
                            shortName = methodId.SerializeAs;
                            break;
                        default:
                            throw new NotSupportedException($"Unsupported leafId type: {leafId.GetType()}");
                    }

                    JsonSerializer.Serialize(writer, shortName, shortName.GetType(), options);
                }
            }
        }
    }
}
