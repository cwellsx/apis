import { randomUUID } from "crypto";
import os from "os";
import { CustomError } from "../shared-types";
import { remove } from "./shared-types";

type CustomDependency = { id: string; label: string } & { [key: string]: boolean };

type CustomFields = {
  id: string;
  label?: string;
  tags?: string[];
  layer?: string; // new
  shape?: string; // new
  details?: string[]; // new
  dependencies: CustomDependency[];
};

export type CustomNode = CustomFields & { [key: string]: string | number };

export const isAnyOtherCustomField = (key: string): boolean =>
  ![
    "id",
    "label",
    "tags",
    "dependencies",
    "details", // new
  ].includes(key);

const isString = (value: unknown): boolean => typeof value === "string";
const isNumber = (value: unknown): boolean => typeof value === "number";
const isBoolean = (value: unknown): boolean => typeof value === "boolean";

const precondition = (element: unknown): boolean => !!element && typeof element === "object";

const jsonStringify = (element: unknown) => JSON.stringify(element, null, " ");
const createCustomError = (element: CustomNode, message: string): CustomError => ({
  messages: [message],
  elementJson: jsonStringify(element),
});

const findAndFixErrors = (element: CustomNode): CustomError | undefined => {
  const customError: CustomError = {
    messages: [],
    elementJson: jsonStringify(element),
  };

  const error = (message: string) => customError.messages.push(message);

  const assertAnyOtherFields = (o: object, isExpected: (value: unknown) => boolean): void =>
    Object.entries(o).forEach(([key, value]) => {
      if (!isAnyOtherCustomField(key) || isExpected(value)) return;
      error(`Unexpected non-scalar value type for key ${key}`);
      delete element[key];
    });

  if (!element.id || !isString(element.id)) {
    error("Missing id");
    element.id = randomUUID();
  }
  if (!element.dependencies) {
    error("Missing dependencies");
    element.dependencies = [];
  }
  if (!Array.isArray(element.dependencies)) {
    error("Non-array dependencies");
    element.dependencies = [];
  }
  if (element.tags) {
    if (!Array.isArray(element.tags)) {
      error("Non-array tags");
      delete element["tags"];
      return;
    }
    if (!element.tags.every((tag) => isString(tag))) {
      error("Non-string tags");
      delete element["tags"];
      return;
    }
  }

  assertAnyOtherFields(element, (value) => isNumber(value) || isString(value));

  const dependencies: unknown[] = element.dependencies;
  dependencies.slice().forEach((item: unknown) => {
    if (!precondition(item)) {
      error("Dependency is not an object");
      remove(dependencies, item);
      return;
    }
    const dependency = item as CustomDependency;
    if (!dependency.id || !isString(dependency.id)) {
      error("Missing dependency id");
      remove(dependencies, item);
    }
    if (!dependency.label || !isString(dependency.label)) {
      error("Missing dependency label");
      dependency.label = dependency.id;
    }
    assertAnyOtherFields(dependency, isBoolean);
  });

  return customError.messages.length ? customError : undefined;
};

export const fixCustomJson = (nodes: CustomNode[]): CustomError[] => {
  const customErrors: CustomError[] = [];
  nodes.slice().forEach((element) => {
    if (!precondition(element)) {
      remove(nodes, element);
      customErrors.push(createCustomError(element, "Node is not an object"));
      return;
    }
    const error = findAndFixErrors(element);
    if (error) customErrors.push(error);
  });

  // get all the ids
  const ids = new Set<string>();
  nodes.forEach((node) => {
    if (ids.has(node.id)) {
      customErrors.push(createCustomError(node, "Node id is not unique"));
      node.id = randomUUID();
    } else ids.add(node.id);
  });
  // assert the ids in the dependencies
  nodes.forEach((node) => {
    node.dependencies.forEach((dependency) => {
      if (!ids.has(dependency.id))
        customErrors.push(createCustomError(node, `Dependency id "${dependency.id}" is unknown`));
    });
  });

  return customErrors;
};

export const isCustomJson = (json: unknown): json is CustomNode[] => {
  if (!json) throw new Error("Expect json is truthy");
  if (!Array.isArray(json)) throw new Error("Expect json is array");
  if (!json.length) throw new Error("Expect json array is not empty");
  const first = json[0];
  if (!precondition(first)) throw new Error("Expect json array of objects");

  // do the validation is two stages
  // 1. here, return true or false depending on whether the first node is error-free
  // 2. later, sanitize all the nodes, correct them if needed, return error messages
  const customError = findAndFixErrors(first as CustomNode);

  if (customError) throw new Error([...customError.messages, customError.elementJson].join(os.EOL));
  return true;
};
