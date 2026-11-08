import * as IdCast from "./idCast";

// zero values with the right brands, used as the sample row when creating a table
export const zero = {
  // number
  assemblyId: IdCast.castAssemblyId(0),
  groupId: IdCast.castGroupId(0),
  viewId: IdCast.castViewId(0),
  // bigint
  namespaceId: IdCast.castNamespaceId(0n),

  typeDefId: IdCast.castTypeDefId(0n),
  typeSpecId: IdCast.castTypeSpecId(0n),
  genericParamId: IdCast.castGenericParamId(0n),

  typeId: IdCast.castTypeSpecId(0n),
  methodDefId: IdCast.castMethodDefId(0n),
  methodSpecId: IdCast.castMethodSpecId(0n),
  methodId: IdCast.castMethodDefId(0n),
  memberId: IdCast.castMemberId(0n),

  anyBigId: IdCast.castAnyBigId(0n),

  customLeafId: IdCast.castCustomLeafId("foo"),
  customNodeId: IdCast.castCustomNodeId("foo"),
  customGroupId: IdCast.castCustomGroupId("foo"),
  anyCustomId: IdCast.castAnyCustomId("foo"),
};