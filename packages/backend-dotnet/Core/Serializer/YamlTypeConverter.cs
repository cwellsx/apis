using Core.FullNames;
using Core.Id;
using Core.Output;
using Core.Output.Ids;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using YamlDotNet.Core;
using YamlDotNet.Core.Events;
using YamlDotNet.Serialization;

/*
 * Known bugs which don't need fixing given my current data is simple
 * 
 * - IFormatter is too permissive -- some types that implement it should be emitted as quoted strings
 */

namespace Core.Serializer
{
    internal sealed class YamlTypeConverter : IYamlTypeConverter
    {
        internal static WrappedValue WrapRoot(object value) => new WrappedValue(new State(false, null), value);

        INames? _names;
        DefaultValuesHandling _defaultValuesHandling;

        internal YamlTypeConverter(INames? names, DefaultValuesHandling defaultValuesHandling)
        {
            _defaultValuesHandling = defaultValuesHandling;
            _names = names;
        }

        // Immutable state carried with each wrapped value
        internal record State(bool IsInSequence, string? InAssemblyName);

        // Wrapper that carries state + actual value
        internal record WrappedValue(State State, object? Value);

        public object? ReadYaml(IParser parser, Type type, ObjectDeserializer rootDeserializer)
        {
            throw new NotSupportedException("Deserialization not implemented.");
        }

        public bool Accepts(Type type) => type == typeof(WrappedValue);

        public void WriteYaml(
            IEmitter emitter,
            object? value,
            Type _,
            ObjectSerializer serializer)
        {
            var wrapped = (WrappedValue)value!;
            var state = wrapped.State;
            var inner = wrapped.Value;

            if (inner is null)
            {
                emitter.Emit(new Scalar("null"));
                return;
            }

            var type = inner.GetType();

            if (IsAssemblyMap(type))
            {
                WriteDictionary(emitter, (IDictionary)inner, state, serializer, true);
                return;
            }

            switch (inner)
            {
                case IDictionary map:
                    WriteDictionary(emitter, map, state, serializer, false);
                    return;

                case IEnumerable seq when inner is not string && inner is not IDictionary:
                    WriteSequence(emitter, seq, state, serializer);
                    return;

                case IId id:
                    WriteId(emitter, id, state, serializer);
                    return;
            }

            if (IsScalar(type))
            {
                EmitScalar(emitter, inner);
                return;
            }

            if (HasReadableProperties(type))
            {
                WriteObjectProperties(emitter, inner, state, serializer, _defaultValuesHandling);
                return;
            }

            throw new InvalidOperationException($"Unsupported type: {type.FullName}");
        }

        private void WriteDictionary(
            IEmitter emitter,
            IDictionary map,
            State state,
            ObjectSerializer serializer,
            bool isAssemblyMap)
        {
            emitter.Emit(new MappingStart());

            foreach (DictionaryEntry kvp in map)
            {
                object key = kvp.Key;
                object? value = kvp.Value;

                // Emit the key
                EmitScalar(emitter, key);

                // Wrap the value with AssemblyName = key
                var childState = isAssemblyMap ? new State(false, (string)key) : state with { IsInSequence = false };
                var wrapped = new WrappedValue(childState, value);

                serializer(wrapped);
            }

            emitter.Emit(new MappingEnd());
        }

        private void WriteSequence(
            IEmitter emitter,
            IEnumerable seq,
            State state,
            ObjectSerializer serializer)
        {
            emitter.Emit(new SequenceStart(null, null, false, SequenceStyle.Block));

            foreach (var item in seq)
            {
                var childState = state with { IsInSequence = true };
                var wrapped = new WrappedValue(childState, item);

                serializer(wrapped);
            }

            emitter.Emit(new SequenceEnd());
        }

        private const string IgnoreSyntheticFullName = "$";

