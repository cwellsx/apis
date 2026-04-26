import * as DotNet from "../../contracts/dotnet2";
import { assert, getOrThrow } from "../utils";
import type { AssemblyId, NamespaceId, TypeDefId } from "./bigIds";
import { castAssemblyId, castNamespaceId, packMemberId, packTypeDefId } from "./bigIds";
import { parseTypeIds } from "./dotNetId";
import * as GetMemberJson from "./memberJson";
import { Assemblies, Boolean, Members, Namespaces, Tables, TypeNames } from "./schema";

type AllTypeInfo = { typeDefId: TypeDefId; assemblyName: string } & DotNet.TypeInfo;

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

  assert(assemblies.length != 0);
  assert(assemblyIds.size != 0);

  // assemblyAndTypeInfos
  const allTypeInfos = getAllTypeInfos(all, assemblyIds);

  // convert DotNet.Id to TypeDefId or TypeRefId -- call toTypeId before getTypeReferences
  const { toGenericParams, toTypeId, getTypeReferences } = parseTypeIds(assemblyIds);
  for (const value of allTypeInfos) {
    const genericTypeParameters = toGenericParams(
      value.typeDefId,
      value.assemblyName,
      value.genericTypeParameters ?? []
    );
    const subTypes = [...(value.baseType ? [value.baseType] : []), ...(value.interfaces ?? [])];
    subTypes.forEach((subType) => toTypeId(subType, value.assemblyName, genericTypeParameters));
  }

  // typeReferences and typeArguments
  const { typeReferences, typeArguments, genericParams } = getTypeReferences();
  tables.typeReferences.insertMany(typeReferences);
  tables.typeArguments.insertMany(typeArguments);
  tables.genericParams.insertMany(genericParams);

  // namespaces
  const namespaces = getNamespaces(allTypeInfos);
  tables.namespaces.insertMany(namespaces);
  const namespaceIds = new Map<string, NamespaceId>(namespaces.map((it) => [it.name, it.id]));

  tables.typeNames.insertMany(getTypeNames(allTypeInfos, assemblyIds, namespaceIds));

  tables.members.insertMany(getMembers(allTypeInfos, assemblyIds));
};
