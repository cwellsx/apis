// the names exported by each module are listed above it, so that the public surface of id2 can be
// reviewed at a glance -- keep these lists in step with the modules

// toBigAssemblyId, toBigGroupId
export * as IdBig from "./big";

// makeTypeDefId, makeMethodDefId, makeFieldMemberId, makeEventMemberId, makePropertyMemberId,
// makeMethodMemberId, makeTypeSpecId, makeMethodSpecId, makeGenericParamId, makeNamespaceId,
// makeAssemblyId, makeGroupId, makeCustomLeafId, makeCustomNodeId, makeCustomGroupId
export * as IdMake from "./idMake";

// isTypeDefId, isGenericParamId, isMethodDefId, isMethodSpecId, isBaseTypeId, isTypeSpecId,
// isOwnerTypeSpecId, isOwnerMethodSpecId, isOwnerMethodDefId, isCallToId, describeId
export * as IdTest from "./idTest";

// AssemblyId, GroupId, ViewId, CustomLeafId, CustomNodeId, CustomGroupId, NamespaceId, TypeDefId,
// TypeSpecId, GenericParamId, MethodDefId, MethodSpecId, MemberId, BigAssemblyId, BigGroupId,
// CallFromId, CallToId, CustomCallId, BaseTypeId, TypeId, MethodId, AnyDefId, AnyOwnerId, AnyCoreId,
// AnyId, AnyBigId, AnyCustomId
export type * as Id from "./idTypes";

// toAnyBigId, toAnyCustomId, toCustomCallId
export * as IdAny from "./toAnyId";

// textToViewId, viewIdToText, minViewId
export * as IdView from "./view";

export { zero } from "./zero";
