using Core.Output;
using Mono.Cecil;
using Core.Output.Ids;

namespace Core.CecilToOutput
{
    internal class ToMethodId
    {
        string _assemblyName;
        ToTypeId _toTypeId;

        internal ToMethodId(string assemblyName)
        {
            _assemblyName = assemblyName;
            _toTypeId = new ToTypeId(assemblyName);
        }

        internal MethodId Convert(MethodReference mr)
        {
            var fullName = mr.FullName;
            ITypeId[]? genericTypeArguments = null;

            if (mr is GenericInstanceMethod gim)
            {
                mr = gim.ElementMethod;
                genericTypeArguments = _toTypeId.ConvertGenericArguments(gim.GenericArguments);
            }

            var md = mr.Resolve();

            var assemblyName = md.DeclaringType.Module.Assembly.Name.Name;
            bool isLocalAssmbly = (assemblyName == _assemblyName);

            return new MethodId(assemblyName, md.MetadataToken.ToInt32(), isLocalAssmbly, genericTypeArguments, md.FullName);
        }
    }
}
