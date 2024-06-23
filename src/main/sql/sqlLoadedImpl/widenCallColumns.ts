import { mapOfMaps } from "../../shared-types";
import { CallColumns, LoadedCall, TypeNameColumns } from "./columns";
import { Tables } from "./tables";

export type GetCallColumns = (loaded: LoadedCall) => CallColumns;

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
      typeId: /*found.wantedTypeId ??*/ found.metadataToken,
    };
  };

  const getCallColumns = (loaded: LoadedCall) => {
    const { namespace: fromNamespace, typeId: fromTypeId } = getTypeId(loaded.fromAssemblyName, loaded.fromMethodId);
    const { namespace: toNamespace, typeId: toTypeId } = getTypeId(loaded.toAssemblyName, loaded.toMethodId);
    return { ...loaded, fromNamespace, fromTypeId, toNamespace, toTypeId };
  };

  return getCallColumns;
};
