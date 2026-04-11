using System;
using System.Collections.Generic;
using System.Linq;

namespace Core.ShortNames
{
    internal static class Factory
    {
        internal static object ToShortName(IShortName item)
        {
            var type = item.GetType();
            var factory = _factories[type];
            var shortName = factory.ToShortName(item);
            return (factory.IsShortName(shortName) && factory.IsShortNameValid(shortName))
                ? shortName
                : throw new NotSupportedException($"Invalid short name: {shortName}");
        }

        internal static IShortName FromShortName(object shortName)
        {
            var factory = _factories.Values.Single(f => f.IsShortName(shortName));
            if (!factory.IsShortNameValid(shortName))
            {
                throw new NotSupportedException($"Invalid short name: {shortName}");
            }
            return factory.FromShortName(shortName);
        }

        static readonly Dictionary<Type, IFactory> _factories = new Dictionary<Type, IFactory>();

        static Factory()
        {
            RegisterFactory(new LocalFactory());
            RegisterFactory(new RemoteFactory());
            RegisterFactory(new GenericParameterFactory());
            RegisterFactory(new SpecificationFactory());
            RegisterFactory(new FunctionFactory());
        }

        static void RegisterFactory<T>(FactoryBase<T> factory) where T : IShortName
        {
            _factories[factory.TargetType] = factory;
        }

        interface IFactory
        {
            object ToShortName(IShortName item);
            IShortName FromShortName(object shortName);
            bool IsShortName(object shortName);
            bool IsShortNameValid(object shortName);
        }

        interface IFactory<T> : IFactory where T : IShortName
        {
            object ToShortName(T value);
            new T FromShortName(object shortName);
        }

        internal abstract class FactoryBase<T> : IFactory<T> where T : IShortName
        {
            public Type TargetType => typeof(T);

            public abstract object ToShortName(T value);
            public abstract T FromShortName(object shortName);
            public abstract bool IsShortName(object shortName);
            public abstract bool IsShortNameValid(object shortName);

            object IFactory.ToShortName(IShortName value) => ToShortName((T)value);
            IShortName IFactory.FromShortName(object shortName) => FromShortName(shortName);
        }

        // subclasses for sealed types only

        class LocalFactory : FactoryBase<LocalShortName>
        {
            public override object ToShortName(LocalShortName item) => item.MetadataToken;
            public override LocalShortName FromShortName(object shortName) => new LocalShortName((int)shortName);
            public override bool IsShortName(object shortName) => shortName is int;
            public override bool IsShortNameValid(object shortName) => (int)shortName > 0;
        }

        class RemoteFactory : FactoryBase<RemoteShortName>
        {
            public override object ToShortName(RemoteShortName item) => $"{item.AssemblyName}|{item.MetadataToken}";
            public override RemoteShortName FromShortName(object shortName)
            {
                var parts = ((string)shortName).Split('|');
                return new RemoteShortName(parts[0], int.Parse(parts[1]));
            }
            public override bool IsShortName(object shortName) => shortName is string s && s.Contains("|");
            public override bool IsShortNameValid(object shortName) => ((string)shortName).Split('|').Length == 2;
        }

        class GenericParameterFactory : FactoryBase<GenericParameterShortName>
        {
            public override object ToShortName(GenericParameterShortName item) => IsValidIdentifier(item.ParameterName) ? item.ParameterName : $"!{item.ParameterName}";
            public override GenericParameterShortName FromShortName(object shortName)
            {
                var parameterName = (string)shortName;
                return new GenericParameterShortName(IsEscapedIdentifier(parameterName) ? parameterName.Substring(1) : parameterName);
            }
            public override bool IsShortName(object shortName) => shortName is string s && IsValidIdentifier(s);
            public override bool IsShortNameValid(object shortName) => true;

            // or use Microsoft.CodeAnalysis.CSharp.SyntaxFacts.IsValidIdentifier(s) e.g. to avoid keywords
            private static bool IsValidIdentifier(string s)
            {
                if (string.IsNullOrEmpty(s)) return false;
                if (IsEscapedIdentifier(s))
                {
                    return true; // allow any string starting with '!' as a non-identifier (e.g. for generic parameters with invalid names)
                }
                if (!(char.IsLetter(s[0]) || s[0] == '_')) return false;

                for (int i = 1; i < s.Length; i++)
                    if (!(char.IsLetterOrDigit(s[i]) || s[i] == '_'))
                        return false;

                return true;
            }

            private static bool IsEscapedIdentifier(string s) => s.StartsWith("!") && s.Length > 1;
        }

        class SpecificationFactory : FactoryBase<SpecificationShortName>
        {
            public override object ToShortName(SpecificationShortName item)
            {
                var result = new List<object>
                {
                    item.Resolved
                };
                if (item.GenericTypeArguments != null)
                {
                    result.AddRange(item.GenericTypeArguments);
                }
                if (!string.IsNullOrEmpty(item.Suffix))
                {
                    if (!IsValidSuffix(item.Suffix))
                    {
                        throw new NotSupportedException($"Invalid suffix: {item.Suffix}");
                    }
                    result.Add(item.Suffix);
                }
                return result.ToArray();
            }

            public override SpecificationShortName FromShortName(object shortName)
            {
                var arrayId = (Array)shortName;
                if (arrayId.Length < 2)
                {
                    throw new NotSupportedException($"Invalid arrayId: {arrayId}");
                }
                var items = arrayId.Cast<object>().ToArray();

                // need to distinguish whether the last element is a suffix or part of the generic type arguments -- to do this, prepend the suffix with a space
                var last = items.Last();
                string? suffix = last is string s && IsValidSuffix(s) ? s : null;

                var genericTypeItems = suffix != null
                    ? items.Skip(1).Take(items.Length - 2)
                    : items.Skip(1);

                var genericTypeArguments = genericTypeItems.Select(item => Factory.FromShortName(item)).ToArray();

                var resolved = (IBaseShortName)Factory.FromShortName(items[0]);

                return new SpecificationShortName(resolved, genericTypeArguments, suffix);
            }

            public override bool IsShortName(object shortName) => shortName is Array;
            public override bool IsShortNameValid(object shortName) => true;

            private static bool IsValidSuffix(string s)
            {
                switch (s[0])
                {
                    case ' ':
                    case '*':
                    case '&':
                    case '$':
                    case '[':
                        return true;
                    default:
                        return false;
                }
            }
        }

        class FunctionFactory : FactoryBase<FunctionShortName>
        {
            public override object ToShortName(FunctionShortName item) => $"*{item.FunctionName}";
            public override FunctionShortName FromShortName(object shortName) => new FunctionShortName(((string)shortName).Substring(1));
            public override bool IsShortName(object shortName) => shortName is string s && s[0] == '*';
            public override bool IsShortNameValid(object shortName) => true;
        }
    }
}
