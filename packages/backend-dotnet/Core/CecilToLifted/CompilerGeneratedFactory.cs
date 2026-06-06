using Core.Cecil;
using Mono.Cecil;

namespace Core.CecilToLifted
{
    internal static class CompilerGeneratedFactory
    {
        internal static CompilerGenerated Create(AssemblyData assemblyData)
        {
            // can use this to debug-trace a compiler method that's escaping into the Output
            var watch = ("X Newtonsoft.Json", 33554802);
            var logFound = (MetadataToken token, string message) =>
            {
                if (watch.Item1 == assemblyData.Name && token.ToInt32() == watch.Item2)
                {
                    Logger.Log($"Found -- {message}");
                }
            };

            var ownedMethods = OwnedMethods.FromAssemblyData(assemblyData);
            var ownedMethodMaps = OwnedMethodMaps.FromOwnedMethods(ownedMethods, logFound);
            return OwnedResolver.FromOwned(assemblyData.Name, ownedMethods, ownedMethodMaps, logFound);
        }
    }
}
