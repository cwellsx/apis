using System;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Core
{
    // this JSON serializes like an array but implements value-equality semantics
    public class Values<T> where T : notnull
    {
        internal T[] Array { get; }

        public static implicit operator Values<T>?(T[]? array) => array == null ? null : new Values<T>(array);

        internal Values(T[] array)
        {
            Array = array;
        }

        internal int Length => Array.Length;

        public override bool Equals(object? obj)
        {
            Values<T>? rhs = obj as Values<T>;
            if (rhs == null)
            {
                return false;
            }
            return Array.SequenceEqual(rhs.Array);
        }

        public override int GetHashCode()
        {
            // https://stackoverflow.com/questions/263400/what-is-the-best-algorithm-for-overriding-gethashcode
            int hash = 17;
            foreach (T item in Array)
            {
                hash = hash * 23 + item.GetHashCode();
            }
            return hash;
        }
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
    }

    public class JsonConverterForValuesOfT<T> : JsonConverter<Values<T>> where T : notnull
    {
        public override Values<T>? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            throw new NotImplementedException();
        }

        public override void Write(Utf8JsonWriter writer, Values<T> value, JsonSerializerOptions options)
        {
            writer.WriteStartArray();
            foreach (T item in value.Array)
            {
                JsonSerializer.Serialize(writer, item, options);
            }
            writer.WriteEndArray();
        }
    }
}
