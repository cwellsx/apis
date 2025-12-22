namespace Core
{
    internal interface IFilter
    {
        bool IsMicrosoftAssemblyName(string assemblyName);
        bool IsMicrosoftAssemblyPath(string assemblyName);
    }
}
