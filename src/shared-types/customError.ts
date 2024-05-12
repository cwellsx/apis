export type CustomError = {
  messages: string[];
  elementJson: string;
};

export const isCustomError = (value: unknown): value is CustomError =>
  !!value &&
  typeof value === "object" &&
  Object.keys(value).includes("messages") &&
  Object.keys(value).includes("elementJson");
