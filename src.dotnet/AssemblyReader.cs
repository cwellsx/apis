using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Core
{
    public class AssemblyReader
    {
        public Dictionary<string, AssemblyInfo> Assemblies { get; } = new Dictionary<string, AssemblyInfo>();
        public List<string> Exceptions { get; } = new List<string>();
        public string Version { get; } = "2024-02-12"; // see also src\main\shared-types\loaded.ts
        public string[] Exes { get; }

        internal AssemblyReader(string[] exes)
        {
            Exes = exes;
        }

        internal void Add(Assembly assembly, string path)
        {
            try
            {
                var assemblyName = NotNull(GetAssemblyName(assembly));
                var assemblyInfo = new AssemblyInfo(
                    ReferencedAssemblies: assembly.GetReferencedAssemblies().Select(GetAssemblyName).ToArray(),
                    Types: assembly.GetTypes().Select(TypeReader.GetTypeInfo).ToArray()
                    );
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

        internal string ToJson(bool prettyPrint)
        {
            var json = JsonSerializer.Serialize(this, new JsonSerializerOptions
            {
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = prettyPrint
            });
            return json;
        }
    }
}
