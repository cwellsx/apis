export type MethodError = {
  heading: "Error" | "Warning";
  message: string;
  objects: object[];
};

export type MethodBody = {
  title: {
    assemblyName: string;
    typeName: string;
    methodName: string;
  };
  asText: string;
  errors?: MethodError[];
  detailType: "methodBody";
};
