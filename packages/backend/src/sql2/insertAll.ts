import * as DotNet from "../../contracts/dotnet2";
import { assert, getOrThrow } from "../utils";
import type { AssemblyId, NamespaceId } from "./bigIds";
import { castAssemblyId, castNamespaceId, packMemberId, packTypeDefId } from "./bigIds";
import {
  AnyDotNetMembers,
  Assemblies,
  Boolean,
  Members,
  Namespaces,
  Tables,
  TypeInfos,
  WithoutNameAndMetadataToken,
} from "./schema";

type AssemblyAndTypeInfo = { assemblyName: string } & DotNet.TypeInfo;

const getAssemblies = (all: DotNet.All): Assemblies[] =>
  Object.keys(all.assemblies)
    .map((value) => ({ name: value, isMicrosoft: 0 as Boolean }))
    .concat(Object.keys(all.microsoftAssemblies).map((value) => ({ name: value, isMicrosoft: 1 as Boolean })))
    .map((value, index) => ({ id: castAssemblyId(index + 1), ...value }));

const getAssemblyAndTypeInfos = (all: DotNet.All): AssemblyAndTypeInfo[] =>
  Object.entries(all.assemblies)
    .concat(Object.entries(all.microsoftAssemblies))
    .flatMap((entry) => entry[1].typeInfos.map((typeInfo) => ({ assemblyName: entry[0], ...typeInfo })));

const getNamespaces = (assemblyAndTypeInfos: AssemblyAndTypeInfo[]): Namespaces[] => {
  const distinctNamespaces = new Set<string>();
  assemblyAndTypeInfos.forEach((value) => {
    if (value.namespace) distinctNamespaces.add(value.namespace);
  });
  return [...distinctNamespaces].sort().map((value, index) => ({ id: castNamespaceId(index + 1), name: value }));
};

const getTypeInfos = (
  assemblyAndTypeInfos: AssemblyAndTypeInfo[],
  assemblyIds: Map<string, AssemblyId>,
  namespaceIds: Map<string, NamespaceId>
): TypeInfos[] =>
  assemblyAndTypeInfos.map((value) => ({
    id: packTypeDefId(value.id, getOrThrow(assemblyIds, value.assemblyName)),
    namespace: value.namespace ? namespaceIds.get(value.namespace) : undefined,
    name: value.name,
    declaringType: value.declaringType
      ? packTypeDefId(value.id, getOrThrow(assemblyIds, value.assemblyName))
      : undefined,
  }));

const getMembers = (assemblyAndTypeInfos: AssemblyAndTypeInfo[], assemblyIds: Map<string, AssemblyId>): Members[] =>
  assemblyAndTypeInfos.flatMap((value) => {
    const assemblyId = getOrThrow(assemblyIds, value.assemblyName);
    const typeId = packTypeDefId(value.id, assemblyId);

    const getFieldMemberJson = (value: DotNet.FieldMember): WithoutNameAndMetadataToken<DotNet.FieldMember> => ({
      fieldType: value.fieldType,
      access: value.access,
      isStatic: value.isStatic,
      attributes: value.attributes,
    });

    const getEventMemberJson = (value: DotNet.EventMember): WithoutNameAndMetadataToken<DotNet.EventMember> => ({
      eventHandlerType: value.eventHandlerType,
      access: value.access,
      isStatic: value.isStatic,
      attributes: value.attributes,
    });

    const getPropertyMemberJson = (
      value: DotNet.PropertyMember
    ): WithoutNameAndMetadataToken<DotNet.PropertyMember> => ({
      propertyType: value.propertyType,
      access: value.access,
      isStatic: value.isStatic,
      parameters: value.parameters,
      attributes: value.attributes,
    });

    const getMethodMemberJson = (value: DotNet.MethodMember): WithoutNameAndMetadataToken<DotNet.MethodMember> => ({
      access: value.access,
      isStatic: value.isStatic,
      isConstruct: value.isConstruct,
      genericParameters: value.genericParameters,
      parameters: value.parameters,
      returnType: value.returnType,
      attributes: value.attributes,
    });

    const getMembers = <T extends AnyDotNetMembers>(
      members: T[] | undefined,
      getJson: (value: T) => WithoutNameAndMetadataToken<T>
    ): Members[] =>
      members?.map((value) => ({
        name: value.name,
        id: packMemberId(value.metadataToken, assemblyId),
        typeId,
        json: getJson(value),
      })) ?? [];

    const empty: Members[] = [];

    return empty
      .concat(getMembers(value.fieldMembers, getFieldMemberJson))
      .concat(getMembers(value.eventMembers, getEventMemberJson))
      .concat(getMembers(value.propertyMembers, getPropertyMemberJson))
      .concat(getMembers(value.methodMembers, getMethodMemberJson));
  });

export const insertAll = (all: DotNet.All, tables: Tables) => {
  // assemblies
  const assemblies = getAssemblies(all);
  tables.assemblies.insertMany(assemblies);
  const assemblyIds = new Map<string, AssemblyId>(assemblies.map((it) => [it.name, it.id]));

  assert(assemblies.length != 0);
  assert(assemblyIds.size != 0);

  const assemblyAndTypeInfos = getAssemblyAndTypeInfos(all);

  // namespaces
  const namespaces = getNamespaces(assemblyAndTypeInfos);
  tables.namespaces.insertMany(namespaces);
  const namespaceIds = new Map<string, NamespaceId>(namespaces.map((it) => [it.name, it.id]));

  tables.typeInfos.insertMany(getTypeInfos(assemblyAndTypeInfos, assemblyIds, namespaceIds));

  tables.members.insertMany(getMembers(assemblyAndTypeInfos, assemblyIds));
};
