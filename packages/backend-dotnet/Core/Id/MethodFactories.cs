using Core.Id.Factory;
using Core.Id.Methods;
using Core.Output.Ids;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Core.Id.MethodFactories
{
    class LocalFactory : FactoryBase<LocalMethod>
    {
        public override object ToShortName(LocalMethod item) => item.MetadataToken;
        public override LocalMethod FromShortName(object shortName) => new LocalMethod((int)shortName);
        public override bool IsShortName(object shortName) => shortName is int;
        public override bool IsShortNameValid(object shortName) => (int)shortName > 0;
    }

    class RemoteFactory : FactoryBase<RemoteMethod>
    {
        public override object ToShortName(RemoteMethod item) => $"{item.AssemblyName}|{item.MetadataToken}";
        public override RemoteMethod FromShortName(object shortName)
        {
            var parts = ((string)shortName).Split('|');
            return new RemoteMethod(parts[0], int.Parse(parts[1]));
        }
        public override bool IsShortName(object shortName) => shortName is string s && s.Contains("|");
        public override bool IsShortNameValid(object shortName) => ((string)shortName).Split('|').Length == 2;
    }

    class SpecificationFactory : FactoryBase<GenericMethod>
    {
        // implementation of these methods is similar to TypeFactories.SpecificationFactory
        public override object ToShortName(GenericMethod item)
        {
            var result = new List<object> { item.Resolved };
            result.AddRange(item.GenericTypeArguments);
            return result.ToArray();
        }

        public override GenericMethod FromShortName(object shortName)
        {
            var arrayId = (Array)shortName;
            if (arrayId.Length < 2)
            {
                throw new NotSupportedException($"Invalid arrayId: {arrayId}");
            }
            var items = arrayId.Cast<object>().ToArray();
            var resolved = (IBaseMethodId)MethodFactory.FromShortName(items[0]);
            var genericTypeItems = items.Skip(1);
            var genericTypeArguments = genericTypeItems.Select(item => TypeFactory.FromShortName(item)).ToArray();
            return new GenericMethod(resolved, genericTypeArguments);
        }

        public override bool IsShortName(object shortName) => shortName is Array;
        public override bool IsShortNameValid(object shortName) => ((Array)shortName).Length > 1;// && ((Array)shortName).Cast<object>().All(o => o is string || o is ITypeId);
    }
}
