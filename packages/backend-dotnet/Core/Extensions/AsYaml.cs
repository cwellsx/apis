using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using YamlDotNet.Core;
using YamlDotNet.Core.Events;
using YamlDotNet.Serialization;

namespace Core.Extensions
{
    internal static class AsYaml
    {
        internal static string ToYaml<T>(this T value)
        {
            var serializer = new SerializerBuilder()
                .WithTypeInspector(inner => new SkipEmptyValuesTypeInspector(inner))
                .WithTypeConverter(new YamlConverterForShortJson())
                .WithTypeConverter(new ValuesYamlTypeConverter())
                .ConfigureDefaultValuesHandling(DefaultValuesHandling.OmitNull)
                .DisableAliases()
                .Build();

            string yaml = serializer.Serialize(value);
            return yaml;
        }
    }

    public class YamlConverterForShortJson : IYamlTypeConverter
    {
        public bool Accepts(Type type)
        {
            return typeof(IShortJson).IsAssignableFrom(type);
        }

        public void WriteYaml(IEmitter emitter, object? value, Type type, ObjectSerializer serializer)
        {
            var shortJson = (IShortJson)value!;
            var obj = shortJson.SerializeAs;
            if (obj == null)
            {
                emitter.Emit(new Scalar("null"));
                return;
            }

            // Example: compute comment text for this value
            string commentText = ComputeCommentFor(obj);

            // If obj is a sequence (array/list) and you want per-element comments:
            if (obj is IEnumerable seq && !(obj is string))
            {
                // start block sequence
                emitter.Emit(new SequenceStart(null, null, false, SequenceStyle.Block));
                foreach (var element in seq)
                {
                    // emit element as scalar or nested object; here we emit scalar for simplicity
                    // For complex elements you would recursively call serializer.Serialize for that element
                    emitter.Emit(new Scalar(null, null, ConvertToYamlScalar(element)));

                    // emit inline comment for the element
                    emitter.Emit(new Comment(ComputeCommentFor(element), true));
                }
                emitter.Emit(new SequenceEnd());
                return;
            }

            // Non-sequence: emit a scalar (or mapping) and then an inline comment
            emitter.Emit(new Scalar(null, null, ConvertToYamlScalar(obj)));
            emitter.Emit(new Comment(commentText, true));
        }

        public object ReadYaml(IParser parser, Type type, ObjectDeserializer rootDeserializer)
        {
            throw new NotImplementedException();
        }

        // Helpers
        private string ComputeCommentFor(object obj)
        {
            // your logic to produce the comment text for obj
            return "foo";
        }

        private string ConvertToYamlScalar(object obj)
        {
            // convert simple values to string; for complex objects you should
            // either emit nested mappings here or call a nested serializer.
            return obj.ToString() ?? "null";
        }
    }

    public sealed class SkipEmptyValuesTypeInspector : ITypeInspector
    {
        private readonly ITypeInspector _inner;

        public SkipEmptyValuesTypeInspector(ITypeInspector inner) => _inner = inner;

        public IEnumerable<IPropertyDescriptor> GetProperties(Type type, object? container)
        {
            foreach (var prop in _inner.GetProperties(type, container))
            {
                if (container == null)
                {
                    yield return prop;
                    continue;
                }

                // If the declared property type is not Values<>, keep it
                var declared = prop.Type;
                if (!(declared.IsGenericType && declared.GetGenericTypeDefinition() == typeof(Values<>)))
                {
                    yield return prop;
                    continue;
                }

                // It's declared as Values<T>; read the runtime value (may be ObjectDescriptor)
                //object? raw = null;
                //try { raw = prop.Read(container); }
                //catch { yield return prop; continue; }
                object? raw = null;
                raw = prop.Read(container);

                // Unwrap ObjectDescriptor if necessary
                if (raw is ObjectDescriptor od) raw = od.Value;

                // If null or empty, skip; otherwise keep
                if (raw == null)
                {
                    // treat null as empty -> skip
                    continue;
                }

                // Efficient emptiness check
                var arrayProp = raw.GetType().GetProperty("Array");
                if (arrayProp == null) { continue; }

                var arr = arrayProp.GetValue(raw);
                if (arr == null) continue;
                if (arr is System.Collections.ICollection c && c.Count == 0) continue;

                // fallback: enumerate one element
                if (arr is System.Collections.IEnumerable seq && !(arr is string))
                {
                    var en = seq.GetEnumerator();
                    try { if (!en.MoveNext()) continue; }
                    finally { (en as IDisposable)?.Dispose(); }
                }

                yield return prop;
            }
        }

        public IPropertyDescriptor GetProperty(Type type, object? container, string name, bool ignoreUnmatched, bool caseInsensitivePropertyMatching)
            => _inner.GetProperty(type, container, name, ignoreUnmatched, caseInsensitivePropertyMatching);

        public string GetEnumName(Type enumType, string value)
            => _inner.GetEnumName(enumType, value) ?? value;

        public string GetEnumValue(object value)
            => _inner.GetEnumValue(value);
    }

    public sealed class ValuesYamlTypeConverter : IYamlTypeConverter
    {
        public bool Accepts(Type type)
        {
            return type.IsGenericType && type.GetGenericTypeDefinition() == typeof(Values<>);
        }

        public void WriteYaml(IEmitter emitter, object? value, Type type, ObjectSerializer serializer)
        {
            // If the serializer calls with an ObjectDescriptor wrapper, unwrap it (defensive).
            if (value is YamlDotNet.Serialization.ObjectDescriptor od)
            {
                value = od.Value;
            }

            // If the whole Values<T> instance is null, emit YAML null
            if (value == null)
            {
                emitter.Emit(new Scalar("null"));
                return;
            }

            // Get the Array property value via reflection (public getter in your type)
            var arrayProp = value.GetType().GetProperty("Array", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
            var arrObj = arrayProp?.GetValue(value);

            if (arrObj == null)
            {
                // Emit YAML null to match your JSON behavior
                emitter.Emit(new Scalar("null"));
                return;
            }

            // Emit a block sequence and delegate each element to the configured serializer
            emitter.Emit(new SequenceStart(null, null, false, SequenceStyle.Block));
            foreach (var element in (IEnumerable)arrObj)
            {
                if (element == null)
                {
                    emitter.Emit(new Scalar("null"));
                }
                else
                {
                    serializer(element);
                }
            }
            emitter.Emit(new SequenceEnd());
        }

        public object? ReadYaml(IParser parser, Type type, ObjectDeserializer nestedObjectDeserializer)
        {
            throw new NotImplementedException();
        }
    }
}
