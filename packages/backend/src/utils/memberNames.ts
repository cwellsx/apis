import type { MethodMember, NamedTypeInfo, Parameter, PropertyMember, TypeId } from "../contracts-dotnet";

const getTypeName = (name: string, generic?: TypeId[]): string => {
  if (!generic) return name;
  const index = name.indexOf("`");
  return (index === -1 ? name : name.substring(0, index)) + `<${generic.map((it) => it.name).join(",")}>`;
};

export const getTypeIdName = (typeId: TypeId): string => getTypeName(typeId.name, typeId.genericTypeArguments);

const getGenericName = (name: string, genericArguments: TypeId[] | undefined): string =>
  !genericArguments ? name : `${name}<${genericArguments.map(getTypeIdName).join(", ")}>`;

export const getMethodName = (methodMember: MethodMember): string => {
  const getName = (name: string, parameters: Parameter[] | undefined): string =>
    !parameters ? name : `${name}(${parameters.map((parameter) => getTypeIdName(parameter.type)).join(", ")})`;
  return getName(getGenericName(methodMember.name, methodMember.genericArguments), methodMember.parameters);
};

export const getPropertyName = (propertyMember: PropertyMember): string => {
  const getName = (name: string, parameters: Parameter[] | undefined): string =>
    !parameters ? name : `${name}[${parameters.map((parameter) => getTypeIdName(parameter.type)).join(", ")}]`;
  return getName(propertyMember.name, propertyMember.parameters);
};

export const getTypeInfoName = (typeInfo: NamedTypeInfo): string =>
  getTypeName(typeInfo.typeId.name, typeInfo.genericTypeParameters ?? typeInfo.typeId.genericTypeArguments);
