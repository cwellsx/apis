using Core.Output.Ids;
using System;
using System.Linq;

namespace Core.Id
{
    internal static class Flatten
    {
        internal static object FromShortName(object value) => value switch
        {
            ITypeId typeId => FromShortName(TypeFactory.ToShortName(typeId)),

            IMethodId methodId => FromShortName(MethodFactory.ToShortName(methodId)),

            Array arr => arr.Cast<object>()
                            .Select(FromShortName)
                            .ToArray(),

            _ => value
        };
    }
}
