import { TypeNodeId, typeNodeId } from "../../../shared-types";
import { GoodTypeInfo, Members } from "../../loaded";
import { getTypeInfoName, nestTypes } from "../../shared-types";
import { MemberColumns, MethodNameColumns, TypeColumns, TypeNameColumns } from "./columns";
import { createSavedTypeInfo } from "./savedTypeInfo";

export const saveGoodTypeInfo = (
  assemblyName: string,
  // assemblyInfo: AssemblyInfo,
  goodTypeInfos: GoodTypeInfo[]
): {
  typeColumns: TypeColumns[];
  typeNodeIds: TypeNodeId[];
  members: MemberColumns[];
  methodNameColumns: MethodNameColumns[];
  typeNameColumns: TypeNameColumns[];
} => {
  // typeIds dictionary
  // const methodTypes: { [methodId: number]: number } = {};
  // assemblyMethodTypes[assemblyName] = methodTypes;

  // => assemblyTable
  // assemblyTable.insert({
  //   assemblyName,
  //   // uniqueStrings because I've unusually seen an assembly return two references to the same assembly name
  //   references: JSON.stringify(uniqueStrings(assemblyInfo.referencedAssemblies)),
  // });

  const typeColumns: TypeColumns[] = [];
  const typeNodeIds: TypeNodeId[] = [];
  const members: MemberColumns[] = [];
  const methodNameColumns: MethodNameColumns[] = [];

  for (const type of goodTypeInfos) {
    const typeInfo = createSavedTypeInfo(type);

    typeColumns.push({
      assemblyName,
      metadataToken: typeInfo.typeId.metadataToken,
      typeInfo: JSON.stringify(typeInfo),
    });

    typeNodeIds.push(typeNodeId(assemblyName, typeInfo.typeId.metadataToken));

    for (const [memberType, memberInfos] of Object.entries(type.members)) {
      members.push(
        ...memberInfos.map((memberInfo) => {
          if ((memberType as keyof Members) == "methodMembers") {
            methodNameColumns.push({
              assemblyName,
              name: memberInfo.name,
              metadataToken: memberInfo.metadataToken,
            });
          }
          return {
            assemblyName,
            // memberType is string[] -- https://github.com/microsoft/TypeScript/pull/12253#issuecomment-263132208
            memberType: memberType as keyof Members,
            typeMetadataToken: typeInfo.typeId.metadataToken,
            metadataToken: memberInfo.metadataToken,
            memberInfo: JSON.stringify(memberInfo),
          };
        })
      );
    }
  }

  const { unwantedTypes } = nestTypes(goodTypeInfos);
  const typeNameColumns: TypeNameColumns[] = goodTypeInfos.map((typeInfo) => ({
    assemblyName,
    metadataToken: typeInfo.typeId.metadataToken,
    namespace: typeInfo.typeId.namespace ?? null,
    decoratedName: getTypeInfoName(typeInfo),
    // the wantedTypeId is used to avoid calls to compiler-generated nested types e.g. for anonymous predicates
    wantedTypeId: unwantedTypes[typeInfo.typeId.metadataToken] ?? null,
  }));
  // => typeNameTable
  //typeNameTable.insertMany(typeNameColumns);

  // const typeNames: { [typeId: number]: TypeNameColumns } = {};
  // typeNameColumns.forEach((nameColumns) => (typeNames[nameColumns.metadataToken] = nameColumns));
  // assemblyTypeNames[assemblyName] = typeNames;

  return { typeColumns, typeNodeIds, members, methodNameColumns, typeNameColumns };
};
