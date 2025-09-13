declare const __brand: unique symbol;

type Brand<B> = { [__brand]: B };
type Branded<T, B> = T & Brand<B>;

function createBranded<T, B>(value: T): Branded<T, B> {
  return value as Branded<T, B>;
}

export type AssemblyName = Branded<string, "assembly">;
export const createAssemblyName = (name: string): AssemblyName => createBranded<string, "assembly">(name);

export type NamespaceName = Branded<string, "namespace">;
export const createNamespaceName = (name: string): NamespaceName => createBranded<string, "namespace">(name);

export type TypeId = Branded<number, "type">;
export const createTypeId = (id: number): TypeId => createBranded<number, "type">(id);

export type MethodId = Branded<number, "method">;
export const createMethodId = (id: number): MethodId => createBranded<number, "method">(id);
