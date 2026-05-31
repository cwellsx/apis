using Core.Output;

namespace Core.CecilToOutput
{
    internal record TokenMaps(TokenMap<TypeSpecData> TypeSpecs, TokenMap<MethodSpecData> MethodSpecs)
    {
        static internal TokenMaps CreateNew() => new TokenMaps(new TokenMap<TypeSpecData>(), new TokenMap<MethodSpecData>());
    }
}
