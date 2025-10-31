import { mapOfMaps } from "../../utils";
import { TypeNameColumns } from "./columns";
import { Tables } from "./tables";

export type GetTypeId = (assemblyName: string, methodId: number) => { namespace: string; typeId: number };

export const getMethodTypeId = (table: Tables): GetTypeId => {
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

  return getTypeId;
};
