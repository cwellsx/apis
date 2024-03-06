export type TypeId = {
  assemblyName?: string;
  namespace?: string;
  name: string;
  genericTypeArguments?: TypeId[];
  declaringType?: TypeId;
};
