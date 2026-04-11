using System.Collections.Generic;

namespace Core.Output
{
    public class MethodId : IShortJson
    {
        readonly string _assemblyName;
        readonly int _metadataToken;
        readonly bool _isLocalAssembly;
        readonly TypeId[]? _genericTypeArguments;
        readonly string _fullname;

        internal MethodId(
            string assemblyName,
            int metadataToken,
            bool isLocalAssembly,
            TypeId[]? genericTypeArguments,
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
