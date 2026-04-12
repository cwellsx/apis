using System;
using System.Collections.Generic;
using System.Linq;
using Core.Output.Ids;
using Core.Id.TypeFactories;

namespace Core.Id
{
    internal static class Factory
    {
        internal static object ToShortName(ITypeId item)
        {
            var type = item.GetType();
            var factory = _factories[type];
            var shortName = factory.ToShortName(item);
            return factory.IsShortName(shortName) && factory.IsShortNameValid(shortName)
                ? shortName
                : throw new NotSupportedException($"Invalid short name: {shortName}");
        }

        internal static ITypeId FromShortName(object shortName)
        {
            var factory = _factories.Values.Single(f => f.IsShortName(shortName));
            if (!factory.IsShortNameValid(shortName))
            {
                throw new NotSupportedException($"Invalid short name: {shortName}");
            }
            return factory.FromShortName(shortName);
        }

        static readonly Dictionary<Type, IFactory> _factories = new Dictionary<Type, IFactory>();

        static Factory()
        {
            RegisterFactory(new LocalFactory());
            RegisterFactory(new RemoteFactory());
            RegisterFactory(new GenericParameterFactory());
            RegisterFactory(new SpecificationFactory());
            RegisterFactory(new FunctionFactory());
        }

        static void RegisterFactory<T>(FactoryBase<T> factory) where T : ITypeId
        {
            _factories[factory.TargetType] = factory;
        }

        interface IFactory
        {
            object ToShortName(ITypeId item);
            ITypeId FromShortName(object shortName);
            bool IsShortName(object shortName);
            bool IsShortNameValid(object shortName);
        }

        interface IFactory<T> : IFactory where T : ITypeId
        {
            object ToShortName(T value);
            new T FromShortName(object shortName);
        }

        internal abstract class FactoryBase<T> : IFactory<T> where T : ITypeId
        {
            public Type TargetType => typeof(T);

            public abstract object ToShortName(T value);
            public abstract T FromShortName(object shortName);
            public abstract bool IsShortName(object shortName);
            public abstract bool IsShortNameValid(object shortName);

            object IFactory.ToShortName(ITypeId value) => ToShortName((T)value);
            ITypeId IFactory.FromShortName(object shortName) => FromShortName(shortName);
        }
    }
}
