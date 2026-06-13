import * as DotNet from "../../contracts/dotnet2";
import { assert, getOrThrow } from "../utils";
// import type { IdCreate } from "./idCreate";
// import { createIds } from "./idCreate";
import * as IdMake from "./idMake";
import { isBaseTypeId, isTypeSpecId } from "./idTest";
import type {
  AnyDefId,
  AnyOwnerId,
  AssemblyId,
  MemberId,
  MethodDefId,
  MethodId,
  MethodSpecId,
  NamespaceId,
  TypeDefId,
  TypeId,
  TypeSpecId,
} from "./idTypes";
import { insertCalls } from "./insertCalls";
import { fullNames } from "./insertFullNames";
//import { parseTypeIds } from "./insertDotNetId";
import * as GetMemberJson from "./insertMemberJson";
import {
  Assembly,
  Boolean,
  GenericParam,
  Member,
  MethodName,
  MethodSpec,
  Namespace,
  SignatureType,
  Tables,
  TypeName,
  TypeSpec,
} from "./schema";
import * as MemberJson from "./schemaMemberJson";

type AllTypeInfo = { typeDefId: TypeDefId; assemblyId: AssemblyId; assemblyName: string } & DotNet.TypeInfo;

type AllMethodMember = {
  typeDefId: TypeDefId;
  methodDefId: MethodDefId;
  assemblyId: AssemblyId;
  assemblyName: string;
} & DotNet.MethodMember;

type AllMethodInfo = { methodDefId: MethodDefId; assemblyId: AssemblyId } & DotNet.MethodInfo;

type MapAssemblyIds = Map<string, AssemblyId>;

type SpecDataMaps = {
  typeSpecs: Map<TypeSpecId, DotNet.TypeSpecData>;
  methodSpecs: Map<MethodSpecId, DotNet.MethodSpecData>;
};

const getAssemblies = (all: DotNet.All): Assembly[] =>
  Object.keys(all.assemblies)
    .map((value) => ({ name: value, isMicrosoft: 0 as Boolean }))
    .concat(Object.keys(all.microsoftAssemblies).map((value) => ({ name: value, isMicrosoft: 1 as Boolean })))
    .map((value, index) => ({ id: IdMake.makeAssemblyId(index + 1), ...value }));

const getAllTypeInfos = (all: DotNet.All, assemblyIds: MapAssemblyIds): AllTypeInfo[] =>
  Object.entries(all.assemblies)
    .concat(Object.entries(all.microsoftAssemblies))
    .flatMap(([assemblyName, assemblyInfo]) =>
      assemblyInfo.typeInfos.map((value) => {
        const assemblyId = getOrThrow(assemblyIds, assemblyName);
        return { assemblyId, assemblyName, typeDefId: IdMake.makeTypeDefId(value.id, assemblyId, true), ...value };
      })
    );

const getAllMethodMembers = (allTypeInfos: AllTypeInfo[], assemblyIds: MapAssemblyIds): AllMethodMember[] =>
  allTypeInfos.flatMap((allTypeInfo) =>
    (allTypeInfo.methodMembers ?? []).map((value) => {
      const assemblyName = allTypeInfo.assemblyName;
      const typeDefId = allTypeInfo.typeDefId;
      const assemblyId = getOrThrow(assemblyIds, assemblyName);
      // create: false because getMembers already created Id
      const methodDefId = IdMake.makeMethodDefId(value.metadataToken, assemblyId, false);
      return { typeDefId, methodDefId, assemblyId, assemblyName, ...value };
    })
  );

const getAllMethodInfos = (all: DotNet.All, assemblyIds: MapAssemblyIds): AllMethodInfo[] =>
  Object.entries(all.assemblyMethods).flatMap(([assemblyName, tokenMap]) =>
    Object.entries(tokenMap).map(([metadataToken, methodInfo]) => {
      const assemblyId = getOrThrow(assemblyIds, assemblyName);
      return { ...methodInfo, methodDefId: IdMake.makeMethodDefId(+metadataToken, assemblyId, false), assemblyId };
    })
  );

const getNamespaces = (assemblyAndTypeInfos: AllTypeInfo[]): Namespace[] => {
  const distinctNamespaces = new Set<string>();
  assemblyAndTypeInfos.forEach((value) => {
    if (value.namespace) distinctNamespaces.add(value.namespace);
  });
  return [...distinctNamespaces].sort().map((value, index) => ({ id: IdMake.makeNamespaceId(index + 1), name: value }));
};

