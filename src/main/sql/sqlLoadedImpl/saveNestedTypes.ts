import { log } from "../../log";
import { getOrSet, mapOfMaps } from "../../shared-types";
import { NestedTypeColumns } from "./columns";

type Error = { assemblyName: string; nestedType: number; errorMessage: string };

export const saveNestedTypes = (
  assemblyCalls: Map<string, Map<number, { assemblyName: string; methodId: number }[]>>,
  assemblyNestedTypes: Map<string, Map<number, number>>,
  assemblyMethodTypes: Map<string, Map<number, number>>
): { nestedTypeColumns: NestedTypeColumns[]; errors: Error[] } => {
  // a "nested type" is a compiler-generated type which implements anonymous delegates
  // they have methods and are defined outside the method which calls the delegate
  // guess that each is called from only one method
  const ownedByMethods = new Map<string, Map<number, { declaringType: number; owners: Set<number> }>>(
    [...assemblyNestedTypes.entries()].map(([assemblyName, map]) => [
      assemblyName,
      new Map<number, { declaringType: number; owners: Set<number> }>(
        [...map.entries()].map(([nestedType, declaringType]) => [
          nestedType,
          { declaringType, owners: new Set<number>() },
        ])
      ),
    ])
  );

  const assemblyChainedTypes = new Map<string, Map<number, number>>();

  const getMethodType = (assemblyName: string, methodId: number): number => {
    const typeId = assemblyMethodTypes.get(assemblyName)?.get(methodId);
    if (!typeId) throw new Error("Unknown typeId for method");
    return typeId;
  };

  [...assemblyCalls.entries()].forEach(([assemblyName, methodCalls]) =>
    [...methodCalls.entries()].forEach(([caller, allCalled]) => {
      const callerId = +caller;
      // which types is this method calling?
      allCalled.forEach((calledMethod) => {
        const calledType = getMethodType(calledMethod.assemblyName, calledMethod.methodId);
        const wantedTypeId = assemblyNestedTypes.get(assemblyName)?.get(calledType);
        if (!wantedTypeId) return;
        const callerType = getMethodType(assemblyName, callerId);
        if (callerType == calledType) return; // the nested type is calling itself
        if (callerType !== wantedTypeId && assemblyNestedTypes.get(assemblyName)?.get(calledType) === wantedTypeId) {
          // one nested type being called by another ... remember this chain to assert they're in the same method
          const chainedTypes = getOrSet(assemblyChainedTypes, assemblyName, () => new Map<number, number>());
          if (chainedTypes.has(calledType)) {
            throw new Error("calledType is already chained");
          }
          chainedTypes.set(calledType, callerType);
          return;
        }
        // sanity check
        if (calledMethod.assemblyName !== assemblyName || callerType !== wantedTypeId)
          throw new Error("Expect nested type to be called by method within its wanted type");
        // remember this caller method as being this type's owner
        const entry = ownedByMethods.get(assemblyName)?.get(calledType);
        if (!entry) throw new Error("Missing entry in ownedByMethods");
        entry.owners.add(callerId);
        if (entry.owners.size > 1) {
          log("Nested type has more than one owner method");
        }
      });
    })
  );

  const nestedTypeColumns: NestedTypeColumns[] = [];
  const errors: Error[] = [];

  [...ownedByMethods.entries()].forEach(([assemblyName, map]) => {
    [...map.entries()].forEach(([nestedType, entry]) => {
      const getOwner = (): number => {
        switch (entry.owners.size) {
          case 1:
            return [...entry.owners.keys()][0];
          case 0:
            errors.push({ assemblyName, nestedType: nestedType, errorMessage: "No owner method" });
            return 0;
          default:
            errors.push({
              assemblyName,
              nestedType,
              errorMessage: `Multiple owner methods: ${[...entry.owners.keys()].join(", ")}`,
            });
            return 0;
        }
      };

      nestedTypeColumns.push({
        assemblyName,
        nestedType: nestedType,
        declaringType: entry.declaringType,
        declaringMethod: getOwner(),
      });
    });
  });

  const results = mapOfMaps(nestedTypeColumns.map((columns) => [columns.assemblyName, columns.nestedType, columns]));

  // const getChainedMethod = (assemblyName: string, nestedType: number): number|undefined {
  //   let chainedType = assemblyChainedTypes.get(assemblyName)?.get(nestedType);
  // }

  [...assemblyChainedTypes.entries()].forEach(([assemblyName, chainedTypes]) => {
    [...chainedTypes.entries()].forEach(([callerType, calledTypes]) => {
      //
    });
  });

  return { nestedTypeColumns, errors };
};
