namespace Core.FullNames
{
    internal interface INames
    {
        string GetTypeName(object shortId, string inAssemblyName);
        string GetMethodName(object shortId, string inAssemblyName);
    }
}
