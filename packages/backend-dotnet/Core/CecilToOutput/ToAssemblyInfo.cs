using Core.Cecil;
using Core.Output;
using System.Linq;

namespace Core.CecilToOutput
{
    internal static class ToAssemblyInfo
    {
        internal static AssemblyInfo Transform(AssemblyData assemblyData, CompilerGenerated compilerGenerated)
        {
            var toTypeInfo = ToTypeInfo.IsUserDefined(assemblyData.Name, compilerGenerated);

            var typeInfos = assemblyData
                .GetTypeDefinitions(compilerGenerated.IsUserDefined)
                .Select(typeDefinition => toTypeInfo.Transform(typeDefinition))
                .ToArray();

            return new AssemblyInfo(
                ReferencedAssemblies: assemblyData.AssemblyReferences.Select(assemblyReference => assemblyReference.Name).ToArray(),
                TypeInfos: typeInfos
                );
        }
    }
}
