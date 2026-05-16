import * as DotNet from "../../contracts/dotnet2";
import { getOrThrow } from "../utils";
import type { IdCreate } from "./idCreate";
import { createIds } from "./idCreate";
import type { AssemblyId, MethodDefId, NamespaceId, TypeDefId } from "./idTypes";
import { parseTypeIds } from "./insertDotNetId";
import { fullNames } from "./insertFullNames";
import { getGroupNames } from "./insertGroups";
import * as GetMemberJson from "./insertMemberJson";
import { Assembly, Boolean, Member, Namespace, Tables, TypeName } from "./schema";
import * as MemberJson from "./schemaMemberJson";

type AllTypeInfo = { typeDefId: TypeDefId; assemblyName: string } & DotNet.TypeInfo;
type AllMethodMember = { typeDefId: TypeDefId; methodDefId: MethodDefId; assemblyName: string } & DotNet.MethodMember;
type AllMethodInfo = { methodDefId: MethodDefId; assemblyName: string } & DotNet.MethodInfo;

type MapAssemblyIds = Map<string, AssemblyId>;

const getAssemblies = (all: DotNet.All, idCreate: IdCreate): Assembly[] =>
  Object.keys(all.assemblies)
    .map((value) => ({ name: value, isMicrosoft: 0 as Boolean }))
    .concat(Object.keys(all.microsoftAssemblies).map((value) => ({ name: value, isMicrosoft: 1 as Boolean })))
    .map((value, index) => ({ id: idCreate.makeAssemblyId(index + 1), ...value }));

const getAllTypeInfos = (all: DotNet.All, assemblyIds: MapAssemblyIds, idCreate: IdCreate): AllTypeInfo[] =>
  Object.entries(all.assemblies)
    .concat(Object.entries(all.microsoftAssemblies))
    .flatMap(([assemblyName, assemblyInfo]) =>
      assemblyInfo.typeInfos.map((value) => ({
        assemblyName,
        typeDefId: idCreate.makeTypeDefId(value.id, getOrThrow(assemblyIds, assemblyName), true),
        ...value,
      }))
    );

const getAllMethodMembers = (
  allTypeInfos: AllTypeInfo[],
  assemblyIds: MapAssemblyIds,
  idCreate: IdCreate
): AllMethodMember[] =>
  allTypeInfos.flatMap((allTypeInfo) =>
    (allTypeInfo.methodMembers ?? []).map((value) => {
      const assemblyName = allTypeInfo.assemblyName;
      const typeDefId = allTypeInfo.typeDefId;
      const methodDefId = idCreate.makeMethodDefId(value.metadataToken, getOrThrow(assemblyIds, assemblyName), true);
      return { typeDefId, methodDefId, assemblyName, ...value };
    })
  );

const getAllMethodInfos = (all: DotNet.All, assemblyIds: MapAssemblyIds, idCreate: IdCreate): AllMethodInfo[] =>
  Object.entries(all.assemblyMethods).flatMap(([assemblyName, tokenMap]) =>
    Object.entries(tokenMap).map(([metadataToken, methodInfo]) => ({
      ...methodInfo,
      methodDefId: idCreate.makeMethodDefId(+metadataToken, getOrThrow(assemblyIds, assemblyName), false),
      assemblyName,
    }))
  );

const getNamespaces = (assemblyAndTypeInfos: AllTypeInfo[], idCreate: IdCreate): Namespace[] => {
  const distinctNamespaces = new Set<string>();
  assemblyAndTypeInfos.forEach((value) => {
    if (value.namespace) distinctNamespaces.add(value.namespace);
  });
  return [...distinctNamespaces]
    .sort()
    .map((value, index) => ({ id: idCreate.makeNamespaceId(index + 1), name: value }));
};

const getTypeNames = (
  allTypeInfos: AllTypeInfo[],
  assemblyIds: MapAssemblyIds,
  namespaceIds: Map<string, NamespaceId>,
  idCreate: IdCreate
): TypeName[] =>
  allTypeInfos.map((value) => ({
    id: value.typeDefId,
    namespaceId: value.namespace ? namespaceIds.get(value.namespace) : undefined,
    name: value.name,
    declaringTypeId: value.declaringType
      ? idCreate.makeTypeDefId(value.declaringType, getOrThrow(assemblyIds, value.assemblyName), false)
      : undefined,
  }));

const getMembers = (allTypeInfos: AllTypeInfo[], assemblyIds: MapAssemblyIds, idCreate: IdCreate): Member[] =>
  allTypeInfos.flatMap((value) => {
    const assemblyId = getOrThrow(assemblyIds, value.assemblyName);
    const typeId = value.typeDefId;

    const getMembers = <T extends MemberJson.AnyDotNetMembers>(
      members: T[] | undefined,
      getJson: (value: T) => MemberJson.WithoutNameAndMetadataToken<T>
    ): Member[] =>
      members?.map((value) => ({
        name: value.name,
        id: idCreate.makeMemberId(value.metadataToken, assemblyId),
        typeId,
        json: getJson(value),
      })) ?? [];

    const empty: Member[] = [];

    return empty
      .concat(getMembers(value.fieldMembers, GetMemberJson.getFieldMemberJson))
      .concat(getMembers(value.eventMembers, GetMemberJson.getEventMemberJson))
      .concat(getMembers(value.propertyMembers, GetMemberJson.getPropertyMemberJson))
      .concat(getMembers(value.methodMembers, GetMemberJson.getMethodMemberJson));
  });

