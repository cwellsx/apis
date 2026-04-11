using System.Linq;

namespace Core.Output
{
    internal record MethodNameParts(TypeId ReturnType, TypeId DeclaringType, string name, TypeId[]? ParameterTypes, string[]? GenericTypeParameters)
    {
        internal string AsName(INameFromId nameFromId) 
        {
            var parameterTypes = ParameterTypes == null ? "" : $"({string.Join(",", ParameterTypes.Select(t => t.GetName(nameFromId)))})";
            return $"{ReturnType.GetName(nameFromId)} {DeclaringType.GetName(nameFromId)}::{name}{parameterTypes}";
        }
    }
}
