using System;
using System.Collections.Generic;
using System.Linq;

namespace Core.Id.Factory
{
    interface IFactory
    {
        object ToShortName(object item);
        object FromShortName(object shortName);
        bool IsShortName(object shortName);
        bool IsShortNameValid(object shortName);
    }

    interface IFactory<T> : IFactory
    {
        object ToShortName(T value);
        new T FromShortName(object shortName);
    }

    internal abstract class FactoryBase<T> : IFactory<T> where T : notnull
    {
        public Type TargetType => typeof(T);

        public abstract object ToShortName(T value);
        public abstract T FromShortName(object shortName);
        public abstract bool IsShortName(object shortName);
        public abstract bool IsShortNameValid(object shortName);

        object IFactory.ToShortName(object value) => ToShortName((T)value);
        object IFactory.FromShortName(object shortName) => FromShortName(shortName);
    }

    internal class Factory<T> where T : notnull
    {
        internal object ToShortName(T item)
        {
            var type = item.GetType();
            var factory = _factories[type];
            var shortName = factory.ToShortName(item);
            return factory.IsShortName(shortName) && factory.IsShortNameValid(shortName)
                ? shortName
                : throw new NotSupportedException($"Invalid short name: {shortName}");
        }

        internal T FromShortName(object shortName)
        {
            var factory = _factories.Values.Single(f => f.IsShortName(shortName));
            if (!factory.IsShortNameValid(shortName))
            {
                throw new NotSupportedException($"Invalid short name: {shortName}");
            }
            return (T)factory.FromShortName(shortName);
        }

        readonly Dictionary<Type, IFactory> _factories = new Dictionary<Type, IFactory>();

        internal void RegisterFactory<U>(FactoryBase<U> factory) where U : T
        {
            _factories[factory.TargetType] = factory;
        }
    }
}
