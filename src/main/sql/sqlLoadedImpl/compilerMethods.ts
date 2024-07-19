import { methodNodeId, typeNodeId } from "../../../shared-types";
import { getMembers, isNamedTypeInfo, Reflected } from "../../loaded";
import { log, logJson } from "../../log";
import { getOrSet } from "../../shared-types";
import { GetTypeOrMethodName } from "../sqlLoadedApiTypes";
import { CallColumns, CompilerMethodColumns, LocalsTypeColumns } from "./columns";

// use Inspected with Watch to debug specific metadataToken values displayed within errors on the compiler view
// - add the typeId and methodId of the method in error, to the array of Inspected instances
// - if that's not enough info then also add other methods, which call it, or which contain it as a local variable

type Inspected = { assemblyName: string; typeId: number; methodId: number };
const inspected: Inspected[] = [
  { assemblyName: "Core", typeId: 0, methodId: 100663330 },
  // { assemblyName: "Newtonsoft.Json", typeId: 33554886, methodId: 100667314 },
  // { assemblyName: "Newtonsoft.Json", typeId: 33554886, methodId: 100667320 },
  // { assemblyName: "Newtonsoft.Json", typeId: 33554886, methodId: 100667312 },
];

type Owner = { fromMethodId: number; fromTypeId: number; fromAssemblyName: string; fromNamespace: string | null };
type Compiler = { typeId: number; isCompilerType: boolean; owners: Owners };
type IsOwner = (owner: Owner) => boolean;

// this is like a Set<Owner> except is guarantees Owner instance are unique by value, not only by reference,
// because they may come three sources i.e. calls, locals, and parents
class Owners {
  private _array: Owner[] = [];

