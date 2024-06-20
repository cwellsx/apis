import type { GoodTypeInfo, MethodDictionary, Reflected } from "../../loaded";
import { badTypeInfo, validateTypeInfo } from "../../loaded";
import { Tables } from "./tables";

import { log } from "../../log";
import { uniqueStrings } from "../../shared-types";

import type { ErrorColumns } from "./columns";
import { flattenGoodTypeInfo } from "./flattenGoodTypeInfo";
import { flattenMethodDictionary } from "./flattenMethodDictionary";
import { GetCallColumns, widenCallColumns } from "./widenCallColumns";

/*
  Save the namespace in CallColumns, because that is:
  - Complicated to calculate
  - Needed for select by open namespace
  - Not in the Reflected JSON because it would increase the size of the JSON and the complexity of the C#

  Therefore writing CallColumns requires MapMethodTypes data, but CallColumns cannot be sorted by assembly,
  so do all reflected.assemblies to get MapMethodTypes before doing any reflected.assemblyMethods
*/

const saveReflectedAssemblies = (assemblyName: string, good: GoodTypeInfo[], table: Tables): void => {
  // GoodTypeInfo[]
  const { typeColumns, memberColumns, methodNameColumns, typeNameColumns } = flattenGoodTypeInfo(assemblyName, good);

  // => typeNameTable
  table.typeName.insertMany(typeNameColumns);
  // => typeTable
  table.type.insertMany(typeColumns);
  // => memberTable
  table.member.insertMany(memberColumns);
  // => methodNameTable
  table.methodName.insertMany(methodNameColumns);
};

type AssemblyMethods = [assemblyName: string, methodDictionary: MethodDictionary];
const saveAssemblyMethods = (allAssemblyMethods: AssemblyMethods[], table: Tables): void => {
  const getCallColumns: GetCallColumns = widenCallColumns(table);

  for (const [assemblyName, methodDictionary] of allAssemblyMethods) {
    const { methodCalls, methods, badCallDetails } = flattenMethodDictionary(assemblyName, methodDictionary);

    // => errorsTable
    if (badCallDetails.length) {
      const found = table.error.selectOne({ assemblyName });
      const columns: ErrorColumns = {
        assemblyName,
        badTypeInfos: found?.badTypeInfos ?? JSON.stringify([]),
        badCallDetails: JSON.stringify(badCallDetails),
      };
      if (found) table.error.update(columns);
      else table.error.insert(columns);
    }

    // => methodTable
    table.method.insertMany(methods);

    const callColumns = methodCalls
      .map(([fromMethodId, calls]) =>
        calls.map(({ assemblyName: toAssemblyName, methodId: toMethodId }) =>
          getCallColumns(assemblyName, fromMethodId, toAssemblyName, toMethodId)
        )
      )
      .flat();

    // => call
    table.call.insertMany(callColumns);
  }
};

export const save = (reflected: Reflected, table: Tables): void => {
  log("save reflected.assemblies");

  // // map methodId to typeId
  // // { [assemblyName: string]: { [methodId: number]: number } } = {};
  // const assemblyMethodTypes = new Map<string, Map<number, number>>();

  // // map typeId to TypeNameColumns
  // // { [assemblyName: string]: { [typeId: number]: TypeNameColumns } } = {};
  // const assemblyTypeNames = new Map<string, Map<number, TypeNameColumns>>();

  // // map nestedTypeId to declaringType
  // // { [assemblyName: string]: { [nestedTypeId: number]: number } } = {};
  // const assemblyNestedTypes = new Map<string, Map<number, number>>();

  // const assemblyTypeIds: TypeNodeId[] = [];

  for (const [assemblyName, assemblyInfo] of Object.entries(reflected.assemblies)) {
    const allTypeInfo = validateTypeInfo(assemblyInfo.types);

    // BadTypeInfo[]
    const bad = badTypeInfo(allTypeInfo);
    if (bad.length) {
      table.error.insert({ assemblyName, badTypeInfos: JSON.stringify(bad), badCallDetails: JSON.stringify([]) });
    }

    // GoodTypeInfo[]
    saveReflectedAssemblies(assemblyName, allTypeInfo.good, table);

    // referencedAssemblies[]
    table.assembly.insert({
      assemblyName,
      // uniqueStrings because I've unusually seen an assembly return two references to the same assembly name
      references: JSON.stringify(uniqueStrings(assemblyInfo.referencedAssemblies)),
    });
  }

  log("save reflected.assemblyMethods");
  saveAssemblyMethods(Object.entries(reflected.assemblyMethods), table);

  // // [assemblyName: string]: { [methodId: number]: { assemblyName: string; methodId: number }[] };
  // const assemblyCalls = new Map<string, Map<number, { assemblyName: string; methodId: number }[]>>();

  // for (const [assemblyName, methodDictionary] of Object.entries(reflected.assemblyMethods)) {
  //   const { methodCalls, methods, badCallDetails } = flattenMethodDictionary(assemblyName, methodDictionary);

  //   assemblyCalls.set(assemblyName, new Map<number, { assemblyName: string; methodId: number }[]>(methodCalls));

  //   // => errorsTable
  //   if (badCallDetails.length) {
  //     const found = table.error.selectOne({ assemblyName });
  //     const columns: ErrorColumns = {
  //       assemblyName,
  //       badTypeInfos: found?.badTypeInfos ?? JSON.stringify([]),
  //       badCallDetails: JSON.stringify(badCallDetails),
  //     };
  //     if (found) table.error.update(columns);
  //     else table.error.insert(columns);
  //   }

  //   // => methodTable
  //   table.method.insertMany(methods);
  // }

  // const getTypeId = (assemblyName: string, methodId: number): { namespace: string; typeId: number } => {
  //   // get typeId from methodId
  //   const typeId = assemblyMethodTypes.get(assemblyName)?.get(methodId);
  //   if (!typeId) throw new Error("typeId not found");
  //   // get namespace and wantedTypeId from typeId
  //   const found = assemblyTypeNames.get(assemblyName)?.get(typeId);
  //   if (!found) throw new Error("typeName not found");
  //   return {
  //     namespace: found.namespace ?? "(no namespace)",
  //     typeId: found.wantedTypeId ?? found.metadataToken,
  //   };
  // };

  // const callColumns: CallColumns[] = [];
  // [...assemblyCalls.entries()].forEach(([assemblyName, methodCalls]) =>
  //   [...methodCalls.entries()].forEach(([key, calls]) => {
  //     const methodId = +key;
  //     const { namespace: fromNamespace, typeId: fromTypeId } = getTypeId(assemblyName, methodId);
  //     calls.forEach((called) => {
  //       const { namespace: toNamespace, typeId: toTypeId } = getTypeId(called.assemblyName, called.methodId);
  //       callColumns.push({
  //         fromAssemblyName: assemblyName,
  //         fromNamespace,
  //         fromTypeId,
  //         fromMethodId: methodId,
  //         toAssemblyName: called.assemblyName,
  //         toNamespace,
  //         toTypeId,
  //         toMethodId: called.methodId,
  //       });
  //     });
  //   })
  // );

  // table.call.insertMany(callColumns);
};
