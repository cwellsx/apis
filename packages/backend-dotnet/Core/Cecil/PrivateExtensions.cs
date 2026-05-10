using Mono.Cecil;

namespace Core.Cecil.Private
{
    internal static class PrivateExtensions
    {
        internal static bool IsSynthetic(this MethodReference mr)
        {
            var dt = mr.DeclaringType;

            return dt.IsArray
                || dt.IsPointer
                || dt.IsByReference
                || dt is FunctionPointerType
                || dt is GenericParameter
                //|| dt.ContainsGenericParameter
                || mr.CallingConvention == MethodCallingConvention.VarArg
                ;
        }
    }
}
