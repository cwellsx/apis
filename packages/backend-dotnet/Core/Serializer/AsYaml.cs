using Core.Output;
using System;
using System.Collections;
using System.Collections.Generic;
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
                EmitComment(emitter, shortJson, !isInSequence);

                // start block sequence
                emitter.Emit(new SequenceStart(null, null, false, SequenceStyle.Block));
                foreach (var element in seq)
                {
                    // emit element as scalar or nested object; here we emit scalar for simplicity
                    // For complex elements you would recursively call serializer.Serialize for that element

                    if (element is IShortJson elementShortJson)
                    {
                        var elementObj = elementShortJson.SerializeAs;
                        emitter.Emit(new Scalar(null, null, ConvertToYamlScalar(elementObj)));
                        EmitComment(emitter, elementShortJson, true);
                    }
                    else
                    {
                        emitter.Emit(new Scalar(null, null, ConvertToYamlScalar(element)));
                    }
                }
                emitter.Emit(new SequenceEnd());
                return;
            }
            else
            {
                // Non-sequence: emit a scalar (or mapping) and then an inline comment
                emitter.Emit(new Scalar(null, null, ConvertToYamlScalar(obj)));

                EmitComment(emitter, shortJson, true);
            }
        }

        private void EmitComment(IEmitter emitter, IShortJson shortJson, bool isInline)
        {
            if (_nameFromId != null)
            {
                var typeName = shortJson.GetName(_nameFromId);
                emitter.Emit(new Comment(typeName, isInline));
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
