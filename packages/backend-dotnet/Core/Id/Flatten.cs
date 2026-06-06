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

        internal static object FromIId(IId value) => Flatten.FromShortName(value.LeafObject switch
        {
            ITypeId typeId => TypeFactory.ToShortName(typeId),
            IMethodId methodId => MethodFactory.ToShortName(methodId),
            _ => throw new NotSupportedException($"Unsupported leafId type: {value.LeafObject.GetType()}"),
        });

        // Cecil FullName can be difficult to emulate
        // implemented it successfully for most cases but not these
        internal const string IgnoreSyntheticFullName = "$";
    }
}
