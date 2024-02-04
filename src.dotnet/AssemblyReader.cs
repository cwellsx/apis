using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Core
{
    public record TypeInfo(
        List<string> Assembly,
        string[]? Attributes,
        string? BaseType,
        string[]? Interfaces
        );

    public class AssemblyReader
    {
        public Dictionary<string, string[]> Assemblies { get; } = new Dictionary<string, string[]>();
        public Dictionary<string, TypeInfo> Types { get; } = new Dictionary<string, TypeInfo>();
        public string Version { get; } = "2024-02-04"; // see also src\main\shared-types\loaded.ts
        public string[] Exes { get; }

        internal AssemblyReader(string[] exes)
        {
            Exes = exes;
        }

        internal void Add(Assembly assembly)
        {
            var assemblyName = GetName(assembly.GetName());
            Assemblies.Add(assemblyName, assembly.GetReferencedAssemblies().Select(GetName).ToArray());
            foreach (var type in assembly.GetTypes())
            {
                if (IsUnwanted(type))
                {
                    continue;
                }
                var attributes = Try(type, type =>
                {
                    var list = type.GetCustomAttributesData();
                    return list.Count == 0 ? null : list.Select(GetAttribute).ToArray();
                });
                var baseType = Try(type, type =>
                {
                    var baseType = type.BaseType;
                    return baseType == null ? null : GetName(baseType);
                });
                var interfaces = Try(type, type =>
                {
                    var array = type.GetInterfaces();
                    return array.Length == 0 ? null : array.Select(GetName).ToArray();
                });
                var typeName = GetName(type);
                if (Types.TryGetValue(typeName, out var found))
                {
                    found.Assembly.Add(assemblyName);
                }
                else
                {
                    Types.Add(GetName(type), new TypeInfo(
                        new List<string> { assemblyName },
                        attributes,
                        baseType,
                        interfaces
                        ));
                }
            }
        }

        static bool IsUnwanted(Type type)
        {
            if (type.CustomAttributes.Any(customAttributeData => customAttributeData.AttributeType.FullName == "System.Runtime.CompilerServices.CompilerGeneratedAttribute"))
            {
                // compiler creates types, with names like "<>f__AnonymousType0`2" and "<PrivateImplementationDetails>", so they're not unique
                return true;
            }
            return false;
        }

        static T? Try<T>(Type type, Func<Type, T?> get)
        {
            try
            {
                return get(type);
            }
            catch (Exception)
            {
                if (IsStrict(type))
                {
                    throw;
                }
                return default(T);
            }
        }

        static bool IsStrict(Type type) => true;

        static string GetName(AssemblyName assemblyName) => NotNull(assemblyName.Name);

        static string GetName(Type type) => type.ToString();

        static string GetAttribute(CustomAttributeData attribute) => attribute.ToString();

        static string NotNull(string? name)
        {
            if (name == null)
            {
                throw new Exception("Unexpected null Name");
            }
            return name;
        }

        internal string ToJson()
        {
            var json = JsonSerializer.Serialize(this, new JsonSerializerOptions
            {
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });
            return json;
        }
    }
}
