import { methodNodeId, typeNodeId } from "../../../shared-types";
import { Reflected, validateTypeInfo } from "../../loaded";
import { log, logJson } from "../../log";
import { getOrSet } from "../../shared-types";
import { GetTypeOrMethodName } from "../sqlLoadedApiTypes";
import { CallColumns, CompilerMethodColumns, LocalsTypeColumns } from "./columns";

// this is like a Set<Owner> except is guarantees Owner instance are unique by value, not only by reference,
// because they may come three sources i.e. calls, locals, and parents
class Owners {
  private _array: Owner[] = [];

  private getOnly(): Owner | undefined {
    return this._array.length === 1 ? this._array[0] : undefined;
  }

  resolve(compilerType: number, methods: Map<number, Compiler>): boolean {
    let result = false;
    this._array.forEach((owner, index) => {
      // if this owner is itself called from a different compiler-generated method
      const parents = methods.get(owner.fromMethodId);
      if (!parents) return;
      // and if that method is from a different type
      if (parents.compilerType == compilerType) return false;
      // and if that method has a single (well-defined) owner
      const parent = parents.owners.getOnly();
      if (!parent) return;
      // then remove this owner
      this._array.splice(index, 1);
      // and add the new (from the other method) instead
      this.add(parent);
      // return true to say the collection changed in some way
      result = true;
    });
    return result;
  }

  add(owner: Owner): void {
    if (
      !this._array.some(
        (existing) => existing.fromMethodId == owner.fromMethodId && existing.fromAssemblyName == owner.fromAssemblyName
      )
    )
      this._array.push(owner);
  }

  getFiltered(predicate: (owner: Owner) => boolean): Owner[] {
    return this._array.filter(predicate);
  }
}

type Owner = { fromMethodId: number; fromTypeId: number; fromAssemblyName: string; fromNamespace: string | null };
type Compiler = { compilerType: number; owners: Owners };

const resolve = (methods: Map<number, Compiler>): boolean => {
  let result = false;
  methods.forEach((compiler, method) => {
    const owners = compiler.owners;
    if (owners.resolve(compiler.compilerType, methods)) result = true;
  });
  return result;
};

