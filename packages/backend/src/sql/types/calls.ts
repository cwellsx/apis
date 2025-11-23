export type TypeAndMethodId = {
  // TODO use Branded types instead of primitive string and number
  assemblyName: string;
  namespace: string;
  typeId: number;
  methodId: number;
};

export type Call = { from: TypeAndMethodId; to: TypeAndMethodId };
