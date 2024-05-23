import type { ApiViewOptions, Leaf, ViewGraph } from "../shared-types";
import { Parent, isParent, metadataNodeId, nameNodeId, nodeIdToText } from "../shared-types";
import { convertLoadedToGroups } from "./convertLoadedToGroups";
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
      nodeId: metadataNodeId("type", assemblyName, typeId),
      label: getTypeInfoName(savedTypeInfos[assemblyName][typeId]),
      parent: null,
    };
    types[typeId] = leaf;
  };

  apis.forEach((api) => {
    addLeaf(api.fromAssemblyName, api.fromTypeId);
    addLeaf(api.toAssemblyName, api.toTypeId);

    edges.push({
      clientId: nodeIdToText(metadataNodeId("type", api.fromAssemblyName, api.fromTypeId)),
      serverId: nodeIdToText(metadataNodeId("type", api.toAssemblyName, api.toTypeId)),
    });
  });

  // the way in which Groups are created depends on the data i.e. whether it's Loaded or CustomData
  const { groups, nodes } = convertLoadedToGroups(Object.keys(assemblyTypes), exes, "assembly");

  Object.entries(assemblyTypes).forEach(([assemblyName, types]) => {
    const node = nodes[nodeIdToText(nameNodeId("assembly", assemblyName))];
    if (isParent(node)) throw new Error("Unexpected parent");
    const parent = node as Parent;
    const children: Leaf[] = Object.values(types);
    children.forEach((child) => (child.parent = parent));
    parent["children"] = children;
  });

  const image = convertToImage(groups, edges, viewOptions);
  return { groups, image, viewOptions };
};
