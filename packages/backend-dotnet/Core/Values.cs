using System;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Core.Extensions
{
    // this JSON serializes like an array but implements value-equality semantics
    public class Values<T> where T : notnull
    {
        internal T[]? Array { get; }

        public static implicit operator Values<T>(T[]? array) => new Values<T>(array);

        internal Values(T[]? array)
        {
            if (array?.Length == 0)
            {
                array = null;
            }
            Array = array;
        }

        internal int Length => Array?.Length ?? 0;
        internal T this[int i] => Array![i];

        public override int GetHashCode()
        {
            // https://stackoverflow.com/questions/263400/what-is-the-best-algorithm-for-overriding-gethashcode
            int hash = 17;
            if (Array != null)
            {
                foreach (T item in Array)
                {
                    hash = hash * 23 + item.GetHashCode();
                }
            }
            return hash;
        }

        public override string ToString() => Array != null ? $"[{string.Join(", ", Array)}]" : "null";

        public bool Equals(Values<T>? other)
        {
            if (other is null)
                return false;

            if (this.Array == null || other.Array == null)
                return this.Array == null && other.Array == null;

            return Array.SequenceEqual(other.Array);
        }

        public override bool Equals(object? obj) => Equals(obj as Values<T>);

        public static bool operator ==(Values<T>? left, Values<T>? right)
        {
            if (ReferenceEquals(left, right)) return true;
            if (!(left is null))
            {
                return left.Equals(right);
            }
            if (!(right is null))
            {
                return right.Equals(left);
            }
            return true; // both null
        }

        public static bool operator !=(Values<T>? left, Values<T>? right) => !(left == right);
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
