import type { GoodTypeInfo, NamedTypeInfo, Reflected } from "../../loaded";
import { badTypeInfo, namedTypeInfo, validateTypeInfo } from "../../loaded";
import { Tables } from "./tables";

import { log } from "../../log";
import { uniqueStrings } from "../../shared-types";

import type { ErrorColumns } from "./columns";
import { flattenGoodTypeInfo } from "./flattenGoodTypeInfo";
import { flattenMethodDictionary } from "./flattenMethodDictionary";
import { flattenNamedTypeInfo } from "./flattenNamedTypeInfo";
import { getMethodTypeId, GetTypeId } from "./getMethodTypeId";
import { widenWantedMethods } from "./widenWantedMethods";

/*
  Save the namespace in CallColumns, because that is:
  - Complicated to calculate
  - Needed for select by open namespace
  - Not in the Reflected JSON because it would increase the size of the JSON and the complexity of the C#

  Therefore writing CallColumns requires MapMethodTypes data, but CallColumns cannot be sorted by assembly,
  so do all reflected.assemblies to get MapMethodTypes before doing any reflected.assemblyMethods
*/

const saveGoodTypeInfo = (assemblyName: string, good: GoodTypeInfo[], table: Tables): void => {
  const { typeColumns, memberColumns, methodNameColumns, typeNameColumns } = flattenGoodTypeInfo(assemblyName, good);

  table.typeName.insertMany(typeNameColumns);
  table.type.insertMany(typeColumns);
  table.member.insertMany(memberColumns);
  table.methodName.insertMany(methodNameColumns);
};

const saveNamedTypeInfo = (assemblyName: string, named: NamedTypeInfo[], table: Tables): void => {
  const { declaringTypeColumns, wantedTypeColumns } = flattenNamedTypeInfo(assemblyName, named);

  table.declaringType.insertMany(declaringTypeColumns);
  table.wantedType.insertMany(wantedTypeColumns);
};

export const save = (reflected: Reflected, table: Tables): void => {
  log("save reflected.assemblies");

  for (const [assemblyName, assemblyInfo] of Object.entries(reflected.assemblies)) {
    const allTypeInfo = validateTypeInfo(assemblyInfo.types);

    // BadTypeInfo[]
    const badTypeInfos = badTypeInfo(allTypeInfo);
    if (badTypeInfos.length) {
      table.error.insert({ assemblyName, badTypeInfos, badMethodInfos: [] });
    }

    // GoodTypeInfo[]
    saveGoodTypeInfo(assemblyName, allTypeInfo.good, table);

    // NamedTypeInfo[]
    saveNamedTypeInfo(assemblyName, namedTypeInfo(allTypeInfo), table);

    // referencedAssemblies[]
    table.assembly.insert({
      assemblyName,
      // uniqueStrings because I've unusually seen an assembly return two references to the same assembly name
      references: uniqueStrings(assemblyInfo.referencedAssemblies),
    });
  }

  log("save reflected.assemblyMethods");

  const getTypeId: GetTypeId = getMethodTypeId(table);

  const { setWantedMethods, updateWantedTypes } = widenWantedMethods(table);

  for (const [assemblyName, methodDictionary] of Object.entries(reflected.assemblyMethods)) {
    const { callColumns, methodColumns, badMethodInfos } = flattenMethodDictionary(
      assemblyName,
      methodDictionary,
      getTypeId
    );

    // => errorsTable
    if (badMethodInfos.length) {
      const found = table.error.selectOne({ assemblyName });
      const columns: ErrorColumns = {
        assemblyName,
        badTypeInfos: found?.badTypeInfos ?? [],
        badMethodInfos,
      };
      if (found) table.error.update(columns);
      else table.error.insert(columns);
    }

    // => MethodColumns[]
    table.method.insertMany(methodColumns);

    // => CallColumns[]
    table.call.insertMany(callColumns);

    setWantedMethods(assemblyName, callColumns);
  }

  updateWantedTypes();
};