export const insertAll = (all: DotNet.All, tables: Tables) => {
  const idCreate = createIds();

  // assemblies
  const assemblies = getAssemblies(all, idCreate);
  tables.assemblies.insertMany(assemblies);
  const assemblyIds = new Map<string, AssemblyId>(assemblies.map((it) => [it.name, it.id]));

  // assemblyName & typeDefId & DotNet.TypeInfo
  const allTypeInfos = getAllTypeInfos(all, assemblyIds, idCreate);

  // namespaces
  const namespaces = getNamespaces(allTypeInfos, idCreate);
  tables.namespaces.insertMany(namespaces);
  const namespaceIds = new Map<string, NamespaceId>(namespaces.map((it) => [it.name, it.id]));

  // type names
  const typeNames = getTypeNames(allTypeInfos, assemblyIds, namespaceIds, idCreate);
  tables.typeNames.insertMany(typeNames);

  // member json
  tables.members.insertMany(getMembers(allTypeInfos, assemblyIds, idCreate));

  // convert DotNet.Id to TypeDefId or TypeRefId -- call toTypeId before getTypeReferences
  const { toGenericParams, getToTypeId, getTypeReferences, toSignatureTypes, toMethodId } = parseTypeIds(assemblyIds);

  // generic type parameters and subtypes
  for (const value of allTypeInfos) {
    // generic type parameters
    const genericParameters = toGenericParams(
      value.typeDefId,
      value.assemblyName,
      value.genericParameters ?? [],
      idCreate
    );
    // subtypes
    const subTypes = [...(value.baseType ? [value.baseType] : []), ...(value.interfaces ?? [])];
    const toTypeId = getToTypeId(value.assemblyName, genericParameters, idCreate);
    subTypes.forEach((subType) => toTypeId(subType));
  }

  // method names
  const allMethodMembers = getAllMethodMembers(allTypeInfos, assemblyIds, idCreate);
  const methodNames = allMethodMembers.map((value) => {
    const assemblyName = value.assemblyName;
    const typeDefId = value.typeDefId;
    const methodDefId = value.methodDefId;
    // generic type parameters
    const genericParameters = toGenericParams(
      methodDefId,
      assemblyName,
      value.genericParameters ?? [],
      idCreate,
      typeDefId
    );
    const toTypeId = getToTypeId(assemblyName, genericParameters, idCreate);
    // method parameters
    if (value.parameters)
      toSignatureTypes(
        methodDefId,
        value.parameters.map((value) => value.type),
        toTypeId
      );
    //method name
    return { id: methodDefId, typeId: typeDefId, name: value.name, returnTypeId: toTypeId(value.returnType) };
  });
  tables.methodNames.insertMany(methodNames);

  // method info
  const allMethodInfos = getAllMethodInfos(all, assemblyIds, idCreate);
  // decompiled
  tables.decompiled.insertMany(allMethodInfos.map((value) => ({ id: value.methodDefId, asText: value.asText })));

  // calls
  const calls = allMethodInfos.flatMap((value) => {
    const fromId = value.methodDefId;
    // .NET guarantees that these IDs are unique
    const toIds = [...(value.called ?? []), ...(value.argued ?? [])];
    return toIds.map((id) => ({ fromId, toId: toMethodId(id, value.assemblyName, fromId, idCreate) }));
  });

  tables.calls.insertMany(calls);

  // typeReferences, signatureTypes, genericParams
  const { typeReferences, signatureTypes, genericParams, methodReferences } = getTypeReferences();

  const allFullNames = fullNames({
    assemblies,
    namespaces,
    genericParams,
    signatureTypes,
    typeNames,
    typeReferences,
    methodNames,
    methodReferences,
  });

  tables.typeReferences.insertMany(typeReferences);
  tables.signatureTypes.insertMany(signatureTypes);
  tables.genericParams.insertMany(genericParams);
  tables.methodReferences.insertMany(methodReferences);

  tables.fullNames.insertMany(allFullNames);

  const assemblyGroups = getGroupNames(assemblies.map((value) => value.name)).map((value) => ({
    id: idCreate.newAssemblyGroupId(),
    name: value,
  }));
  tables.assemblyGroups.insertMany(assemblyGroups);

  const namespaceGroups = getGroupNames(namespaces.map((value) => value.name)).map((value) => ({
    id: idCreate.newNamespaceGroupId(),
    name: value,
  }));
  tables.namespaceGroups.insertMany(namespaceGroups);

  tables.views.insertAuto({ viewType: "assemblies" });
  tables.views.insertAuto({ viewType: "namespaces" });
};
