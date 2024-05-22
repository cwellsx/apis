import { Parent, isParent, type ApiViewOptions, type Leaf, type ViewGraph } from "../shared-types";
import { convertLoadedToGroups } from "./convertLoadedToGroups";
import { stringId } from "./convertLoadedToMethods";
import { getTypeInfoName } from "./convertLoadedToTypeDetails";
import { convertToImage } from "./convertToImage";
import { log } from "./log";
import { type Edge } from "./shared-types";
import { ApiColumns, SavedTypeInfos } from "./sqlTables";

export const convertLoadedToApis = (
  apis: ApiColumns[],
  viewOptions: ApiViewOptions,
  savedTypeInfos: SavedTypeInfos,
  exes: string[]
): ViewGraph => {
  log("convertLoadedToReferences");
  const assemblyTypes: { [assemblyName: string]: { [typeId: number]: Leaf } } = {};
  const edges: Edge[] = [];

  const addLeaf = (assemblyName: string, typeId: number): void => {
    let types = assemblyTypes[assemblyName];
    if (!types) {
      types = {};
      assemblyTypes[assemblyName] = types;
    }
    if (types[typeId]) return; // Leaf already created for this type
    const leaf: Leaf = {
      id: stringId({ assemblyName, metadataToken: typeId }),
      label: getTypeInfoName(savedTypeInfos[assemblyName][typeId]),
      parent: null,
    };
    types[typeId] = leaf;
  };

  apis.forEach((api) => {
    addLeaf(api.fromAssemblyName, api.fromTypeId);
    addLeaf(api.toAssemblyName, api.toTypeId);

    edges.push({
      clientId: stringId({ assemblyName: api.fromAssemblyName, metadataToken: api.fromTypeId }),
      serverId: stringId({ assemblyName: api.toAssemblyName, metadataToken: api.toTypeId }),
    });
  });

  // the way in which Groups are created depends on the data i.e. whether it's Loaded or CustomData
  const { groups, nodes } = convertLoadedToGroups(Object.keys(assemblyTypes), exes);

  Object.entries(assemblyTypes).forEach(([assemblyName, types]) => {
    const node = nodes[assemblyName];
    if (isParent(node)) throw new Error("Unexpected parent");
    const parent = node as Parent;
    const children: Leaf[] = Object.values(types);
    children.forEach((child) => (child.parent = parent));
    parent["children"] = children;
  });

  const image = convertToImage(groups, edges, viewOptions);
  return { groups, image, viewOptions };
};
