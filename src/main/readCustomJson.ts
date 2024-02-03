import { randomUUID } from "crypto";
import type { Groups } from "../shared-types";
import { logJson } from "./log";
import { showErrorBox } from "./showErrorBox";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Scalar = "string" | "number" | "boolean";

interface IOtherFields {
  [key: string]: Scalar;
}

type CustomNode = IOtherFields & {
  id: string;
  label?: string;
  tags?: string[];
  dependencies: [{ id: string; label: string } & IOtherFields];
};

type CustomData = CustomNode[];

const isString = (value: any): boolean => typeof value === "string";
const isNumber = (value: any): boolean => typeof value === "number";
const isBoolean = (value: any): boolean => typeof value === "boolean";

const assertOtherFields = (element: IOtherFields): boolean => {
  return Object.entries(element).every((entry) => {
    const [key, value] = entry;
    if (key == "dependencies" || key == "tags" || isString(value) || isNumber(value) || isBoolean(value)) return true;
    delete element["key"];
    return false;
  });
};

const assertElement = (element: any): void => {
  const error = (message: string) => logJson(message, element);

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
    if (!Array.isArray(element.tags) && element.tags.every((tag: any) => isString(tag))) {
      error("Non-array tags");
      delete element["tags"];
    }
  }
  if (!assertOtherFields(element)) error("Non-scalar other fields");

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
    if (!assertOtherFields(dependency)) error("Non-scalar other dependency fields");
  });
};

const readNodes = (customData: CustomData): Groups => {
  const result: Groups = [];
  // get all the ids
  const ids = new Set<string>();
  customData.forEach((node) => {
    if (ids.has(node.id)) logJson("Node id is not unique");
    else ids.add(node.id);
  });
  // assert the ids in the dependencies
  customData.forEach((node) => {
    node.dependencies.forEach((dependency) => {
      if (!ids.has(dependency.id)) logJson("Dependency id is unknown");
    });
  });
  return result;
};

export const readCustomJson = (customData: any): Groups => {
  // assert we've been given an array of something
  if (!Array.isArray(customData)) {
    showErrorBox("Bad data", "Expected array of nodes");
    return [];
  }
  const customArray: any[] = customData;

  // verify that array elements are the type expected by the schema (or mutate them if needed)
  customArray.forEach((element) => assertElement(element));

  return readNodes(customData);
};
