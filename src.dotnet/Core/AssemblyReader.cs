using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.IO;

namespace Core
{
    using AssemblyDictionary = Dictionary<string, Dictionary<string, Dictionary<string, MethodDetails>>>;

    public class AssemblyReader
    {
        public Dictionary<string, AssemblyInfo> Assemblies { get; } = new Dictionary<string, AssemblyInfo>();
        public List<string> Exceptions { get; } = new List<string>();
        public string Version { get; } = "2024-02-12"; // see also src\main\shared-types\loaded.ts
        public string[] Exes { get; }
        public AssemblyDictionary AssemblyMethods => _methodFinder.Dictionary;
        // this is a field not a property, so it isn't serialized in ToJson
        private MethodReader _methodReader;
        private MethodFinder _methodFinder;

        internal AssemblyReader(string[] exes, Func<string?, bool> isMicrosoftAssemblyName)
        {
            Exes = exes;
            _methodReader = new MethodReader(isMicrosoftAssemblyName);
            _methodFinder = new MethodFinder();
        }

        internal void Add(Assembly assembly, string path)
        {
            try
            {
                var assemblyName = NotNull(GetAssemblyName(assembly));
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
            _methodReader.Verify(Assemblies);
            _methodFinder.Finish(_methodReader);
        }

        internal void WriteJsonToFiles()
        {
            File.WriteAllText("Core.json", Assemblies.ToJson(true));
            File.WriteAllText("Methods.json", _methodReader.ToJson(true));
            File.WriteAllText("Found.json", _methodFinder.ToJson(true));
            File.WriteAllText("All.json", this.ToJson(true));
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
