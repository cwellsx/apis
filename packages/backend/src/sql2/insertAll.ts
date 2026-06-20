import * as DotNet from "../../contracts/dotnet2";
import * as Id from "../id2";
import { assert, getOrThrow } from "../utils";
import { insertCalls } from "./insertCalls";
import { getFullNames } from "./insertFullNames";
import { getGroupNames } from "./insertGroups";
import * as GetMemberJson from "./insertMemberJson";
import type * as Schema from "./schema";
import * as MemberJson from "./schemaMemberJson";

type AllTypeInfo = { typeDefId: Id.TypeDefId; assemblyId: Id.AssemblyId; assemblyName: string } & DotNet.TypeInfo;

type AllMethodMember = {
  typeDefId: Id.TypeDefId;
  methodDefId: Id.MethodDefId;
  assemblyId: Id.AssemblyId;
  assemblyName: string;
} & DotNet.MethodMember;

type AllMethodInfo = { methodDefId: Id.MethodDefId; assemblyId: Id.AssemblyId } & DotNet.MethodInfo;

type MapAssemblyIds = Map<string, Id.AssemblyId>;

type SpecDataMaps = {
  typeSpecs: Map<Id.TypeSpecId, DotNet.TypeSpecData>;
  methodSpecs: Map<Id.MethodSpecId, DotNet.MethodSpecData>;
};

type ToTypeId = (id: DotNet.TypeId, assemblyId: Id.AssemblyId) => Id.TypeId;
type SetTypeArguments = (ownerId: Id.AnyOwnerId, genericTypeArguments: Id.TypeId[] | undefined) => void;
type ToBaseMethodId = (id: DotNet.BaseMethodId, assemblyId: Id.AssemblyId) => Id.MethodDefId;

const getAssemblies = (all: DotNet.All): Schema.Assembly[] =>
  Object.keys(all.assemblies)
    .map((value) => ({ name: value, isMicrosoft: 0 as Schema.Boolean }))
    .concat(Object.keys(all.microsoftAssemblies).map((value) => ({ name: value, isMicrosoft: 1 as Schema.Boolean })))
    .map((value, index) => ({ id: Id.makeAssemblyId(index + 1), ...value }));

const getAllTypeInfos = (all: DotNet.All, assemblyIds: MapAssemblyIds): AllTypeInfo[] =>
  Object.entries(all.assemblies)
    .concat(Object.entries(all.microsoftAssemblies))
    .flatMap(([assemblyName, assemblyInfo]) =>
      assemblyInfo.typeInfos.map((value) => {
        const assemblyId = getOrThrow(assemblyIds, assemblyName);
        return { assemblyId, assemblyName, typeDefId: Id.makeTypeDefId(value.id, assemblyId, true), ...value };
      })
    );

const getAllMethodMembers = (allTypeInfos: AllTypeInfo[], assemblyIds: MapAssemblyIds): AllMethodMember[] =>
  allTypeInfos.flatMap((allTypeInfo) =>
    (allTypeInfo.methodMembers ?? []).map((value) => {
      const assemblyName = allTypeInfo.assemblyName;
      const typeDefId = allTypeInfo.typeDefId;
      const assemblyId = getOrThrow(assemblyIds, assemblyName);
      // create: false because getMembers already created Id
      const methodDefId = Id.makeMethodDefId(value.metadataToken, assemblyId, false);
      return { typeDefId, methodDefId, assemblyId, assemblyName, ...value };
    })
  );

const getAllMethodInfos = (all: DotNet.All, assemblyIds: MapAssemblyIds): AllMethodInfo[] =>
  Object.entries(all.assemblyMethods).flatMap(([assemblyName, tokenMap]) =>
    Object.entries(tokenMap).map(([metadataToken, methodInfo]) => {
      const assemblyId = getOrThrow(assemblyIds, assemblyName);
      return { ...methodInfo, methodDefId: Id.makeMethodDefId(+metadataToken, assemblyId, false), assemblyId };
    })
  );

const getNamespaces = (assemblyAndTypeInfos: AllTypeInfo[]): Schema.Namespace[] => {
  const distinctNamespaces = new Set<string>();
  assemblyAndTypeInfos.forEach((value) => {
    if (value.namespace) distinctNamespaces.add(value.namespace);
  });
  return [...distinctNamespaces].sort().map((value, index) => ({ id: Id.makeNamespaceId(index + 1), name: value }));
};

