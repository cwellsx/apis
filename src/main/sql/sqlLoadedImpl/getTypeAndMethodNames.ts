import { MethodNodeId, TypeNodeId } from "../../../shared-types";
import { getMapped, mapOfMaps } from "../../shared-types";
import type { GetTypeOrMethodName } from "../sqlLoadedApiTypes";
import { DeclaringTypeColumns, MethodNameColumns, TypeNameColumns } from "./columns";
import { Tables } from "./tables";

export const getTypeAndMethodNames = (table: Tables): GetTypeOrMethodName => {
  const typeNames: TypeNameColumns[] = table.typeName.selectAll();
  const methodNames: MethodNameColumns[] = table.methodName.selectAll();
  const declaringTypes: DeclaringTypeColumns[] = table.declaringType.selectAll();

  const assemblyTypeNames = mapOfMaps(
    typeNames.map((typeName) => [typeName.assemblyName, typeName.metadataToken, typeName.decoratedName])
  );
  const assemblyTypeNamespaces = mapOfMaps(
    typeNames.map((typeName) => [typeName.assemblyName, typeName.metadataToken, typeName.namespace])
  );
  const assemblyMethodNames = mapOfMaps(
    methodNames.map((methodName) => [methodName.assemblyName, methodName.metadataToken, methodName.name])
  );
  const assemblyDeclaringTypes = mapOfMaps(
    declaringTypes.map((columns) => [columns.assemblyName, columns.nestedType, columns.declaringType])
  );

  const getTypename = (assemblyName: string, metadataToken: number) =>
    getMapped(assemblyTypeNames, assemblyName, metadataToken);
  const getDeclaringType = (assemblyName: string, nestedType: number) =>
    assemblyDeclaringTypes.get(assemblyName)?.get(nestedType);

  const getTypeName = (typeNodeId: TypeNodeId): string => {
    const assemblyName = typeNodeId.assemblyName;
    let name = getTypename(assemblyName, typeNodeId.metadataToken);
    let declaringType = getDeclaringType(assemblyName, typeNodeId.metadataToken);
    while (declaringType) {
      name = `${getTypename(assemblyName, declaringType)}+${name}`;
      declaringType = getDeclaringType(assemblyName, declaringType);
    }
    return name;
  };

  const getMethodName = (methodNodeId: MethodNodeId): string =>
    getMapped(assemblyMethodNames, methodNodeId.assemblyName, methodNodeId.metadataToken);

  const getTypeNamespace = (typeNodeId: TypeNodeId): string | null =>
    getMapped(assemblyTypeNamespaces, typeNodeId.assemblyName, typeNodeId.metadataToken);

  return { getTypeName, getMethodName, getTypeNamespace };
};
