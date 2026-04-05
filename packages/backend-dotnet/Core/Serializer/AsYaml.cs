using Core.Output;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using YamlDotNet.Core;
using YamlDotNet.Core.Events;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.EventEmitters;

namespace Core.Serializer
{
    internal static class AsYaml
    {
        internal static string ToYaml<T>(this T value, INameFromId? nameFromId)
        {
            var serializer = new SerializerBuilder()
                .WithTypeConverter(new YamlConverterForShortJson(nameFromId))
                .WithEventEmitter(next => new ContextTrackingEventEmitter(next))
                .ConfigureDefaultValuesHandling(DefaultValuesHandling.OmitNull)
                .DisableAliases()
                .Build();

            string yaml = serializer.Serialize(value);

            // postprocess the "special" comments to change this
            //
            // - - 33554469 # Core.Loader.ILoaded`1 # ;Core.Loader.ILoaded`1<U>
            //
            // to this
            //
            // - # Core.Loader.ILoaded`1<U>
            //   - 33554469 # Core.Loader.ILoaded`1

            var lines = yaml.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None).ToList();

            for (var i = 0; i < lines.Count; i++)
            {
                var line = lines[i];
                var index0 = line.IndexOf("- -");
                var index1 = line.IndexOf("# ;");
                if (index0 < 0 || index1 < 0)
                {
                    continue;
                }
                var line0 = new string(' ', index0) + "- # " + line.Substring(index1 + 3);
                var line1 = new string(' ', index0 + 2) + line.Substring(index0 + 2, index1 - index0 - 3);
                lines[i] = line0;
                lines.Insert(i + 1, line1);
            }

            yaml = string.Join("\r\n", lines);

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
                // if this array is the value of a key then an inline comment is good and attaches to the key with the array on lines underneath
                // but if this array is subitems of an array item then emit a block comment instead
                bool isInSequence = ContextTrackingEventEmitter.Singleton?.IsInSequence ?? false;
                if (!isInSequence)
                {
                    EmitComment(emitter, shortJson);
                }

                // start block sequence
                emitter.Emit(new SequenceStart(null, null, false, SequenceStyle.Block));
                var first = true;
                foreach (var element in seq)
                {
                    // emit element as scalar or nested object; here we emit scalar for simplicity
                    // For complex elements you would recursively call serializer.Serialize for that element

                    if (element is IShortJson elementShortJson)
                    {
                        var elementObj = elementShortJson.SerializeAs;
                        emitter.Emit(new Scalar(null, null, ConvertToYamlScalar(elementObj)));
                        EmitComment(emitter, elementShortJson);
                    }
                    else
                    {
                        emitter.Emit(new Scalar(null, null, ConvertToYamlScalar(element)));
                    }

                    if (isInSequence && first)
                    {
                        first = false;
                        EmitComment(emitter, shortJson, true);
                    }
                }
                emitter.Emit(new SequenceEnd());
                return;
            }
            else
            {
                // Non-sequence: emit a scalar (or mapping) and then an inline comment
                emitter.Emit(new Scalar(null, null, ConvertToYamlScalar(obj)));

                EmitComment(emitter, shortJson);
            }
        }

        private void EmitComment(IEmitter emitter, IShortJson shortJson, bool isSpecial = false)
        {
            if (_nameFromId != null)
            {
                var typeName = shortJson.GetName(_nameFromId);
                if (isSpecial)
                {
                    typeName = $";{typeName}"; // prepend ';' for post-processing
                }
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

    // Minimal enum for node context
    enum NodeKind { Mapping, Sequence }

    // A small emitter wrapper that tracks context
    public class ContextTrackingEventEmitter : ChainedEventEmitter
    {
        internal static ContextTrackingEventEmitter? Singleton { get; private set; }

        // stack of contexts; top = current container
        private readonly Stack<NodeKind> _stack = new Stack<NodeKind>();

        // when inside a mapping we need to know whether the next scalar is a key or a value
        private bool _expectingKey = false;

        public ContextTrackingEventEmitter(IEventEmitter next) : base(next)
        {
            Singleton = this;
        }

        public bool IsInSequence => _stack.Count > 0 && _stack.Peek() == NodeKind.Sequence;
        public bool IsInMapping => _stack.Count > 0 && _stack.Peek() == NodeKind.Mapping;
        public bool NextScalarIsMappingKey => IsInMapping && _expectingKey;

        // Called when a mapping starts
        public override void Emit(MappingStartEventInfo eventInfo, IEmitter emitter)
        {
            _stack.Push(NodeKind.Mapping);
            // when a mapping starts, the first scalar will be a key
            _expectingKey = true;
            base.Emit(eventInfo, emitter);
        }

        public override void Emit(MappingEndEventInfo eventInfo, IEmitter emitter)
        {
            base.Emit(eventInfo, emitter);
            _stack.Pop();
            // after popping, we don't know the parent's expectingKey state; reset conservatively
            _expectingKey = false;
        }

        public override void Emit(SequenceStartEventInfo eventInfo, IEmitter emitter)
        {
            _stack.Push(NodeKind.Sequence);
            base.Emit(eventInfo, emitter);
        }

        public override void Emit(SequenceEndEventInfo eventInfo, IEmitter emitter)
        {
            base.Emit(eventInfo, emitter);
            _stack.Pop();
        }

        // When a scalar is emitted we can update the mapping key/value toggle.
        public override void Emit(ScalarEventInfo eventInfo, IEmitter emitter)
        {
            // If we are inside a mapping, a scalar alternates key/value/key/value...
            if (IsInMapping)
            {
                // If the scalar is a key, after emitting it the next scalar will be a value.
                if (_expectingKey)
                {
                    base.Emit(eventInfo, emitter);
                    _expectingKey = false;
                    return;
                }
                else
                {
                    // it was a value; after a value the next scalar is a key again
                    base.Emit(eventInfo, emitter);
                    _expectingKey = true;
                    return;
                }
            }

            // Not in mapping: just emit
            base.Emit(eventInfo, emitter);
        }
    }
}
