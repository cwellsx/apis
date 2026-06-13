using System;
using Core.Id.Types;
using Core.Id.Factory;

namespace Core.Id.TypeFactories
{
    class LocalFactory : FactoryBase<LocalType>
    {
        public override object ToShortName(LocalType item) => item.MetadataToken;
        public override LocalType FromShortName(object shortName) => new LocalType((int)shortName);
        public override bool IsShortName(object shortName) => shortName is int;
        public override bool IsShortNameValid(object shortName) => (int)shortName > 0;
    }

    class RemoteFactory : FactoryBase<RemoteType>
    {
        public override object ToShortName(RemoteType item) => $"{item.AssemblyName}|{item.MetadataToken}";
        public override RemoteType FromShortName(object shortName)
        {
            var parts = ((string)shortName).Split('|');
            return new RemoteType(parts[0], int.Parse(parts[1]));
        }
        public override bool IsShortName(object shortName) => shortName is string s && s.Contains("|");
        public override bool IsShortNameValid(object shortName) => ((string)shortName).Split('|').Length == 2;
    }

    class GenericParameterFactory : FactoryBase<GenericParameter>
    {
        public override object ToShortName(GenericParameter item) => $"{item.ParameterName}~{item.MetadataToken}";
        public override GenericParameter FromShortName(object shortName)
        {
            var parts = ((string)shortName).Split('~');
            return new GenericParameter(parts[0], int.Parse(parts[1]));
        }
        public override bool IsShortName(object shortName) => shortName is string s && s.Contains("~");
        public override bool IsShortNameValid(object shortName) => ((string)shortName).Split('~').Length == 2;
    }

    class SpecificationFactory : FactoryBase<SpecificationType>
    {
        public override object ToShortName(SpecificationType item)
        {
            return new int[] { item.MetadataToken };
        }

        public override SpecificationType FromShortName(object shortName)
        {
            var arrayId = (Array)shortName;
            Assert(arrayId.Length == 1);
            var element = arrayId.GetValue(0);
            Assert(element is int);
            return new SpecificationType((int)element);
        }

        public override bool IsShortName(object shortName) => shortName is Array;
        public override bool IsShortNameValid(object shortName) => ((Array)shortName).Length == 1;
    }

    class FunctionFactory : FactoryBase<FunctionType>
    {
        public override object ToShortName(FunctionType item) => $"*{item.FunctionName}";
        public override FunctionType FromShortName(object shortName) => new FunctionType(((string)shortName).Substring(1));
        public override bool IsShortName(object shortName) => shortName is string s && s[0] == '*';
        public override bool IsShortNameValid(object shortName) => true;
    }
}
