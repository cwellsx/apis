import { CustomElement, validateCustomJson } from "../customJson";
import { makeCustomId } from "../id2";
import { isDefined } from "../utils";
import * as Schema from "./schema";

const getLayers = (all: CustomElement[]): Schema.Layer[] => {
  all.forEach((item) => item.layer?.replace("\\", "/"));
  const set = new Set<string>(all.map((item) => item.layer).filter(isDefined));
  const unique = [...set.keys()];
  return unique.map((item) => ({ layer: item }));
};

const getItems = (all: CustomElement[]): Schema.Item[] =>
  all.map((item) => ({ id: makeCustomId(item.id), layer: item.layer, label: item.label }));

const getItemTags = (all: CustomElement[]): Schema.ItemTag[] =>
  all.flatMap((item) => (item.tags ? item.tags.map((tag) => ({ id: makeCustomId(item.id), tag })) : []));

const getEdges = (all: CustomElement[]): Schema.Edge[] =>
  all.flatMap((item) =>
    item.dependencies.map((dependency) => ({ fromId: makeCustomId(item.id), toId: makeCustomId(dependency.id) }))
  );

const knownItemKeys = new Set<string>(["dependencies", "tags", "layer"]);

const getItemAttrs = (all: CustomElement[]): Schema.ItemAttr[] =>
  all.flatMap((item) =>
    Object.entries(item)
      .filter((kvp) => !knownItemKeys.has(kvp[0]))
      .map((kvp) => ({ id: makeCustomId(item.id), name: kvp[0], value: JSON.stringify(kvp[1]) }))
  );

const getEdgeAttrs = (all: CustomElement[]): Schema.EdgeAttr[] =>
  all.flatMap((item) =>
    item.dependencies.flatMap((dependency) =>
      Object.entries(dependency).map((kvp) => ({
        fromId: makeCustomId(item.id),
        toId: makeCustomId(dependency.id),
        name: kvp[0],
        value: JSON.stringify(kvp[1]),
      }))
    )
  );

export const insertAll = (all: CustomElement[], tables: Schema.Tables) => {
  const customErrors = validateCustomJson(all);
  // layer
  const layers = getLayers(all);
  tables.layers.insertMany(layers);
  // items
  const items = getItems(all);
  tables.items.insertMany(items);
  // tags
  const itemTags = getItemTags(all);
  tables.itemTags.insertMany(itemTags);
  // edges
  const edges = getEdges(all);
  tables.edges.insertMany(edges);
  // itemAttrs
  const itemAttrs = getItemAttrs(all);
  tables.itemAttrs.insertMany(itemAttrs);
  // itemAttrs
  const edgeAttrs = getEdgeAttrs(all);
  tables.edgeAttrs.insertMany(edgeAttrs);
};
