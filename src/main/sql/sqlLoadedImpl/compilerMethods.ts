import { GoodTypeInfo, Reflected, validateTypeInfo } from "../../loaded";
import { CallColumns, CompilerMethodColumns } from "./columns";

type Owner = { fromMethodId: number; fromTypeId: number; fromNamespace: string };
type Compiler = { compilerType: number; owners: Set<Owner> };

const isCompilerGeneratedAttribute = (attribute: string): boolean =>
  attribute === "[System.Runtime.CompilerServices.CompilerGeneratedAttribute]";

const isCompilerGeneratedType = (typeInfo: GoodTypeInfo): boolean =>
  typeInfo.attributes?.some(isCompilerGeneratedAttribute) ?? false;

const getOnlyOwner = (set: Set<Owner>): Owner | undefined => {
  let result: Owner | undefined = undefined;
  for (const owner of set) {
    if (result) return undefined;
    result = owner;
  }
  return result;
};

const resolve = (methods: Map<number, Compiler>): boolean => {
  const containsOwner = (set: Set<Owner>, newOwner: Owner): boolean => {
    for (const owner of set) if (owner.fromMethodId === newOwner.fromMethodId) return true;
    return false;
  };

  let result = false;
  methods.forEach((compiler, method) => {
    const owners = compiler.owners;
    owners.forEach((owner) => {
      const parents = methods.get(owner.fromMethodId);
      if (!parents) return;
      const parent = getOnlyOwner(parents.owners);
      if (!parent) return;
      owners.delete(owner);
      if (!containsOwner(owners, parent)) owners.add({ ...parent });
      result = true;
    });
  });
  return result;
};

export const flattenCompilerMethods = (reflected: Reflected, callColumns: CallColumns[]): CompilerMethodColumns[] => {
  // create a map of compiler-generated methods in each assembly
  const assemblyMethods = new Map<string, Map<number, Compiler>>();

  for (const [assemblyName, assemblyInfo] of Object.entries(reflected.assemblies)) {
    const methods = new Map<number, Compiler>();
    assemblyMethods.set(assemblyName, methods);
    validateTypeInfo(assemblyInfo.types)
      .good.filter(isCompilerGeneratedType)
      .forEach((type) =>
        type.members.methodMembers?.forEach((methodMember) =>
          methods.set(methodMember.metadataToken, { compilerType: type.typeId.metadataToken, owners: new Set<Owner>() })
        )
      );
  }

  // iterate all method calls
  callColumns.forEach((call) => {
    // return if this isn't calling a compiler method
    const methods = assemblyMethods.get(call.toAssemblyName);
    if (!methods) throw new Error(`Unexpected toAssemblyName ${call.toAssemblyName}`);
    const compiler = methods.get(call.toMethodId);
    if (!compiler) return;
    if (call.fromAssemblyName !== call.toAssemblyName) throw new Error("Unexpected inter-assembly call");
    const owner: Owner = {
      fromMethodId: call.fromMethodId,
      fromNamespace: call.fromNamespace,
      fromTypeId: call.fromTypeId,
    };
    compiler.owners.add(owner);
  });

  // handle compiler-generated methods calling other compiler-generated methods
  assemblyMethods.forEach((methods) => {
    while (resolve(methods));
  });

  const result: CompilerMethodColumns[] = [];

  const getCompilerMethodColumns = (
    assemblyName: string,
    compilerMethod: number,
    compiler: Compiler
  ): CompilerMethodColumns => {
    const { compilerType, owners } = compiler;
    const owner = getOnlyOwner(owners);
    if (owner)
      return {
        assemblyName,
        compilerType,
        compilerMethod,
        ownerType: owner.fromTypeId,
        ownerMethod: owner.fromMethodId,
        ownerNamespace: owner.fromNamespace,
        error: null,
      };
    else
      return {
        assemblyName,
        compilerType,
        compilerMethod,
        ownerType: 0,
        ownerMethod: 0,
        ownerNamespace: null,
        error: owners.size ? "Multiple Callers" : "No Callers",
      };
  };

  assemblyMethods.forEach((methods, assemblyName) => {
    methods.forEach((compiler, method) => result.push(getCompilerMethodColumns(assemblyName, method, compiler)));
  });

  return result;
};