        private void WriteId(
            IEmitter emitter,
            IId id,
            State state,
            ObjectSerializer serializer)
        {
            var leafObject = id.LeafObject;

            object shortName;
            string? fullName = null;
            switch (leafObject)
            {
                case ITypeId typeId:
                    shortName = TypeFactory.ToShortName(typeId);
                    if (_names != null)
                    {
                        var serialized = Flatten.FromShortName(shortName);
                        fullName = _names.GetTypeName(serialized, state.InAssemblyName.NotNull());
                        AssertFullName(fullName, id.FullName, null);
                    }
                    break;
                case IMethodId methodId:
                    shortName = MethodFactory.ToShortName(methodId);
                    if (_names != null)
                    {
                        var serialized = Flatten.FromShortName(shortName);
                        (fullName, var genericParameterIndex) = _names.GetMethodName(serialized, state.InAssemblyName.NotNull());
                        AssertFullName(fullName, id.FullName, genericParameterIndex);
                    }
                    break;
                default:
                    throw new NotSupportedException($"Unsupported leafId type: {leafObject.GetType()}");
            }

            WriteId(emitter, shortName, fullName, state, serializer);
        }

        private static void AssertFullName(string calculatedFullName, string cecilFullName, Dictionary<string, string>? genericParameterIndex)
        {
            if (cecilFullName == IgnoreSyntheticFullName)
            {
                return;
            }
            if (calculatedFullName != cecilFullName && genericParameterIndex != null)
            {
                cecilFullName = ReplaceGenericParameters(cecilFullName, genericParameterIndex);
            }
            if (calculatedFullName != cecilFullName)
            {
                // If they still don't match, it's a real mismatch
                Logger.Log("");
                Logger.Log(cecilFullName);
                Logger.Log(calculatedFullName);
            }
            Assert(calculatedFullName == cecilFullName, $"Full name mismatch: expected {cecilFullName}, got {calculatedFullName}");
        }

        static string ReplaceGenericParameters(string fullName, Dictionary<string, string> genericParameterIndex)
        {
            string ReplaceArguments(string regex)
            {
                return Regex.Replace(fullName, regex, m =>
                {
                    var value = m.Groups[1].Value;
                    return genericParameterIndex[value];
                });
            }

            // Replace method generic parameter indices: !!0, !!1, ...
            fullName = ReplaceArguments(@"(!!\d+)");

            // Replace type generic parameter indices: !0, !1, ...
            // Safe because all "!!" were already replaced above
            fullName = ReplaceArguments(@"(!\d+)");

            return fullName;
        }

        private void WriteId(
            IEmitter emitter,
            object obj,
            string? fullName,
            State state,
            ObjectSerializer serializer)
        {
            var inAssemblyName = state.InAssemblyName;

            // If obj is a sequence (array/list) and you want per-element comments:
            if (obj is IEnumerable seq && !(obj is string))
            {
                // if this array is the value of a key then an inline comment is good and attaches to the key with the array on lines underneath
                // but if this array is subitems of an array item then emit a block comment instead
                bool isInSequence = state.IsInSequence;
                if (!isInSequence)
                {
                    EmitComment(emitter, fullName);
                }

                // start block sequence
                emitter.Emit(new SequenceStart(null, null, false, SequenceStyle.Block));
                var first = true;
                foreach (var element in seq)
                {
                    // emit element as scalar or nested object; here we emit scalar for simplicity
                    // For complex elements you would recursively call serializer.Serialize for that element

                    var childState = state with { IsInSequence = true };
                    switch (element)
                    {
                        case ITypeId typeId:
                            IId decoratedTypeId = new Id<ITypeId>(IgnoreSyntheticFullName, typeId);
                            serializer(new WrappedValue(childState, decoratedTypeId));
                            break;

                        case IMethodId methodId:
                            IId decoratedMethodId = new Id<IMethodId>(IgnoreSyntheticFullName, methodId);
                            serializer(new WrappedValue(childState, decoratedMethodId));
                            break;

                        case string s:
                            EmitScalar(emitter, s);
                            break;

                        case int i:
                            EmitScalar(emitter, i);
                            break;

                        default:
                            throw new NotSupportedException($"Unsupported element type in sequence: {element.GetType().FullName}");
                    }

                    if (isInSequence && first)
                    {
                        first = false;
                        EmitComment(emitter, fullName, true);
                    }
                }
                emitter.Emit(new SequenceEnd());
                return;
            }
            else
            {
                // Non-sequence: emit a scalar (or mapping) and then an inline comment
                EmitScalar(emitter, obj);
                EmitComment(emitter, fullName);
            }
        }

