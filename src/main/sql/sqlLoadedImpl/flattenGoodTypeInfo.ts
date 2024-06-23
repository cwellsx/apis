import { GoodTypeInfo, Members } from "../../loaded";
import { getTypeInfoName } from "../../shared-types";
import { MemberColumns, MethodNameColumns, TypeColumns, TypeNameColumns } from "./columns";
import { createSavedTypeInfo } from "./savedTypeInfo";

export const flattenGoodTypeInfo = (
  assemblyName: string,
  goodTypeInfos: GoodTypeInfo[]
): {
  typeColumns: TypeColumns[];
  memberColumns: MemberColumns[];
  methodNameColumns: MethodNameColumns[];
  typeNameColumns: TypeNameColumns[];
} => {
  // types

  const typeColumns: TypeColumns[] = goodTypeInfos.map((type) => ({
    assemblyName,
    metadataToken: type.typeId.metadataToken,
    typeInfo: JSON.stringify(createSavedTypeInfo(type)),
  }));

  // members and methods for each type

  const memberColumns: MemberColumns[] = [];
  const methodNameColumns: MethodNameColumns[] = [];

  for (const type of goodTypeInfos) {
    memberColumns.push(
      ...Object.entries(type.members)
        .map(([memberType, memberValues]) =>
          memberValues.map((memberInfo) => ({
            assemblyName,
            // memberType is string[] -- https://github.com/microsoft/TypeScript/pull/12253#issuecomment-263132208
            memberType: memberType as keyof Members,
            typeMetadataToken: type.typeId.metadataToken,
            metadataToken: memberInfo.metadataToken,
            memberInfo: JSON.stringify(memberInfo),
          }))
        )
        .flat()
    );

    methodNameColumns.push(
      ...Object.entries(type.members)
        .filter(([memberType]) => (memberType as keyof Members) == "methodMembers")
        .map(([, memberValues]) =>
          memberValues.map((memberInfo) => ({
            assemblyName,
            name: memberInfo.name,
            metadataToken: memberInfo.metadataToken,
          }))
        )
        .flat()
    );
  }

  // type names

  const typeNameColumns: TypeNameColumns[] = goodTypeInfos.map((typeInfo) => ({
    assemblyName,
    metadataToken: typeInfo.typeId.metadataToken,
    namespace: typeInfo.typeId.namespace ?? null,
    decoratedName: getTypeInfoName(typeInfo),
  }));

  return { typeColumns, memberColumns, methodNameColumns, typeNameColumns };
};
