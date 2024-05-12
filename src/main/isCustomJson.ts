import { randomUUID } from "crypto";
import os from "os";
import { remove } from "./shared-types";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Scalar = string | number | boolean;

type AnyOtherFields = {
  [key: string]: Scalar;
};

export type CustomNode = AnyOtherFields & {
  id: string;
  label?: string;
  tags?: string[];
  dependencies: ({ id: string; label: string } & AnyOtherFields)[];
};

const isString = (value: any): boolean => typeof value === "string";
const isNumber = (value: any): boolean => typeof value === "number";
const isBoolean = (value: any): boolean => typeof value === "boolean";

const precondition = (element: unknown): boolean => !!element && typeof element === "object";

const jsonStringify = (element: unknown) => JSON.stringify(element, null, " ");
const errorMessage = (elementJson: string, errors: string[]) => [...errors, elementJson].join(os.EOL);
const errorMessageEx = (element: unknown, ...errors: string[]) => errorMessage(jsonStringify(element), errors);

const findAndFixErrors = (element: CustomNode): string | undefined => {
  const elementJson = jsonStringify(element);
  const errors: string[] = [];

  const error = (message: string) => errors.push(message);

  const assertAnyOtherFields = (o: object): void =>
    Object.entries(o).forEach(([key, value]) => {
      if (key == "dependencies" || key == "tags" || isString(value) || isNumber(value) || isBoolean(value)) return;
      error(`Unpexpected non-scalar value type for key ${key}`);
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
    if (!Array.isArray(element.tags)) error("Non-array tags");
    if (!element.tags.every((tag) => isString(tag))) error("Non-string tags");
    delete element["tags"];
  }

  assertAnyOtherFields(element);

  const dependencies: any[] = element.dependencies;
  dependencies.slice().forEach((dependency: any) => {
    if (!dependency.id || !isString(dependency.id)) {
      error("Missing dependency id");
      const index = dependencies.indexOf(dependency);
      dependencies.splice(index, 1);
    }
    if (!dependency.label || !isString(dependency.label)) {
      error("Missing dependency label");
      dependency.label = dependency.id;
    }
    assertAnyOtherFields(dependency);
  });

  return errors.length ? errorMessage(elementJson, errors) : undefined;
};

export const fixCustomJson = (nodes: CustomNode[]): string[] => {
  const errors: string[] = [];
  nodes.slice().forEach((element) => {
    if (!precondition(element)) {
      remove(nodes, element);
      errors.push(errorMessageEx(element, "Node is not an object"));
      return;
    }
    const error = findAndFixErrors(element);
    if (error) errors.push(error);
  });

  // get all the ids
  const ids = new Set<string>();
  nodes.forEach((node) => {
    if (ids.has(node.id)) {
      errors.push(errorMessageEx(node, "Node id is not unique"));
      node.id = randomUUID();
    } else ids.add(node.id);
  });
  // assert the ids in the dependencies
  nodes.forEach((node) => {
    node.dependencies.forEach((dependency) => {
      if (!ids.has(dependency.id)) errors.push(errorMessageEx(node, `Dependency id "${dependency.id}" is unknown`));
    });
  });

  return errors;
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
  const error = findAndFixErrors(first as CustomNode);
  if (error) throw new Error(error);
  return true;
};
