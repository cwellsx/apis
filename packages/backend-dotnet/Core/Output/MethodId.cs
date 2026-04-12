using System.Collections.Generic;
using Core.Output.Ids;

namespace Core.Output
{
    public class MethodId
    {
        readonly string _assemblyName;
        readonly int _metadataToken;
        readonly bool _isLocalAssembly;
        readonly ITypeId[]? _genericTypeArguments;
        readonly string _fullname;

        internal MethodId(
            string assemblyName,
            int metadataToken,
            bool isLocalAssembly,
            ITypeId[]? genericTypeArguments,
            string fullName
            )
        {
            _assemblyName = assemblyName;
            _metadataToken = metadataToken;
            _isLocalAssembly = isLocalAssembly;
            _genericTypeArguments = genericTypeArguments;
            _fullname = fullName;
        }

        // methods of the IShortJson interface used to help serialize these classes in a compact format
        public object SerializeAs
        {
            get
            {
                object id = _isLocalAssembly ? _metadataToken : $"{_assemblyName}|{_metadataToken}";
                if (_genericTypeArguments == null)
                {
                    return id;
                }
                var list = new List<object>() { id };
                list.AddRange(_genericTypeArguments);
                return list.ToArray();
            }
        }
        internal string FullName => _fullname;

        internal string AssemblyName => _assemblyName;
    }
}
