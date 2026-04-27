import * as DotNet from "../../contracts/dotnet2";
import { getOrThrow } from "../utils";
import type { AssemblyId, MethodDefId, NamespaceId, TypeDefId } from "./bigIds";
import { castAssemblyId, castNamespaceId, packMemberId, packMethodDefId, packTypeDefId } from "./bigIds";
import { parseTypeIds } from "./dotNetId";
import * as GetMemberJson from "./memberJson";
import { Assemblies, Boolean, Members, Namespaces, Tables, TypeNames } from "./schema";

type AllTypeInfo = { typeDefId: TypeDefId; assemblyName: string } & DotNet.TypeInfo;
type AllMethodInfo = { methodDefId: MethodDefId; assemblyName: string } & DotNet.MethodInfo;

const getAssemblies = (all: DotNet.All): Assemblies[] =>
  Object.keys(all.assemblies)
    .map((value) => ({ name: value, isMicrosoft: 0 as Boolean }))
    .concat(Object.keys(all.microsoftAssemblies).map((value) => ({ name: value, isMicrosoft: 1 as Boolean })))
    .map((value, index) => ({ id: castAssemblyId(index + 1), ...value }));

const getAllTypeInfos = (all: DotNet.All, assemblyIds: Map<string, AssemblyId>): AllTypeInfo[] =>
  Object.entries(all.assemblies)
    .concat(Object.entries(all.microsoftAssemblies))
    .flatMap(([assemblyName, assemblyInfo]) =>
      assemblyInfo.typeInfos.map((value) => ({
        assemblyName,
        typeDefId: packTypeDefId(value.id, getOrThrow(assemblyIds, assemblyName)),
        ...value,
      }))
    );

const getAllMethodInfos = (all: DotNet.All, assemblyIds: Map<string, AssemblyId>): AllMethodInfo[] =>
  Object.entries(all.assemblyMethods).flatMap(([assemblyName, tokenMap]) =>
    Object.entries(tokenMap).map(([metadataToken, methodInfo]) => ({
      ...methodInfo,
      methodDefId: packMethodDefId(+metadataToken, getOrThrow(assemblyIds, assemblyName)),
      assemblyName,
    }))
  );

const getNamespaces = (assemblyAndTypeInfos: AllTypeInfo[]): Namespaces[] => {
  const distinctNamespaces = new Set<string>();
  assemblyAndTypeInfos.forEach((value) => {
    if (value.namespace) distinctNamespaces.add(value.namespace);
  });
  return [...distinctNamespaces].sort().map((value, index) => ({ id: castNamespaceId(index + 1), name: value }));
};

const getTypeNames = (
  allTypeInfos: AllTypeInfo[],
  assemblyIds: Map<string, AssemblyId>,
  namespaceIds: Map<string, NamespaceId>
): TypeNames[] =>
  allTypeInfos.map((value) => ({
    id: packTypeDefId(value.id, getOrThrow(assemblyIds, value.assemblyName)),
    namespace: value.namespace ? namespaceIds.get(value.namespace) : undefined,
    name: value.name,
    declaringType: value.declaringType
      ? packTypeDefId(value.id, getOrThrow(assemblyIds, value.assemblyName))
      : undefined,
  }));

const getMembers = (allTypeInfos: AllTypeInfo[], assemblyIds: Map<string, AssemblyId>): Members[] =>
  allTypeInfos.flatMap((value) => {
    const assemblyId = getOrThrow(assemblyIds, value.assemblyName);
    const typeId = packTypeDefId(value.id, assemblyId);

    const getMembers = <T extends GetMemberJson.AnyDotNetMembers>(
      members: T[] | undefined,
      getJson: (value: T) => GetMemberJson.WithoutNameAndMetadataToken<T>
    ): Members[] =>
      members?.map((value) => ({
        name: value.name,
        id: packMemberId(value.metadataToken, assemblyId),
        typeId,
        json: getJson(value),
      })) ?? [];

    const empty: Members[] = [];

    return empty
      .concat(getMembers(value.fieldMembers, GetMemberJson.getFieldMemberJson))
      .concat(getMembers(value.eventMembers, GetMemberJson.getEventMemberJson))
      .concat(getMembers(value.propertyMembers, GetMemberJson.getPropertyMemberJson))
      .concat(getMembers(value.methodMembers, GetMemberJson.getMethodMemberJson));
  });

export const insertAll = (all: DotNet.All, tables: Tables) => {
  // assemblies
  const assemblies = getAssemblies(all);
  tables.assemblies.insertMany(assemblies);
  const assemblyIds = new Map<string, AssemblyId>(assemblies.map((it) => [it.name, it.id]));

  // assemblyName & typeDefId & DotNet.TypeInfo
  const allTypeInfos = getAllTypeInfos(all, assemblyIds);

  // namespaces
  const namespaces = getNamespaces(allTypeInfos);
  tables.namespaces.insertMany(namespaces);
  const namespaceIds = new Map<string, NamespaceId>(namespaces.map((it) => [it.name, it.id]));

  // type names
  tables.typeNames.insertMany(getTypeNames(allTypeInfos, assemblyIds, namespaceIds));

  // member json
  tables.members.insertMany(getMembers(allTypeInfos, assemblyIds));

  // convert DotNet.Id to TypeDefId or TypeRefId -- call toTypeId before getTypeReferences
  const { toGenericParams, getToTypeId, getTypeReferences, toSignatureTypes } = parseTypeIds(assemblyIds);

  // generic type parameters and subtypes
  for (const value of allTypeInfos) {
    // generic type parameters
    const genericParameters = toGenericParams(value.typeDefId, value.assemblyName, value.genericParameters ?? []);
    // subtypes
    const subTypes = [...(value.baseType ? [value.baseType] : []), ...(value.interfaces ?? [])];
    const toTypeId = getToTypeId(value.assemblyName, genericParameters);
    subTypes.forEach((subType) => toTypeId(subType));
  }

  // method names
  const methodNames = allTypeInfos.flatMap((allTypeInfo) =>
    (allTypeInfo.methodMembers ?? []).map((value) => {
      const assemblyName = allTypeInfo.assemblyName;
      const methodDefId = packMethodDefId(value.metadataToken, getOrThrow(assemblyIds, assemblyName));
      // generic type parameters
      const genericParameters = toGenericParams(
        methodDefId,
        assemblyName,
        value.genericParameters ?? [],
        allTypeInfo.typeDefId
      );
      const toTypeId = getToTypeId(assemblyName, genericParameters);
      // method parameters
      if (value.parameters)
        toSignatureTypes(
          methodDefId,
          value.parameters.map((value) => value.type),
          toTypeId
        );
      //method name
      return { id: methodDefId, name: value.name, returnType: toTypeId(value.returnType) };
    })
  );
  tables.methodNames.insertMany(methodNames);

  // method info
  const allMethodInfos = getAllMethodInfos(all, assemblyIds);
  tables.decompiled.insertMany(allMethodInfos.map((value) => ({ id: value.methodDefId, asText: value.asText })));

  //allMethodInfos.flatMap(value=>([...(value.called??[]),...(value.argued??[])])).map(value=>)

  // typeReferences, signatureTypes, genericParams
  const { typeReferences, signatureTypes, genericParams } = getTypeReferences();
  tables.typeReferences.insertMany(typeReferences);
  tables.signatureTypes.insertMany(signatureTypes);
  tables.genericParams.insertMany(genericParams);
};
