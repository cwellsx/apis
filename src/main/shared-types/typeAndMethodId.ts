export type TypeAndMethodId = {
  assemblyName: string;
  namespace: string;
  typeId: number;
  methodId: number;
};

export type Call = {
  from: TypeAndMethodId;
  to: TypeAndMethodId;
};
