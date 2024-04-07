using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;

namespace Core
{
    using AssemblyMethods = Dictionary<string, Dictionary<int, MethodDetails>>;

    public class AssemblyReader
    {
        public Dictionary<string, AssemblyInfo> Assemblies { get; } = new Dictionary<string, AssemblyInfo>();
        public List<string> Exceptions { get; } = new List<string>();
        public string Version { get; } = "2024-04-07"; // see also src\main\shared-types\loaded.ts
        public string[] Exes { get; }
        public AssemblyMethods AssemblyMethods => _methodFinder.Dictionary;
        // this is a field not a property, so it isn't serialized in ToJson
        private MethodReader _methodReader;
        private MethodFinder _methodFinder;

        internal AssemblyReader(string[] exes, Func<string, bool> isMicrosoftAssemblyName)
        {
            Exes = exes;
            _methodReader = new MethodReader(isMicrosoftAssemblyName);
            _methodFinder = new MethodFinder();
        }

        internal void Add(Assembly assembly, string path)
        {
            try
            {
                var assemblyName = GetAssemblyName(assembly).NotNull();
                var assemblyInfo = new AssemblyInfo(
                    ReferencedAssemblies: assembly.GetReferencedAssemblies().Select(GetAssemblyName).ToArray(),
                    Types: assembly.GetTypes().Select(type => TypeReader.GetTypeInfo(type)).ToArray()
                    );
                TypeReader.Verify(assemblyInfo.Types);
                Assemblies.Add(assemblyName, assemblyInfo);
                _methodReader.Add(assemblyName, path, assemblyInfo);
            }
            catch (Exception e)
            {
                Exceptions.Add($"{path} -- {e.Message}");
            }
        }

        internal void Finish()
        {
            _methodFinder.Finish(_methodReader);
        }

        internal void WriteJsonToFiles()
        {
            File.WriteAllText("Core.json", Assemblies.ToJson(true));
            File.WriteAllText("Found.json", _methodFinder.ToJson(true));
            File.WriteAllText("All.json", this.ToJson(true));
            File.WriteAllText("All2.json", this.ToJson(false));
        }

        static string GetAssemblyName(AssemblyName assemblyName) => assemblyName.Name.NotNull();
        static string GetAssemblyName(Assembly assembly) => GetAssemblyName(assembly.GetName());
    }
}