export const flattenCompilerMethods = (
  reflected: Reflected,
  callColumns: CallColumns[],
  localsTypeColumns: LocalsTypeColumns[],
  allCompilerTypes: Map<string, Set<number>>,
  // not really needed but used for debugged
  getTypeOrMethodName: GetTypeOrMethodName
): CompilerMethodColumns[] => {
  log("flattenCompilerMethods");
  const { getTypeName, getMethodName } = getTypeOrMethodName;

  // create a map of compiler-generated methods in each assembly
  const assemblyCompilerMethods = new Map<string, Map<number, Compiler>>();
  // and a set of compiler-generated types
  const assemblyCompilerTypes = new Map<string, Set<number>>();

  const isCompilerType = (assemblyName: string, metadataToken: number): boolean =>
    allCompilerTypes.get(assemblyName)?.has(metadataToken) ?? false;

  for (const [assemblyName, assemblyInfo] of Object.entries(reflected.assemblies)) {
    const methods = new Map<number, Compiler>();
    assemblyCompilerMethods.set(assemblyName, methods);
    const types = new Set<number>();
    assemblyCompilerTypes.set(assemblyName, types);
    validateTypeInfo(assemblyInfo.types)
      .good.filter((typeInfo) => isCompilerType(assemblyName, typeInfo.typeId.metadataToken))
      // for each good compiler-generated type in the assembly
      .forEach((type) => {
        types.add(type.typeId.metadataToken);
        type.members.methodMembers?.forEach((methodMember) =>
          // map each method to a different Compiler instance (some types' methods are called from different methods)
          methods.set(methodMember.metadataToken, { compilerType: type.typeId.metadataToken, owners: new Owners() })
        );
      });
  }

  // iterate all method calls
  callColumns.forEach((call) => {
    // return if this isn't calling a compiler method
    const methods = assemblyCompilerMethods.get(call.toAssemblyName);
    if (!methods) throw new Error(`Unexpected toAssemblyName ${call.toAssemblyName}`);
    // find Compiler instance by method
    const compiler = methods.get(call.toMethodId);
    if (!compiler) return;
    if (call.fromAssemblyName !== call.toAssemblyName) {
      const fromTypeName = getTypeName(typeNodeId(call.fromAssemblyName, call.fromTypeId));
      const toTypeName = getTypeName(typeNodeId(call.toAssemblyName, call.toTypeId));
      throw new Error("Unexpected inter-assembly call");
    }
    const owner: Owner = {
      fromMethodId: call.fromMethodId,
      fromAssemblyName: call.fromAssemblyName,
      fromNamespace: call.fromNamespace,
      fromTypeId: call.fromTypeId,
    };
    compiler.owners.add(owner);
  });

  // iterate all local types
  localsTypeColumns.forEach((localsType) => {
    const methods = assemblyCompilerMethods.get(localsType.assemblyName);
    if (!methods) throw new Error("Unexpected missing assembly");
    // find all Compiler instances for every method of the compiler type
    [...methods.values()]
      .filter((compiler) => compiler.compilerType == localsType.compilerType)
      .forEach((compiler) => {
        const owner: Owner = {
          fromMethodId: localsType.ownerMethod,
          fromAssemblyName: localsType.assemblyName,
          fromNamespace: localsType.ownerNamespace,
          fromTypeId: localsType.ownerType,
        };
        compiler.owners.add(owner);
      });
  });

  // handle compiler-generated methods calling other compiler-generated methods
  log("resolving compiler types");
  assemblyCompilerMethods.forEach((methods) => {
    while (resolve(methods));
  });
  log("resolved compiler types");

  const result: CompilerMethodColumns[] = [];

  const getCompilerMethodColumns = (
    assemblyName: string,
    compilerMethod: number,
    compiler: Compiler
  ): CompilerMethodColumns => {
    const { compilerType, owners } = compiler;
    // exclude if owner is self or another compiler-generated type
    const predicate = (owner: Owner): boolean =>
      owner.fromTypeId !== compilerType && !isCompilerType(assemblyName, owner.fromTypeId);
    const filtered = owners.getFiltered(predicate);
    if (filtered.length > 1) {
      const strings = filtered.map((found) => {
        const typeName = getTypeName(typeNodeId(found.fromAssemblyName, found.fromTypeId));
        const methodName = getMethodName(methodNodeId(found.fromAssemblyName, found.fromMethodId));
        return `${typeName} - ${methodName}`;
      });
      logJson("Multiple Callers", strings);
    }
    if (filtered.length === 1) {
      const owner = filtered[0];
      return {
        assemblyName,
        compilerType,
        compilerMethod,
        ownerType: owner.fromTypeId,
        ownerMethod: owner.fromMethodId,
        ownerNamespace: owner.fromNamespace,
        info: null,
        error: null,
      };
    } else
      return {
        assemblyName,
        compilerType,
        compilerMethod,
        ownerType: 0,
        ownerMethod: 0,
        ownerNamespace: null,
        info: null,
        error: filtered.length ? "Multiple Callers" : "No Callers",
      };
  };

  assemblyCompilerMethods.forEach((methods, assemblyName) => {
    methods.forEach((compiler, method) => result.push(getCompilerMethodColumns(assemblyName, method, compiler)));
  });

  const assemblyCallers = new Map<string, CallColumns[]>();
  const getCompoundKey = (assemblyName: string, compilerMethod: number) => `${assemblyName}-${compilerMethod}`;
  callColumns.forEach((call) => {
    const found = getOrSet(assemblyCallers, getCompoundKey(call.fromAssemblyName, call.fromMethodId), () => []);
    found.push(call);
  });

  const isSignificant = (assemblyName: string, compilerMethod: number): boolean => {
    const found = assemblyCallers.get(getCompoundKey(assemblyName, compilerMethod));
    if (!found) return false;
    const isSameType = (columns: CallColumns): boolean =>
      columns.fromAssemblyName === columns.toAssemblyName && columns.fromTypeId === columns.toTypeId;
    return found.filter((columns) => !isSameType(columns)).length > 0;
  };

  result.forEach((columns) => {
    if (columns.error === "No Callers" && !isSignificant(columns.assemblyName, columns.compilerMethod)) {
      columns.error = null;
      columns.info = "(insignificant)";
    }
  });

  return result;
};
