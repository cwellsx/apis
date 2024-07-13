import { methodNodeId, typeNodeId } from "../../../shared-types";
import { Reflected, validateTypeInfo } from "../../loaded";
import { log, logJson } from "../../log";
import { getOrSet } from "../../shared-types";
import { GetTypeOrMethodName } from "../sqlLoadedApiTypes";
import { CallColumns, CompilerMethodColumns, LocalsTypeColumns } from "./columns";

type Owner = { fromMethodId: number; fromTypeId: number; fromAssemblyName: string; fromNamespace: string | null };
type Compiler = { compilerType: number; owners: Owners };

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

      // and if that method has a single (well-defined) owner
      const parent = parents.owners.getOnly();
      if (!parent) return;
      // and if that's not the same as the current owner
      if (parent.fromMethodId === owner.fromMethodId) return;
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

  get array(): Owner[] {
    return this._array;
  }
}

// use inspected and watch to debug specific metadataToken values displayed within errors on the compiler view

const createInspected = (): {
  isInspectedMethod: (assemblyName: string, methodId: number) => boolean;
  isInspectedType: (assemblyName: string, typeId: number) => boolean;
} => {
  type Inspected = { assemblyName: string; typeId: number; methodId: number };
  const inspected: Inspected[] = [
    { assemblyName: "ElectronCgi.DotNet", typeId: 33554498, methodId: 100663539 },
    { assemblyName: "ElectronCgi.DotNet", typeId: 0, methodId: 100663527 },
  ];

  const isInspectedMethod = (assemblyName: string, methodId: number): boolean =>
    inspected.some((found) => found.assemblyName === assemblyName && found.methodId === methodId);
  const isInspectedType = (assemblyName: string, typeId: number): boolean =>
    inspected.some((found) => found.assemblyName === assemblyName && found.typeId === typeId);
  return { isInspectedMethod, isInspectedType };
};

const createWatch = (
  getTypeOrMethodName: GetTypeOrMethodName
): {
  logCall: (call: CallColumns) => void;
  logLocals: (localsType: LocalsTypeColumns) => void;
  logOwners: (message: string, owners: Owner[]) => void;
  inspectCall: (call: CallColumns) => void;
  inspectLocals: (localsType: LocalsTypeColumns) => void;
  inspectOwners: (message: string, assemblyName: string, methodId: number, compiler: Compiler) => void;
} => {
  const { getTypeName, getMethodName } = getTypeOrMethodName;
  const { isInspectedMethod, isInspectedType } = createInspected();

  const getName = (assemblyName: string, typeId: number, methodId: number) => {
    const typeName = getTypeName(typeNodeId(assemblyName, typeId));
    const methodName = getMethodName(methodNodeId(assemblyName, methodId));
    return `${typeName}.${methodName} (${methodId})`;
  };

  const logCall = (call: CallColumns): void =>
    logJson("call", [
      getName(call.fromAssemblyName, call.fromTypeId, call.fromMethodId),
      getName(call.toAssemblyName, call.toTypeId, call.toMethodId),
    ]);

  const logLocals = (localsType: LocalsTypeColumns): void =>
    logJson("locals", [
      getName(localsType.assemblyName, localsType.ownerType, localsType.ownerMethod),
      getTypeName(typeNodeId(localsType.assemblyName, localsType.compilerType)),
    ]);

  const logOwners = (message: string, owners: Owner[]): void => {
    logJson(
      message,
      owners.map((owner) => getName(owner.fromAssemblyName, owner.fromTypeId, owner.fromMethodId))
    );
  };

  const inspectCall = (call: CallColumns): void => {
    if (
      isInspectedMethod(call.fromAssemblyName, call.fromMethodId) ||
      isInspectedMethod(call.toAssemblyName, call.toMethodId) ||
      isInspectedType(call.fromAssemblyName, call.fromTypeId) ||
      isInspectedType(call.toAssemblyName, call.toTypeId)
    )
      logCall(call);
  };

  const inspectLocals = (localsType: LocalsTypeColumns): void => {
    if (
      isInspectedMethod(localsType.assemblyName, localsType.ownerMethod) ||
      isInspectedType(localsType.assemblyName, localsType.compilerType)
    )
      logLocals(localsType);
  };

  const inspectOwners = (message: string, assemblyName: string, methodId: number, compiler: Compiler): void => {
    if (isInspectedMethod(assemblyName, methodId))
      logOwners(`${message}(${getName(assemblyName, compiler.compilerType, methodId)})`, compiler.owners.array);
  };

  return { logCall, logLocals, logOwners, inspectCall, inspectLocals, inspectOwners };
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

  // this is only the help debug
  const watch = createWatch(getTypeOrMethodName);

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
    watch.inspectCall(call);
    // return if this isn't calling a compiler method
    const methods = assemblyCompilerMethods.get(call.toAssemblyName);
    if (!methods) throw new Error(`Unexpected toAssemblyName ${call.toAssemblyName}`);
    // find Compiler instance by method
    const compiler = methods.get(call.toMethodId);
    if (!compiler) return;
    if (call.fromAssemblyName !== call.toAssemblyName) {
      watch.logCall(call);
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
    watch.inspectLocals(localsType);
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
  assemblyCompilerMethods.forEach((methods, assemblyName) => {
    // inspect the owners before resolving them
    [...methods.entries()].forEach(([methodId, compiler]) =>
      watch.inspectOwners("initial", assemblyName, methodId, compiler)
    );

    // resolve repeatedly until no more changes
    for (;;) {
      let result = false;
      methods.forEach((compiler, methodId) => {
        const owners = compiler.owners;
        if (methodId == 100663990) {
          log("found");
        }
        if (owners.resolve(compiler.compilerType, methods)) {
          watch.inspectOwners("resolved", assemblyName, methodId, compiler);
          result = true;
        }
      });
      if (!result) break;
      result = false;
    }
  });
  log("resolved compiler types");

  const result: CompilerMethodColumns[] = [];

  const getCompilerMethodColumns = (
    assemblyName: string,
    compilerMethod: number,
    compiler: Compiler
  ): CompilerMethodColumns => {
    const { compilerType, owners } = compiler;
    const filtered = owners.array.filter(
      // exclude if owner is self or another compiler-generated type
      (owner) => owner.fromTypeId !== compilerType && !isCompilerType(assemblyName, owner.fromTypeId)
    );
    if (filtered.length > 1) {
      watch.logOwners("Multiple Callers", filtered);
      log("Multiple Callers");
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