  resolve(methods: Map<number, Compiler>, isOwner: IsOwner): boolean {
    let result = false;
    this._array.forEach((owner, index) => {
      // if this owner is itself called from a different compiler-generated method
      const parent = methods.get(owner.fromMethodId);
      if (!parent) return;
      // and if that method has a single (well-defined) owner
      const parentOwners = parent.owners.result(isOwner);
      if (parentOwners.length !== 1) return;
      const parentOwner = parentOwners[0];
      if (!parentOwner) return;
      // and if that's not the same as the current owner
      if (parentOwner.fromMethodId === owner.fromMethodId) return;
      // then remove this owner
      this._array.splice(index, 1);
      // and add the new (from the other method) instead
      this.add(parentOwner);
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

  contradicts(owner: Owner, isOwner: IsOwner): boolean {
    return this.result(isOwner).some(
      (existing) => existing.fromAssemblyName !== owner.fromAssemblyName || existing.fromMethodId !== owner.fromMethodId
    );
  }

  result(isOwner: IsOwner) {
    // exclude if owner is self or another compiler-generated type
    return this._array.filter(isOwner);
  }

  all(): Owner[] {
    return this._array;
  }
}

type Watch = {
  isInspectedMethod: (assemblyName: string, methodId: number) => boolean;
  isInspectedType: (assemblyName: string, typeId: number) => boolean;
  logMethod: (assemblyName: string, typeIdId: number, methodId: number) => void;
  logCall: (call: CallColumns) => void;
  logLocals: (localsType: LocalsTypeColumns) => void;
  logOwners: (message: string, owners: Owner[]) => void;
  inspectCall: (call: CallColumns) => void;
  inspectLocals: (localsType: LocalsTypeColumns) => void;
  inspectOwners: (message: string, assemblyName: string, methodId: number, compiler: Compiler) => void;
};

const createWatch = (getTypeOrMethodName: GetTypeOrMethodName): Watch => {
  const { getTypeName, getMethodName } = getTypeOrMethodName;

  const isInspectedMethod = (assemblyName: string, methodId: number): boolean =>
    inspected.some((found) => found.assemblyName === assemblyName && found.methodId === methodId);
  const isInspectedType = (assemblyName: string, typeId: number): boolean =>
    inspected.some((found) => found.assemblyName === assemblyName && found.typeId === typeId);

  const getName = (assemblyName: string, typeId: number, methodId: number) => {
    const typeName = getTypeName(typeNodeId(assemblyName, typeId));
    const methodName = getMethodName(methodNodeId(assemblyName, methodId));
    return `${typeName} (${typeId}) ${methodName} (${methodId})`;
  };

  const logMethod = (assemblyName: string, typeIdId: number, methodId: number): void => {
    if (isInspectedType(assemblyName, typeIdId) || isInspectedMethod(assemblyName, methodId))
      logJson("method", getName(assemblyName, typeIdId, methodId));
  };

  const logCall = (call: CallColumns): void =>
    logJson("call", [
      getName(call.fromAssemblyName, call.fromTypeId, call.fromMethodId),
      getName(call.toAssemblyName, call.toTypeId, call.toMethodId),
    ]);

  const logLocals = (localsType: LocalsTypeColumns): void =>
    logJson("locals", [
      getName(localsType.assemblyName, localsType.ownerType, localsType.ownerMethod),
      `${getTypeName(typeNodeId(localsType.assemblyName, localsType.compilerType))} (${localsType.compilerType})`,
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
      logOwners(`${message}(${getName(assemblyName, compiler.typeId, methodId)})`, compiler.owners.all());
  };

  return {
    isInspectedMethod,
    isInspectedType,
    logMethod,
    logCall,
    logLocals,
    logOwners,
    inspectCall,
    inspectLocals,
    inspectOwners,
  };
};

export const flattenCompilerMethods = (
  reflected: Reflected,
  callColumns: CallColumns[],
  localsTypeColumns: LocalsTypeColumns[],
  allCompilerTypes: Map<string, Set<number>>,
  allCompilerMethods: Map<string, Set<number>>,
  // not really needed but used for debugged
  getTypeOrMethodName: GetTypeOrMethodName
): CompilerMethodColumns[] => {
  log("flattenCompilerMethods");

  // this is only to help debug
  const watch = createWatch(getTypeOrMethodName);

  // but this is used in the algorithm
  const isCtor = (assemblyName: string, methodId: number) =>
    getTypeOrMethodName.getMethodName(methodNodeId(assemblyName, methodId)) === ".ctor";

  // create a map of compiler-generated methods in each assembly
  const assemblyCompilerMethods = new Map<string, Map<number, Compiler>>();

  const getIsCompilerType = (assemblyName: string, metadataToken: number): boolean =>
    allCompilerTypes.get(assemblyName)?.has(metadataToken) ?? false;

  const getIsCompilerMethod = (assemblyName: string, metadataToken: number): boolean =>
    allCompilerMethods.get(assemblyName)?.has(metadataToken) ?? false;

  const getIsOwner = (assemblyName: string, compilerMethod: number): IsOwner => {
    return (owner: Owner) =>
      !getIsCompilerType(assemblyName, owner.fromTypeId) &&
      // this is to ignore self-recursive calls
      owner.fromMethodId !== compilerMethod;
  };

  for (const [assemblyName, assemblyInfo] of Object.entries(reflected.assemblies)) {
    const methods = new Map<number, Compiler>();
    assemblyCompilerMethods.set(assemblyName, methods);
    assemblyInfo.types
      .filter(isNamedTypeInfo)
      //.filter((typeInfo) => isCompilerType(assemblyName, typeInfo.typeId.metadataToken))
      // for each good compiler-generated type in the assembly
      .forEach((type) => {
        const isCompilerType = getIsCompilerType(assemblyName, type.typeId.metadataToken);
        getMembers(type)
          .methodMembers?.filter(
            (methodMember) => isCompilerType || getIsCompilerMethod(assemblyName, methodMember.metadataToken)
          )
          .forEach((methodMember) => {
            watch.logMethod(assemblyName, type.typeId.metadataToken, methodMember.metadataToken);
            // map each method to a different Compiler instance (some types' methods are called from different methods)
            methods.set(methodMember.metadataToken, {
              typeId: type.typeId.metadataToken,
              isCompilerType,
              owners: new Owners(),
            });
          });
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
      .filter((compiler) => compiler.typeId == localsType.compilerType)
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
        if (watch.isInspectedMethod(assemblyName, methodId)) {
          log("resolving watched method"); // put a breakpoint here to step through the resolve method
        }
        const isOwner = getIsOwner(assemblyName, methodId);
        if (owners.resolve(methods, isOwner)) {
          watch.inspectOwners("resolved", assemblyName, methodId, compiler);
          result = true;
        }
      });
      if (!result) break;
      result = false;
    }
  });

  // handle class with well-known system interfaces which are instantiated and passed to a system method
  // so that one of the compiler-generated methods is called from within the system e.g. MoveNext
  log("resolving system interfaces");
  assemblyCompilerMethods.forEach((methods, assemblyName) => {
    methods.forEach((compiler, methodId) => {
      if (watch.isInspectedMethod(assemblyName, methodId)) {
        log("resolving(2) watched method"); // put a breakpoint here to step through the resolve method
      }
      const isOwner = getIsOwner(assemblyName, methodId);
      if (compiler.owners.result(isOwner).length > 0) return;
      // get the other methods for this type
      const others = [...methods.entries()].filter(([, other]) => compiler.typeId === other.typeId);
      // find the .ctor and its only owner
      const ctor = others.find(([methodId]) => isCtor(assemblyName, methodId));
      if (!ctor) return;
      const owners = ctor[1].owners.result(isOwner);
      if (owners.length !== 1) return;
      const owner = owners[0];
      // verify that's not contradicted by the owner of any other method
      if (others.some(([, compiler]) => compiler.owners.contradicts(owner, isOwner))) return;
      // use the owner of the constructor
      compiler.owners.add(owner);
    });
  });

  const result: CompilerMethodColumns[] = [];

  const getCompilerMethodColumns = (
    assemblyName: string,
    compilerMethod: number,
    compiler: Compiler
  ): CompilerMethodColumns => {
    if (watch.isInspectedMethod(assemblyName, compilerMethod)) {
      log("resulting watched method"); // put a breakpoint here to step through the resolve method
    }
    const { typeId: compilerType, owners } = compiler;
    const isOwner = getIsOwner(assemblyName, compilerMethod);
    const filtered = owners.result(isOwner);

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
