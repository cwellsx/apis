import { mapOfMaps } from "../../shared-types";
import { CallColumns, TypeNameColumns } from "./columns";
import { Tables } from "./tables";

export type GetCallColumns = (
  fromAssemblyName: string,
  fromMethodId: number,
  toAssemblyName: string,
  toMethodId: number
) => CallColumns;
export const widenCallColumns = (table: Tables): GetCallColumns => {
  // read previously-saved data from tables into map-of-maps
  const assemblyMethodTypes: Map<string, Map<number, number>> = mapOfMaps(
    table.member
      .selectAll()
      .filter((memberColumns) => memberColumns.memberType === "methodMembers")
      .map((memberColumns) => [
        memberColumns.assemblyName,
        memberColumns.metadataToken,
        memberColumns.typeMetadataToken,
      ])
  );
  const assemblyTypeNames: Map<string, Map<number, TypeNameColumns>> = mapOfMaps(
    table.typeName.selectAll().map((typeName) => [typeName.assemblyName, typeName.metadataToken, typeName])
  );

  const getTypeId = (assemblyName: string, methodId: number): { namespace: string; typeId: number } => {
    // get typeId from methodId
    const typeId = assemblyMethodTypes.get(assemblyName)?.get(methodId);
    if (!typeId) throw new Error("typeId not found");
    // get namespace and wantedTypeId from typeId
    const found = assemblyTypeNames.get(assemblyName)?.get(typeId);
    if (!found) throw new Error("typeName not found");
    return {
      namespace: found.namespace ?? "(no namespace)",
      typeId: found.wantedTypeId ?? found.metadataToken,
    };
  };

  const getCallColumns = (
    fromAssemblyName: string,
    fromMethodId: number,
    toAssemblyName: string,
    toMethodId: number
  ) => {
    const { namespace: fromNamespace, typeId: fromTypeId } = getTypeId(fromAssemblyName, fromMethodId);
    const { namespace: toNamespace, typeId: toTypeId } = getTypeId(toAssemblyName, toMethodId);
    return {
      fromAssemblyName,
      fromNamespace,
      fromTypeId,
      fromMethodId,
      toAssemblyName,
      toNamespace,
      toTypeId,
      toMethodId,
    };
  };

  return getCallColumns;
};
