using System.Collections.Generic;

namespace Core.FullNames
{
    internal interface INames
    {
        string GetTypeName(object shortId, string inAssemblyName);
        (string, Dictionary<string, string>?) GetMethodName(object shortId, string inAssemblyName);
    }
}