const getTypeNames = (
  allTypeInfos: AllTypeInfo[],
  assemblyIds: MapAssemblyIds,
  namespaceIds: Map<string, Id.NamespaceId>
): Schema.TypeName[] =>
  allTypeInfos.map((value) => ({
    id: value.typeDefId,
    assemblyId: value.assemblyId,
    namespaceId: value.namespace ? namespaceIds.get(value.namespace) : undefined,
    name: value.name,
    declaringTypeId: value.declaringType
      ? Id.makeTypeDefId(value.declaringType, getOrThrow(assemblyIds, value.assemblyName), false)
      : undefined,
  }));

const getMembers = (allTypeInfos: AllTypeInfo[], assemblyIds: MapAssemblyIds): Schema.Member[] =>
  allTypeInfos.flatMap((value) => {
    const assemblyId = getOrThrow(assemblyIds, value.assemblyName);
    const typeId = value.typeDefId;

    const getMembers = <T extends MemberJson.AnyDotNetMembers>(
      members: T[] | undefined,
      getJson: (value: T) => MemberJson.WithoutNameAndMetadataToken<T>,
      makeMemberId: (id: number, assemblyId: Id.AssemblyId, create: boolean) => Id.MemberId
    ): Schema.Member[] =>
      members?.map((value) => ({
        name: value.name,
        id: makeMemberId(value.metadataToken, assemblyId, true),
        typeId,
        json: getJson(value),
      })) ?? [];

    const empty: Schema.Member[] = [];

    return empty
      .concat(getMembers(value.fieldMembers, GetMemberJson.getFieldMemberJson, Id.makeFieldMemberId))
      .concat(getMembers(value.eventMembers, GetMemberJson.getEventMemberJson, Id.makeEventMemberId))
      .concat(getMembers(value.propertyMembers, GetMemberJson.getPropertyMemberJson, Id.makePropertyMemberId))
      .concat(getMembers(value.methodMembers, GetMemberJson.getMethodMemberJson, Id.makeMethodMemberId));
  });

const getGenericParams = (allTypeInfos: AllTypeInfo[], allMethodMembers: AllMethodMember[]): Schema.GenericParam[] => {
  type Owned = { assemblyId: Id.AssemblyId; ownerId: Id.AnyDefId; genericParameters: DotNet.GenericParam[] };
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
    const genericParams: Schema.GenericParam[] = owned.genericParameters.map((genericParam, seqno) => {
      assert(DotNet.isGenericParam(genericParam));
      const [name, id] = DotNet.spitGenericParam(genericParam);
      return { id: Id.makeGenericParamId(id, owned.assemblyId, true), ownerId: owned.ownerId, seqno, name };
    });
    return genericParams;
  });
};

const getAllSpecData = (all: DotNet.All, assemblyIds: MapAssemblyIds): [Id.AssemblyId, SpecDataMaps][] =>
  Object.entries(all.assemblies)
    .concat(Object.entries(all.microsoftAssemblies))
    .map(([assemblyName, assemblyInfo]) => {
      const assemblyId = getOrThrow(assemblyIds, assemblyName);

      const typeSpecs = new Map<Id.TypeSpecId, DotNet.TypeSpecData>(
        Object.entries(assemblyInfo.typeSpecs).map(([key, typeSpecData]) => [
          Id.makeTypeSpecId(Number(key), assemblyId, true),
          typeSpecData,
        ])
      );

      const methodSpecs = new Map<Id.MethodSpecId, DotNet.MethodSpecData>(
        Object.entries(assemblyInfo.methodSpecs).map(([key, methodSpecData]) => [
          Id.makeMethodSpecId(Number(key), assemblyId, true),
          methodSpecData,
        ])
      );

      return [assemblyId, { typeSpecs, methodSpecs }];
    });

