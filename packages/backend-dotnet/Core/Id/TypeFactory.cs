using Core.Output.Ids;
using Core.Id.TypeFactories;
using Core.Id.Factory;

namespace Core.Id
{
    internal static class TypeFactory
    {
        private static readonly Factory<ITypeId> _factory = new();

        internal static object ToShortName(ITypeId id) => _factory.ToShortName(id);
        internal static ITypeId FromShortName(object sn) => _factory.FromShortName(sn);

        static TypeFactory()
        {
            _factory.RegisterFactory(new LocalFactory());
            _factory.RegisterFactory(new RemoteFactory());
            _factory.RegisterFactory(new GenericParameterFactory());
            _factory.RegisterFactory(new SpecificationFactory());
            _factory.RegisterFactory(new FunctionFactory());
        }
    }
}
