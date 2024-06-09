using System.Collections.Generic;
using System.Linq;
using Core.Output.Internal;
using TypeKind = Core.Output.Public.TypeKind;

// https://learn.microsoft.com/en-us/dotnet/standard/generics/
// > When you create an instance of a generic class, you specify the actual types to substitute for the type parameters.
// > This establishes a new generic class, referred to as a constructed generic class, with your chosen types substituted everywhere that the type parameters appear.

namespace Core.Extensions
{
    static class GenericTypeExtensions
    {
        #region Substitute

        internal static MethodMemberEx Substitute(this MethodMemberEx self, Dictionary<string, TypeIdEx> substitutions)
        {
            return self with
            {
                Parameters = self.Parameters?.Select(parameter => parameter.Substitute(substitutions)).ToArray(),
                ReturnType = self.ReturnType.Substitute(substitutions)
            };
        }

        static  ParameterEx Substitute(this ParameterEx self, Dictionary<string, TypeIdEx> substitutions)
        {
            return self with
            {
                Type = self.Type.Substitute(substitutions)
            };
        }

        static TypeIdEx Substitute(this TypeIdEx self, Dictionary<string, TypeIdEx> substitutions)
        {
            if (substitutions.TryGetValue(self.Name, out var substituted))
            {
                return substituted;
            }

            var elementType = self.ElementType?.Substitute(substitutions);
            var isElementTypeChanged = elementType != self.ElementType;
            return self with
            {
                DeclaringType = self.DeclaringType?.Substitute(substitutions),
                ElementType = elementType,
                Name = elementType == null ? self.Name : elementType.Name + self.Kind.NameSuffix(),
                GenericTypeArguments = self.GenericTypeArguments?.Select(typeId => typeId.Substitute(substitutions)).ToArray(),
                Namespace = isElementTypeChanged ? elementType!.Namespace : self.Namespace,
                AssemblyName = isElementTypeChanged ? elementType!.AssemblyName : self.AssemblyName
            };
        }

        #endregion
        #region WithoutArguments

        internal static TypeIdEx WithoutArguments(this TypeIdEx self) => self with
        {
            GenericTypeArguments = null,
            Kind = self.Kind == TypeKind.GenericParameter ? null : self.Kind,
            DeclaringType = self.DeclaringType?.WithoutArguments()
        };

        #endregion
        #region WithoutGenericParameters

        internal static TypeIdEx WithoutGenericParameters(this TypeIdEx self, bool isDeclaringType = false)
        {
            bool isGenericParameters = self.GenericTypeArguments?.All(typeId => typeId.Kind == TypeKind.GenericParameter) ?? false;
            return self with
            {
                DeclaringType = self.DeclaringType?.WithoutGenericParameters(true),
                ElementType = self.ElementType?.WithoutGenericParameters(),
                GenericTypeArguments = isDeclaringType && isGenericParameters ? null : self.GenericTypeArguments
            };
        }


        static ParameterEx WithoutGenericParameters(this ParameterEx self)
        {
            return self with
            {
                Type = self.Type.WithoutGenericParameters()
            };
        }


        internal static MethodMemberEx WithoutGenericParameters(this MethodMemberEx self)
        {
            return self with
            {
                Parameters = self.Parameters?.Select(parameter => parameter.WithoutGenericParameters()).ToArray(),
                ReturnType = self.ReturnType.WithoutGenericParameters()
            };
        }

        #endregion
    }
}