        private void WriteObjectProperties(
            IEmitter emitter,
            object obj,
            State state,
            ObjectSerializer serializer,
            DefaultValuesHandling defaultValuesHandling)
        {
            emitter.Emit(new MappingStart());

            var type = obj.GetType();
            foreach (var prop in type.GetProperties(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance))
            {
                if (!prop.CanRead) continue;

                var name = prop.Name;
                var value = prop.GetValue(obj);

                if (IsOmitted(defaultValuesHandling, value)) continue;

                emitter.Emit(new Scalar(name));

                var childState = state with { IsInSequence = false };
                var wrapped = new WrappedValue(childState, value);
                serializer(wrapped);
            }

            emitter.Emit(new MappingEnd());
        }

        private static void EmitScalar(IEmitter emitter, object obj)
        {
            switch (obj)
            {
                case bool b:
                    emitter.Emit(new Scalar(b ? "true" : "false"));
                    return;

                case null:
                    emitter.Emit(new Scalar("null"));
                    return;

                default:
                    emitter.Emit(new Scalar(obj.ToString()!));
                    return;
            }
        }

        private void EmitComment(IEmitter emitter, string? fullName, bool isSpecial = false)
        {
            if (fullName == null)
            {
                return;
            }
            if (isSpecial)
            {
                fullName = $";{fullName}"; // prepend ';' for post-processing
            }
            emitter.Emit(new Comment(fullName, true));
            return;
        }

        private static bool IsAssemblyMap(Type type)
        {
            return type.IsGenericType && type.GetGenericTypeDefinition() == typeof(AssemblyMap<>);
        }

        private static bool IsScalar(Type type)
        {
            // Strings are scalars
            if (type == typeof(string)) return true;

            // Primitive numeric types
            if (type.IsPrimitive) return true;

            // Decimal, DateTime, Guid, TimeSpan, etc.
            if (type == typeof(decimal) ||
                type == typeof(DateTime) ||
                type == typeof(Guid) ||
                type == typeof(TimeSpan))
                return true;

            // Enums
            if (type.IsEnum) return true;

            // Anything that implements IFormattable is scalar-like
            if (typeof(IFormattable).IsAssignableFrom(type)) return true;

            return false;
        }

        private static bool HasReadableProperties(Type type)
        {
            if (IsScalar(type)) return false;

            return type.GetProperties(
                System.Reflection.BindingFlags.Public |
                System.Reflection.BindingFlags.Instance
            ).Any(p => p.CanRead);
        }

        private static bool IsOmitted(DefaultValuesHandling defaultValuesHandling, object? value)
        {
            return defaultValuesHandling switch
            {
                DefaultValuesHandling.OmitNull => value is null,
                DefaultValuesHandling.OmitEmptyCollections => value is null || (value is IEnumerable e && IsEmptyEnumerable(e) && value is not string && value is not IDictionary),
                DefaultValuesHandling.OmitDefaults => value is null || value.Equals(Activator.CreateInstance(value.GetType())),
                _ => false,
            };
        }

        private static bool IsEmptyEnumerable(IEnumerable e)
        {
            var enumerator = e.GetEnumerator();
            return !enumerator.MoveNext();
        }
    }
}