const getTypeNames = (
  allTypeInfos: AllTypeInfo[],
  assemblyIds: MapAssemblyIds,
  namespaceIds: Map<string, NamespaceId>
): TypeName[] =>
  allTypeInfos.map((value) => ({
    id: value.typeDefId,
    assemblyId: value.assemblyId,
    namespaceId: value.namespace ? namespaceIds.get(value.namespace) : undefined,
    name: value.name,
    declaringTypeId: value.declaringType
      ? IdMake.makeTypeDefId(value.declaringType, getOrThrow(assemblyIds, value.assemblyName), false)
      : undefined,
  }));

const getMembers = (allTypeInfos: AllTypeInfo[], assemblyIds: MapAssemblyIds): Member[] =>
  allTypeInfos.flatMap((value) => {
    const assemblyId = getOrThrow(assemblyIds, value.assemblyName);
    const typeId = value.typeDefId;

    const getMembers = <T extends MemberJson.AnyDotNetMembers>(
      members: T[] | undefined,
      getJson: (value: T) => MemberJson.WithoutNameAndMetadataToken<T>,
      makeMemberId: (id: number, assemblyId: AssemblyId, create: boolean) => MemberId
    ): Member[] =>
      members?.map((value) => ({
        name: value.name,
        id: makeMemberId(value.metadataToken, assemblyId, true),
        typeId,
        json: getJson(value),
      })) ?? [];

    const empty: Member[] = [];

    return empty
      .concat(getMembers(value.fieldMembers, GetMemberJson.getFieldMemberJson, IdMake.makeFieldMemberId))
      .concat(getMembers(value.eventMembers, GetMemberJson.getEventMemberJson, IdMake.makeEventMemberId))
      .concat(getMembers(value.propertyMembers, GetMemberJson.getPropertyMemberJson, IdMake.makePropertyMemberId))
      .concat(getMembers(value.methodMembers, GetMemberJson.getMethodMemberJson, IdMake.makeMethodMemberId));
  });

const getGenericParams = (allTypeInfos: AllTypeInfo[], allMethodMembers: AllMethodMember[]): GenericParam[] => {
  type Owned = { assemblyId: AssemblyId; ownerId: AnyDefId; genericParameters: DotNet.GenericParam[] };
  const allTypeParameters: Owned[] = allTypeInfos
    .filter((value) => value.genericParameters)
    .map((value) => ({
      assemblyId: value.assemblyId,
      ownerId: value.typeDefId,
      genericParameters: value.genericParameters ?? [],
    }));
  const allMethodParameters: Owned[] = allMethodMembers
    .filter((value) => value.genericParameters)
    .map((value) => ({
      assemblyId: value.assemblyId,
      ownerId: value.methodDefId,
      genericParameters: value.genericParameters ?? [],
    }));
  return allTypeParameters.concat(allMethodParameters).flatMap((owned) => {
    const genericParams: GenericParam[] = owned.genericParameters.map((genericParam, seqno) => {
      assert(DotNet.isGenericParam(genericParam));
      const [name, id] = DotNet.spitGenericParam(genericParam);
      return { id: IdMake.makeGenericParamId(id, owned.assemblyId, true), ownerId: owned.ownerId, seqno, name };
    });
    return genericParams;
  });
};

export const getAllSpecData = (all: DotNet.All, assemblyIds: MapAssemblyIds): [AssemblyId, SpecDataMaps][] =>
  Object.entries(all.assemblies)
    .concat(Object.entries(all.microsoftAssemblies))
    .map(([assemblyName, assemblyInfo]) => {
      const assemblyId = getOrThrow(assemblyIds, assemblyName);

      const typeSpecs = new Map<TypeSpecId, DotNet.TypeSpecData>(
        Object.entries(assemblyInfo.typeSpecs).map(([key, typeSpecData]) => [
          IdMake.makeTypeSpecId(Number(key), assemblyId, true),
          typeSpecData,
        ])
      );

      const methodSpecs = new Map<MethodSpecId, DotNet.MethodSpecData>(
        Object.entries(assemblyInfo.methodSpecs).map(([key, methodSpecData]) => [
          IdMake.makeMethodSpecId(Number(key), assemblyId, true),
          methodSpecData,
        ])
      );

      return [assemblyId, { typeSpecs, methodSpecs }];
    });

