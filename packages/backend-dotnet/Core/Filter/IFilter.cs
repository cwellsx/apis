namespace Core.Filter
{
    internal interface IFilter
    {
        bool IsMicrosoftAssemblyName(string assemblyName);
        bool IsMicrosoftAssemblyPath(string assemblyName);
    }
}
