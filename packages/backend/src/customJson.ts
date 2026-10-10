import { randomUUID } from "crypto";
import { assert, remove } from "./utils";

type CustomError = { messages: string[]; elementId: string; elementJson: string };

type CustomDependency = { id: string; label: string } & { [key: string]: boolean };

type CustomFields = {
  id: string; // node.nodeId
  label?: string; // node.label
  tags?: string[]; // used to group nodes
  layer?: string; // used to group nodes
  shape?: string; //
  details?: string[]; // details pane
  dependencies: CustomDependency[];
};

export type CustomElement = CustomFields & { [key: string]: string | number };

export const isAnyOtherCustomField = (key: string): boolean =>
  ![
    "id",
    "label",
    "tags",
    "dependencies",
    "details", // new
  ].includes(key);

const isNumber = (value: unknown): boolean => typeof value === "number";
const isBoolean = (value: unknown): boolean => typeof value === "boolean";
const isString = (value: unknown): value is string => typeof value === "string";
const isObject = (value: unknown): value is object => typeof value === "object";

const jsonStringify = (element: unknown) => JSON.stringify(element, null, " ");

const createCustomError = (element: CustomElement, message: string): CustomError => ({
  messages: [message],
  elementId: element.id,
  elementJson: jsonStringify(element),
});

const findAndFixErrors = (element: CustomElement): CustomError | undefined => {
  const customError: CustomError = { messages: [], elementJson: jsonStringify(element), elementId: element.id };

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
  const dependencyIds = new Set<string>();
  dependencies.slice().forEach((item: unknown) => {
    if (!isObject(item)) {
      error("Dependency is not an object");
      remove(dependencies, item);
      return;
    }
    const dependency = item as CustomDependency;
    if (!dependency.id || !isString(dependency.id)) {
      error("Missing dependency id");
      remove(dependencies, item);
    }
    if (dependencyIds.has(dependency.id)) {
      error("Duplicate dependency id");
      dependency.id = randomUUID();
    }
    dependencyIds.add(dependency.id);
    if (!dependency.label || !isString(dependency.label)) {
      error("Missing dependency label");
      dependency.label = dependency.id;
    }
    assertAnyOtherFields(dependency, isBoolean);
  });

  return customError.messages.length ? customError : undefined;
};

export const fixCustomJson = (nodes: CustomElement[]): CustomError[] => {
  const customErrors: CustomError[] = [];
  nodes.slice().forEach((element) => {
    if (!isObject(element)) {
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

  // avoid backslash which GraphViz sees as escapes
  nodes.forEach((node) => {
    const regexp = /\\/g;
    node.id = node.id.replace(regexp, "/");
    if (node.label) node.label = node.label.replace(regexp, "/");
    if (node.layer) node.layer = node.layer.replace(regexp, "/");
    node.dependencies.forEach((dependency) => {
      dependency.id.replace(regexp, "/");
    });
  });
  return customErrors;
};

// do the validation is two stages
// 1. here, test that it's an array of objects with some id and dependency elements
// 2. later, sanitize all the nodes, correct them if needed, return error messages
export const assertCustomJson = (json: unknown): asserts json is CustomElement[] => {
  assert(!!json, "Expect json is truthy");
  assert(Array.isArray(json), "Expect json is array");
  assert(json.length != 0, "Expect json array is not empty");
  assert(json.every((item) => isObject(item), "Expect json array of objects"));
  assert(json.every((item) => "id" in item, "Expect all objects have id"));
  assert(json.every((item) => isString(item.id), "Expect all ids are strings"));
  assert(json.some((item) => "dependencies" in item, "Expect some objects have dependencies"));
};

type PartiallyValidated = Record<string, unknown> & { id: string };

export const validateCustomJson = (nodes: PartiallyValidated[]): CustomError[] => {
  const customErrors: CustomError[] = [];

  // all the ids at once
  const allIds = new Set<string>(nodes.map((node) => node.id));
  // each id one by one
  const ids = new Set<string>();

  nodes.forEach((node) => {
    const customError: CustomError = { messages: [], elementJson: JSON.stringify(node), elementId: node.id };

    if (ids.has(node.id)) {
      customError.messages.push("Node 'id' is not unique");
      node.id = randomUUID();
    } else ids.add(node.id);

    const assertIsString = (key: string) => {
      if (key in node && !isString(node[key])) {
        customError.messages.push(`Node '${key}' is not a string`);
        delete node[key];
      }
    };
    const assertIsArrayOfString = (key: string) => {
      if (key in node && !(Array.isArray(node[key]) && node[key].every(isString))) {
        customError.messages.push(`Node '${key}' is not an array of strings`);
        delete node[key];
      }
    };

    assertIsString("label");
    assertIsString("layer");
    assertIsString("shape");
    assertIsArrayOfString("tags");
    assertIsArrayOfString("details");

    if ("dependencies" in node) {
      const dependencies = node["dependencies"];
      const dependencyIds = new Set<string>();

      if (!(Array.isArray(dependencies) && dependencies.every(isObject))) {
        customError.messages.push(`Node 'dependencies' is not an array of object`);
        delete node["dependencies"];
      } else {
        dependencies.slice().forEach((dependency) => {
          if (!("id" in dependency)) {
            customError.messages.push(`Dependency has no id`);
            remove(dependencies, dependency);
            return;
          }

          const dependencyId = dependency["id"];
          if (!isString(dependencyId)) {
            customError.messages.push(`Dependency id is not a string`);
            remove(dependencies, dependency);
            return;
          }

          if (!allIds.has(dependencyId)) {
            customError.messages.push(`Dependency id '${dependencyId}' is unknown`);
            remove(dependencies, dependency);
            return;
          }

          if (dependencyIds.has(dependencyId)) {
            const found = dependencies.find((it) => "id" in it && it["id"] == dependencyId);
            assert(!!found);
            const first = found as Record<string, unknown>;
            Object.entries(dependency).forEach((entry) => {
              const [key, value] = entry;
              if (key in first) {
                if (JSON.stringify(value) != JSON.stringify(first[key]))
                  customError.messages.push(
                    `Dependency id '${dependencyId}' duplicated with mismatched '${key}' -- '${JSON.stringify(first[key])}' and '${JSON.stringify(value)}'`
                  );
              } else first[key] = value;
            });
            remove(dependencies, dependency);
          } else dependencyIds.add(dependencyId);
        });

        assert(dependencies.length == dependencyIds.size);
      }
    }

    if (customError.messages.length > 0) customErrors.push(customError);
  });

  return customErrors;
};
