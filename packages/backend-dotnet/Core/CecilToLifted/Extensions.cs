using Mono.Cecil;

namespace Core.CecilToLifted
{
    internal static class Extensions
    {
        internal static string AssemblyName(this TypeDefinition typeDefinition) => typeDefinition.Module.Assembly.Name.Name;
    }
}
