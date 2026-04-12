using System;
using System.Collections.Generic;
using System.Linq;
using static Core.Id.Factory;
using Core.Output.Ids;
using Core.Id.Types;

namespace Core.Id.TypeFactories
{
    class LocalFactory : FactoryBase<LocalType>
    {
        public override object ToShortName(LocalType item) => item.MetadataToken;
        public override LocalType FromShortName(object shortName) => new LocalType((int)shortName);
        public override bool IsShortName(object shortName) => shortName is int;
        public override bool IsShortNameValid(object shortName) => (int)shortName > 0;
    }

    class RemoteFactory : FactoryBase<RemoteType>
    {
        public override object ToShortName(RemoteType item) => $"{item.AssemblyName}|{item.MetadataToken}";
        public override RemoteType FromShortName(object shortName)
        {
            var parts = ((string)shortName).Split('|');
            return new RemoteType(parts[0], int.Parse(parts[1]));
        }
        public override bool IsShortName(object shortName) => shortName is string s && s.Contains("|");
        public override bool IsShortNameValid(object shortName) => ((string)shortName).Split('|').Length == 2;
    }

    class GenericParameterFactory : FactoryBase<GenericParameter>
    {
        public override object ToShortName(GenericParameter item) => IsValidIdentifier(item.ParameterName) ? item.ParameterName : $"!{item.ParameterName}";
        public override GenericParameter FromShortName(object shortName)
        {
            var parameterName = (string)shortName;
            return new GenericParameter(IsEscapedIdentifier(parameterName) ? parameterName.Substring(1) : parameterName);
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

    class SpecificationFactory : FactoryBase<SpecificationType>
    {
        public override object ToShortName(SpecificationType item)
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

        public override SpecificationType FromShortName(object shortName)
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

            var resolved = (IBaseTypeId)Factory.FromShortName(items[0]);

            return new SpecificationType(resolved, genericTypeArguments, suffix);
        }

        public override bool IsShortName(object shortName) => shortName is Array;
        public override bool IsShortNameValid(object shortName) => ((Array)shortName).Length > 1;// && ((Array)shortName).Cast<object>().All(o => o is string || o is ITypeId);

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

    class FunctionFactory : FactoryBase<FunctionType>
    {
        public override object ToShortName(FunctionType item) => $"*{item.FunctionName}";
        public override FunctionType FromShortName(object shortName) => new FunctionType(((string)shortName).Substring(1));
        public override bool IsShortName(object shortName) => shortName is string s && s[0] == '*';
        public override bool IsShortNameValid(object shortName) => true;
    }
}