const getMethodNames = (
  allMethodMembers: AllMethodMember[],
  toTypeId: ToTypeId,
  setTypeArguments: SetTypeArguments
): Schema.MethodName[] =>
  allMethodMembers.map((value) => {
    const assemblyId = value.assemblyId;
    const typeDefId = value.typeDefId;
    const methodDefId = value.methodDefId;
    setTypeArguments(
      methodDefId,
      value.parameters?.map((value) => toTypeId(value.type, assemblyId))
    );

    //method name
    return {
      id: methodDefId,
      typeId: typeDefId,
      name: value.name,
      returnTypeId: toTypeId(value.returnType, assemblyId),
    };
  });

const getTypeSpecs = (
  assemblyId: Id.AssemblyId,
  typeSpecs: Map<Id.TypeSpecId, DotNet.TypeSpecData>,
  toTypeId: ToTypeId,
  setTypeArguments: SetTypeArguments
): Schema.TypeSpec[] => {
  // like DotNet.TypeSpecData except using TypeId instead of DotNet.TypeId
  type TypeSpecData = {
    resolvedId: Id.TypeId;
    genericTypeArguments?: Id.TypeId[];
    suffix?: string;
    isSpecification: boolean;
  };
  const allTypeSpecData: [Id.TypeSpecId, TypeSpecData][] = [...typeSpecs.entries()].map(([typeSpecId, typeSpec]) => [
    typeSpecId,
    {
      resolvedId: toTypeId(typeSpec.resolved, assemblyId),
      genericTypeArguments: typeSpec.genericTypeArguments?.map((arg) => toTypeId(arg, assemblyId)),
      suffix: typeSpec.suffix,
      isSpecification: DotNet.isSpecification(typeSpec.resolved),
    },
  ]);

  const mapTypeSpecData = new Map<Id.TypeSpecId, TypeSpecData>(allTypeSpecData);

  const getTypeSpec = (typeSpecId: Id.TypeSpecId, typeSpecData: TypeSpecData): Schema.TypeSpec => {
    setTypeArguments(typeSpecId, typeSpecData.genericTypeArguments);

    // emulate the C# AllNames.GetTypeName method
    while (typeSpecData.isSpecification) {
      assert(typeSpecData.genericTypeArguments == null);
      assert(typeSpecData.suffix != null);
      const other = getOrThrow(mapTypeSpecData, typeSpecData.resolvedId);
      typeSpecData = { ...other, suffix: other.suffix + typeSpecData.suffix };
    }
    const resolvedId = typeSpecData.resolvedId;
    assert(Id.isBaseTypeId(resolvedId));
    return { id: typeSpecId, resolvedId, suffix: typeSpecData.suffix };
  };

  return [...mapTypeSpecData.entries()].map(([typeSpecId, typeSpecData]) => getTypeSpec(typeSpecId, typeSpecData));
};

const getMethodSpecs = (
  assemblyId: Id.AssemblyId,
  methodSpecs: Map<Id.MethodSpecId, DotNet.MethodSpecData>,
  toTypeId: ToTypeId,
  setTypeArguments: SetTypeArguments,
  toBaseMethodId: ToBaseMethodId
): Schema.MethodSpec[] => {
  const getTypeSpecId = (declaringType: DotNet.TypeId | undefined): Id.TypeSpecId | undefined => {
    if (!declaringType) return undefined;
    const typeId = toTypeId(declaringType, assemblyId);
    assert(Id.isTypeSpecId(typeId));
    return typeId;
  };

  const getMethodSpec = (methodSpecId: Id.MethodSpecId, methodSpecData: DotNet.MethodSpecData): Schema.MethodSpec => {
    const methodSpec: Schema.MethodSpec = {
      id: methodSpecId,
      resolvedId: toBaseMethodId(methodSpecData.resolved, assemblyId),
      declaringTypeSpecId: getTypeSpecId(methodSpecData.declaringType),
    };
    const genericMethodArguments = methodSpecData.genericMethodArguments?.map((arg) => toTypeId(arg, assemblyId));
    setTypeArguments(methodSpecId, genericMethodArguments);
    return methodSpec;
  };

  return [...methodSpecs.entries()].map(([methodSpecId, methodSpecData]) =>
    getMethodSpec(methodSpecId, methodSpecData)
  );
};

// -----------------

