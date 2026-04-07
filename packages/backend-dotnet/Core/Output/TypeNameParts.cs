using System;
using System.Linq;

namespace Core.Output
{
    public record TypeNameParts(string TypeName, string[]? GenericTypeParameters)
    {
        internal string AsName(bool withArguments)
        {
            if (!withArguments)
            {
                return TypeName;
            }

            var arity = GetTotalArity(TypeName);

            if (GenericTypeParameters == null)
            {
                if (arity != 0)
                {
                    throw new Exception();
                }

                return TypeName;
            }
            else
            {
                if (arity != GenericTypeParameters.Length)
                {
                    throw new Exception();
                }

                return $"{TypeName}<{string.Join(",", GenericTypeParameters)}>";
            }
        }

        private static int GetTotalArity(string fullName)
        {
            var parts = fullName.Split("/");
            return parts.Select(part => GetArity(part)).Sum();
        }

        private static int GetArity(string fullName)
        {
            var index = fullName.LastIndexOf("`");
            if (index == -1)
            {
                return 0;
            }
            var arity = int.Parse(fullName.Substring(index + 1));
            if (arity < 1)
            {
                throw new Exception();
            }
            return arity;
        }
    }
}
