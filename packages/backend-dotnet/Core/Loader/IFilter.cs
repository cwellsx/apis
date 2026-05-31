namespace Core.Loader
{
    internal interface IFilter
    {
        bool IsMicrosoftAssemblyName(string assemblyName);
        bool IsMicrosoftAssemblyPath(string assemblyName);
    }
}
