import { Types } from "../shared-types";
import { Loaded } from "./shared-types";

export const convertToTypes = (loaded: Loaded, id: string): Types => {
  // happily the id is the name of the assembly
  const typeNames = Object.entries(loaded.types)
    .filter(([, typeInfo]) => typeInfo.assembly.includes(id))
    .map(([typeName]) => typeName);
  const dictionary = new Map<string, string[]>();
  typeNames.forEach((typeName) => {
    const index = typeName.lastIndexOf(".");
    const [first, second] =
      index !== -1 ? [typeName.substring(0, index), typeName.substring(index + 1)] : ["(no namespace)", typeName];
    const found = dictionary.get(first);
    if (found) found.push(second);
    else dictionary.set(first, [second]);
  });
  const namespaceNames = [...dictionary.keys()];
  namespaceNames.sort();
  return {
    namespaces: namespaceNames.map((name) => {
      const typeNames = dictionary.get(name);
      if (!typeNames) throw new Error("Dictionary");
      typeNames.sort();
      return { name, typeNames };
    }),
  };
};
