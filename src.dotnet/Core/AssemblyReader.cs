using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;

namespace Core
{
    public class AssemblyReader
    {
        public Dictionary<string, AssemblyInfo> Assemblies { get; } = new Dictionary<string, AssemblyInfo>();
        public List<string> Exceptions { get; } = new List<string>();
        public string Version { get; } = "2024-02-12"; // see also src\main\shared-types\loaded.ts
        public string[] Exes { get; }
        // this is a field not a property, so it isn't serialized in ToJson
        private MethodReader _methodReader;

        internal AssemblyReader(string[] exes, MethodReader methodReader)
        {
            Exes = exes;
            _methodReader = methodReader;
        }

        internal void Add(Assembly assembly, string path)
        {
            try
            {
                var assemblyName = NotNull(GetAssemblyName(assembly));
                _methodReader.NewAssembly(assemblyName, path);
                var assemblyInfo = new AssemblyInfo(
                    ReferencedAssemblies: assembly.GetReferencedAssemblies().Select(GetAssemblyName).ToArray(),
                    Types: assembly.GetTypes().Select(type => TypeReader.GetTypeInfo(type, _methodReader)).ToArray()
                    );
                TypeReader.Verify(assemblyInfo.Types);
                Assemblies.Add(assemblyName, assemblyInfo);
            }
            catch (Exception e)
            {
                Exceptions.Add($"{path} -- {e.Message}");
            }
        }

        static string GetAssemblyName(AssemblyName assemblyName) => NotNull(assemblyName.Name);
        static string GetAssemblyName(Assembly assembly) => GetAssemblyName(assembly.GetName());

        static string NotNull(string? name)
        {
            if (name == null)
            {
                throw new Exception("Unexpected null Name");
            }
            return name;
        }
    }
}
