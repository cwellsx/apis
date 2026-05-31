using Core.Id.Factory;
using Core.Id.Methods;
using System;

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
            return new int[] { item.MetadataToken };
        }

        public override GenericMethod FromShortName(object shortName)
        {
            var arrayId = (Array)shortName;
            Assert(arrayId.Length == 1);
            var element = arrayId.GetValue(0);
            Assert(element is int);
            return new GenericMethod((int)element);
        }

        public override bool IsShortName(object shortName) => shortName is Array;
        public override bool IsShortNameValid(object shortName) => ((Array)shortName).Length == 1;
    }
}
