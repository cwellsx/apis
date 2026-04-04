using System;
using System.Collections;
using YamlDotNet.Core;
using YamlDotNet.Core.Events;
using YamlDotNet.Serialization;

namespace Core.Extensions
{
    internal static class AsYaml
    {
        internal static string ToYaml<T>(this T value, INameFromId? nameFromId)
        {
            var serializer = new SerializerBuilder()
                .WithTypeConverter(new YamlConverterForShortJson(nameFromId))
                .ConfigureDefaultValuesHandling(DefaultValuesHandling.OmitNull)
                .DisableAliases()
                .Build();

            string yaml = serializer.Serialize(value);
            return yaml;
        }
    }

    public class YamlConverterForShortJson : IYamlTypeConverter
    {
        INameFromId? _nameFromId;

        internal YamlConverterForShortJson(INameFromId? nameFromId)
        {
            _nameFromId = nameFromId;
        }

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

                    // emit inline comment for the element is TBD
                    //emitter.Emit(new Comment(ComputeCommentFor(element), true));
                }
                emitter.Emit(new SequenceEnd());
                return;
            }

            // Non-sequence: emit a scalar (or mapping) and then an inline comment
            emitter.Emit(new Scalar(null, null, ConvertToYamlScalar(obj)));

            if (_nameFromId != null)
            {
                var typeName = shortJson.GetName(_nameFromId);
                emitter.Emit(new Comment(typeName, true));
            }
        }

        public object ReadYaml(IParser parser, Type type, ObjectDeserializer rootDeserializer)
        {
            throw new NotImplementedException();
        }

        private string ConvertToYamlScalar(object obj)
        {
            // convert simple values to string; for complex objects you should
            // either emit nested mappings here or call a nested serializer.
            return obj.ToString() ?? "null";
        }
    }
}
