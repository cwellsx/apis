using System.Collections.Generic;
using System.Linq;
using Core.Output.Internal;
using TypeKind = Core.Output.Public.TypeKind;

// https://learn.microsoft.com/en-us/dotnet/standard/generics/
// > When you create an instance of a generic class, you specify the actual types to substitute for the type parameters.
// > This establishes a new generic class, referred to as a constructed generic class, with your chosen types substituted everywhere that the type parameters appear.

namespace Core.Extensions
{
    using AssemblyDecompiled = Dictionary<TypeIdEx, TypeDecompiled>;

    static class GenericTypeExtensions
    {
        #region Substitute

        internal static MethodMemberEx Substitute(
            this MethodMemberEx self,
            Dictionary<string, TypeIdEx> substitutions,
            Dictionary<string, AssemblyDecompiled> assembliesTypesDictionary
            )
        {
            var substituter = new Substituter(substitutions, assembliesTypesDictionary);
            return substituter.Substitute(self);
        }

        private class Substituter
        {
            Dictionary<string, TypeIdEx> _substitutions;
            Dictionary<string, AssemblyDecompiled> _assembliesTypesDictionary;

            internal Substituter(
                Dictionary<string, TypeIdEx> substitutions,
                Dictionary<string, AssemblyDecompiled> assembliesTypesDictionary
                )
            {
                _substitutions = substitutions;
                _assembliesTypesDictionary = assembliesTypesDictionary;
            }

            internal MethodMemberEx Substitute(MethodMemberEx self)
            {
                return self with
                {
                    Parameters = self.Parameters?.Select(Substitute).ToArray(),
                    ReturnType = Substitute(self.ReturnType)
                };
            }

            ParameterEx Substitute(ParameterEx self)
            {
                return self with
                {
                    Type = Substitute(self.Type)
                };
            }

            TypeIdEx Substitute(TypeIdEx self, string[]? genericTypeParameters = null)
            {
                if (_substitutions.TryGetValue(self.Name, out var substituted))
                {
                    var declaringType = self.DeclaringType;
                    return substituted;
                }

                var elementType = self.ElementType == null ? null : Substitute(self.ElementType);
                var isElementTypeChanged = elementType != self.ElementType;
                var genericTypeArguments = self.GenericTypeArguments?.Select(typeId => Substitute(typeId)).ToArray()
                    ?? genericTypeParameters?.Select(name => _substitutions[name]).ToArray();

                return self with
                {
                    DeclaringType = self.DeclaringType == null
                    ? null
                    : Substitute(self.DeclaringType, getGenericTypeParameters(self.DeclaringType)),
                    ElementType = elementType,
                    Name = elementType == null ? self.Name : elementType.Name + self.Kind.NameSuffix(),
                    GenericTypeArguments = genericTypeArguments,
                    Namespace = isElementTypeChanged ? elementType!.Namespace : self.Namespace,
                    AssemblyName = isElementTypeChanged ? elementType!.AssemblyName : self.AssemblyName
                };
            }

            // I think this is necessary because Core.IL says there are type arguments associated with the DeclaringType
            // whereas System.Reflection doesn't specify that there are type parameters associated with the DeclaringType
            string[]? getGenericTypeParameters(TypeIdEx declaringType)
            {
                // this is copy-and-modified from a code fragment in MethodFinder.Find
                // except this returns null instead of returning an Error
                if (declaringType.AssemblyName == null)
                {
                    return null;
                }
                if (!_assembliesTypesDictionary.TryGetValue(declaringType.AssemblyName, out var typesDictionary))
                {
                    return null;
                }
                if (!typesDictionary.TryGetValue(declaringType.WithoutArguments(), out var typeMethods))
                {
                    return null;
                }
                var genericTypeParameters = typeMethods.GenericTypeParameters;
                return genericTypeParameters?.Select(typeId => typeId.Name).ToArray();
            }
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

        internal static MethodMemberEx WithoutGenericParameters(this MethodMemberEx self)
        {
            return self with
            {
                Parameters = self.Parameters?.Select(parameter => parameter.WithoutGenericParameters()).ToArray(),
                ReturnType = self.ReturnType.WithoutGenericParameters()
            };
        }

        static TypeIdEx WithoutGenericParameters(this TypeIdEx self, bool isDeclaringType = false)
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

        #endregion
    }
}