export const insertAll = (all: DotNet.All, tables: Schema.Tables) => {
  // assemblies
  const assemblies = getAssemblies(all);
  tables.assemblies.insertMany(assemblies);
  const assemblyIds = new Map<string, Id.AssemblyId>(assemblies.map((it) => [it.name, it.id]));

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
  const namespaceIds = new Map<string, Id.NamespaceId>(namespaces.map((it) => [it.name, it.id]));

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
  const toTypeId = (id: DotNet.TypeId, assemblyId: Id.AssemblyId): Id.TypeId => {
    if (DotNet.isMetadataToken(id)) return Id.makeTypeDefId(id, assemblyId, false);
    if (DotNet.isBrandedId(id)) {
      const split = DotNet.spitBrandedId(id);
      return Id.makeTypeDefId(split[1], getOrThrow(assemblyIds, split[0]), false);
    }
    if (DotNet.isGenericParam(id)) {
      const split = DotNet.spitGenericParam(id);
      return Id.makeGenericParamId(split[1], assemblyId, false);
    }
    return Id.makeTypeSpecId(id[0], assemblyId, false);
  };

  const toMethodId = (id: DotNet.MethodId, assemblyId: Id.AssemblyId): Id.MethodId => {
    if (DotNet.isMetadataToken(id)) return Id.makeMethodDefId(id, assemblyId, false);
    if (DotNet.isBrandedId(id)) {
      const split = DotNet.spitBrandedId(id);
      return Id.makeMethodDefId(split[1], getOrThrow(assemblyIds, split[0]), false);
    }
    return Id.makeMethodSpecId(id[0], assemblyId, false);
  };

  const toBaseMethodId = (id: DotNet.BaseMethodId, assemblyId: Id.AssemblyId): Id.MethodDefId => {
    if (DotNet.isMetadataToken(id)) return Id.makeMethodDefId(id, assemblyId, false);
    if (DotNet.isBrandedId(id)) {
      const split = DotNet.spitBrandedId(id);
      return Id.makeMethodDefId(split[1], getOrThrow(assemblyIds, split[0]), false);
    }
    assert(false);
  };

  // signatureTypes are a side-effect of getTypeSpecs, getMethodSpecs, and getMethodNames
  const signatureTypes: Schema.SignatureType[] = [];
  const setTypeArguments = (ownerId: Id.AnyOwnerId, genericTypeArguments: Id.TypeId[] | undefined): void => {
    if (genericTypeArguments)
      signatureTypes.push(...genericTypeArguments.map((argumentId, seqno) => ({ ownerId, argumentId, seqno })));
  };

  // type specs
  const typeSpecs = allSpecData.flatMap(([assemblyId, specDataMaps]) =>
    getTypeSpecs(assemblyId, specDataMaps.typeSpecs, toTypeId, setTypeArguments)
  );
  tables.typeSpecs.insertMany(typeSpecs);

  // method specs
  const methodSpecs = allSpecData.flatMap(([assemblyId, specDataMaps]) =>
    getMethodSpecs(assemblyId, specDataMaps.methodSpecs, toTypeId, setTypeArguments, toBaseMethodId)
  );
  tables.methodSpecs.insertMany(methodSpecs);

  // method names and method parameters
  const methodNames = getMethodNames(allMethodMembers, toTypeId, setTypeArguments);
  tables.methodNames.insertMany(methodNames);

  // signatures accumulated via setTypeArguments
  tables.signatureTypes.insertMany(signatureTypes);

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
  const allFullNames = getFullNames({
    assemblies,
    namespaces,
    genericParams,
    signatureTypes,
    typeNames,
    typeSpecs,
    methodNames,
    methodSpecs,
  });
  tables.fullNames.insertMany(allFullNames);

  const assemblyGroups = getGroupNames(assemblies.map((value) => value.name)).map((value, index) => ({
    id: Id.makeAssemblyGroupId(index),
    name: value,
  }));
  tables.assemblyGroups.insertMany(assemblyGroups);

  const namespaceGroups = getGroupNames(namespaces.map((value) => value.name)).map((value, index) => ({
    id: Id.makeNamespaceGroupId(index),
    name: value,
  }));
  tables.namespaceGroups.insertMany(namespaceGroups);

  tables.views.insertAuto({ viewType: "assemblies" });
  tables.views.insertAuto({ viewType: "namespaces" });
  tables.views.insertAuto({ viewType: "references" });

  insertCalls(tables);
};