export const insertAll = (all: DotNet.All, tables: Tables) => {
  // assemblies
  const assemblies = getAssemblies(all);
  tables.assemblies.insertMany(assemblies);
  const assemblyIds = new Map<string, AssemblyId>(assemblies.map((it) => [it.name, it.id]));

  // references
  tables.references.insertMany(
    Object.entries(all.assemblies).flatMap(([assemblyName, assemblyInfo]) => {
      const fromId = getOrThrow(assemblyIds, assemblyName);
      return (
        assemblyInfo.referencedAssemblies
          // there are assembly references for which we have no types etc
          // - "System.Runtime" -- compiler-generated types removed from the view
          // - "netstandard" -- contains type forwarders
          // - "System.Memory" -- contains System.Span`1
          .filter((referenced) => assemblyIds.has(referenced))
          .map((referenced) => {
            const toId = getOrThrow(assemblyIds, referenced);
            return { fromId, toId };
          })
      );
    })
  );

  // assemblyName & typeDefId & DotNet.TypeInfo
  const allTypeInfos = getAllTypeInfos(all, assemblyIds);

  // namespaces
  const namespaces = getNamespaces(allTypeInfos);
  tables.namespaces.insertMany(namespaces);
  const namespaceIds = new Map<string, NamespaceId>(namespaces.map((it) => [it.name, it.id]));

  // type names
  const typeNames = getTypeNames(allTypeInfos, assemblyIds, namespaceIds);
  tables.typeNames.insertMany(typeNames);

  // member json
  tables.members.insertMany(getMembers(allTypeInfos, assemblyIds));

  // method members -- with DotNet TypeId elements, not yet converted to Id values, and not stored in the schema
  const allMethodMembers = getAllMethodMembers(allTypeInfos, assemblyIds);

  // generic parameters
  const genericParams = getGenericParams(allTypeInfos, allMethodMembers);
  tables.genericParams.insertMany(genericParams);

  // typeSpec and methodSpec
  const allSpecData = getAllSpecData(all, assemblyIds);

  // by now we've invoked Id.Make*(.., true) on all Id instance
  // => resolve type reference with Id.Make*(.., false)
  const toTypeId = (id: DotNet.TypeId, assemblyId: AssemblyId): TypeId => {
    if (DotNet.isMetadataToken(id)) return IdMake.makeTypeDefId(id, assemblyId, false);
    if (DotNet.isBrandedId(id)) {
      const split = DotNet.spitBrandedId(id);
      return IdMake.makeTypeDefId(split[1], getOrThrow(assemblyIds, split[0]), false);
    }
    if (DotNet.isGenericParam(id)) {
      const split = DotNet.spitGenericParam(id);
      return IdMake.makeGenericParamId(split[1], assemblyId, false);
    }
    return IdMake.makeTypeSpecId(id[0], assemblyId, false);
  };

  const toMethodId = (id: DotNet.MethodId, assemblyId: AssemblyId): MethodId => {
    if (DotNet.isMetadataToken(id)) return IdMake.makeMethodDefId(id, assemblyId, false);
    if (DotNet.isBrandedId(id)) {
      const split = DotNet.spitBrandedId(id);
      return IdMake.makeMethodDefId(split[1], getOrThrow(assemblyIds, split[0]), false);
    }
    return IdMake.makeMethodSpecId(id[0], assemblyId, false);
  };

  const getTypeArguments = (
    ownerId: AnyOwnerId,
    genericTypeArguments: TypeId[] | undefined
  ): SignatureType[] | undefined => genericTypeArguments?.map((argumentId, seqno) => ({ ownerId, argumentId, seqno }));

  const toBaseMethodId = (id: DotNet.BaseMethodId, assemblyId: AssemblyId): MethodDefId => {
    if (DotNet.isMetadataToken(id)) return IdMake.makeMethodDefId(id, assemblyId, false);
    if (DotNet.isBrandedId(id)) {
      const split = DotNet.spitBrandedId(id);
      return IdMake.makeMethodDefId(split[1], getOrThrow(assemblyIds, split[0]), false);
    }
    assert(false);
  };

  allSpecData.forEach(([assemblyId, allSpecData]) => {
    // like DotNet.TypeSpecData except using TypeId instead of DotNet.TypeId
    type TypeSpecData = {
      resolvedId: TypeId;
      genericTypeArguments?: TypeId[];
      suffix?: string;
      isSpecification: boolean;
    };
    const allTypeSpecData: [TypeSpecId, TypeSpecData][] = [...allSpecData.typeSpecs.entries()].map(
      ([typeSpecId, typeSpec]) => [
        typeSpecId,
        {
          resolvedId: toTypeId(typeSpec.resolved, assemblyId),
          genericTypeArguments: typeSpec.genericTypeArguments?.map((arg) => toTypeId(arg, assemblyId)),
          suffix: typeSpec.suffix,
          isSpecification: DotNet.isSpecification(typeSpec.resolved),
        },
      ]
    );

    const mapTypeSpecData = new Map<TypeSpecId, TypeSpecData>(allTypeSpecData);

    const getTypeSpec = (
      typeSpecId: TypeSpecId,
      typeSpecData: TypeSpecData
    ): { typeSpec: TypeSpec; typeArguments?: SignatureType[] } => {
      const typeArguments = getTypeArguments(typeSpecId, typeSpecData.genericTypeArguments);

      // emulate the C# AllNames.GetTypeName method
      while (typeSpecData.isSpecification) {
        assert(typeSpecData.genericTypeArguments == null);
        assert(typeSpecData.suffix != null);
        const other = getOrThrow(mapTypeSpecData, typeSpecData.resolvedId);
        typeSpecData = { ...other, suffix: other.suffix + typeSpecData.suffix };
      }
      const resolvedId = typeSpecData.resolvedId;
      assert(isBaseTypeId(resolvedId));
      const typeSpec: TypeSpec = { id: typeSpecId, resolvedId, suffix: typeSpecData.suffix };

      return { typeSpec, typeArguments };
    };

    const allTypeSpecs = [...mapTypeSpecData.entries()].map(([typeSpecId, typeSpecData]) =>
      getTypeSpec(typeSpecId, typeSpecData)
    );

    tables.typeSpecs.insertMany(allTypeSpecs.map((value) => value.typeSpec));
    tables.signatureTypes.insertMany(allTypeSpecs.flatMap((value) => value.typeArguments ?? []));

    const getTypeSpecId = (declaringType: DotNet.TypeId | undefined): TypeSpecId | undefined => {
      if (!declaringType) return undefined;
      const typeId = toTypeId(declaringType, assemblyId);
      assert(isTypeSpecId(typeId));
      return typeId;
    };

    const getMethodSpec = (
      methodSpecId: MethodSpecId,
      methodSpecData: DotNet.MethodSpecData
    ): { methodSpec: MethodSpec; methodArguments?: SignatureType[] } => {
      const methodSpec: MethodSpec = {
        id: methodSpecId,
        resolvedId: toBaseMethodId(methodSpecData.resolved, assemblyId),
        declaringTypeSpecId: getTypeSpecId(methodSpecData.declaringType),
      };
      const genericMethodArguments = methodSpecData.genericMethodArguments?.map((arg) => toTypeId(arg, assemblyId));
      const methodArguments = getTypeArguments(methodSpecId, genericMethodArguments);
      return { methodSpec, methodArguments };
    };

    const allMethodSpecs = [...allSpecData.methodSpecs.entries()].map(([methodSpecId, methodSpecData]) =>
      getMethodSpec(methodSpecId, methodSpecData)
    );

    tables.methodSpecs.insertMany(allMethodSpecs.map((value) => value.methodSpec));
    tables.signatureTypes.insertMany(allMethodSpecs.flatMap((value) => value.methodArguments ?? []));
  });

  // method names and method parameters
  const methodNames: MethodName[] = allMethodMembers.map((value) => {
    const assemblyId = value.assemblyId;
    const typeDefId = value.typeDefId;
    const methodDefId = value.methodDefId;
    const methodParameters = getTypeArguments(
      methodDefId,
      value.parameters?.map((value) => toTypeId(value.type, assemblyId))
    );
    if (methodParameters) tables.signatureTypes.insertMany(methodParameters);

    //method name
    return {
      id: methodDefId,
      typeId: typeDefId,
      name: value.name,
      returnTypeId: toTypeId(value.returnType, assemblyId),
    };
  });
  tables.methodNames.insertMany(methodNames);

  // method info
  const allMethodInfos = getAllMethodInfos(all, assemblyIds);
  // decompiled
  tables.decompiled.insertMany(allMethodInfos.map((value) => ({ id: value.methodDefId, asText: value.asText })));

  // calls
  const calls = allMethodInfos.flatMap((value) => {
    const fromId = value.methodDefId;
    // .NET guarantees that these IDs are unique
    const toIds = [...(value.called ?? []), ...(value.argued ?? [])];
    return toIds.map((id) => ({ fromId, toId: toMethodId(id, value.assemblyId) }));
  });
  tables.calls.insertMany(calls);

  // fullNames
  const allFullNames = fullNames({
    assemblies,
    namespaces,
    genericParams,
    signatureTypes: tables.signatureTypes.selectAll(),
    typeNames,
    typeSpecs: tables.typeSpecs.selectAll(),
    methodNames,
    methodSpecs: tables.methodSpecs.selectAll(),
  });
  tables.fullNames.insertMany(allFullNames);

  // const assemblyGroups = getGroupNames(assemblies.map((value) => value.name)).map((value) => ({
  //   id: idCreate.newAssemblyGroupId(),
  //   name: value,
  // }));
  // tables.assemblyGroups.insertMany(assemblyGroups);

  // const namespaceGroups = getGroupNames(namespaces.map((value) => value.name)).map((value) => ({
  //   id: idCreate.newNamespaceGroupId(),
  //   name: value,
  // }));
  // tables.namespaceGroups.insertMany(namespaceGroups);

  tables.views.insertAuto({ viewType: "assemblies" });
  tables.views.insertAuto({ viewType: "namespaces" });
  tables.views.insertAuto({ viewType: "references" });

  insertCalls(tables);
};
