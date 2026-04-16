using Core.Id.Factory;
using Core.Id.MethodFactories;
using Core.Output.Ids;

namespace Core.Id
{
    internal static class MethodFactory
    {
        private static readonly Factory<IMethodId> _factory = new();

        internal static object ToShortName(IMethodId id) => _factory.ToShortName(id);
        internal static IMethodId FromShortName(object sn) => _factory.FromShortName(sn);

        static MethodFactory()
        {
            _factory.RegisterFactory(new LocalFactory());
            _factory.RegisterFactory(new RemoteFactory());
            _factory.RegisterFactory(new SpecificationFactory());
        }
    }
}
