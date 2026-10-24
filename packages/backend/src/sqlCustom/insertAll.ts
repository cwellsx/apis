import { CustomElement, validateCustomJson } from "../customJson";
import { makeCustomGroupId, makeCustomLeafId, makeCustomNodeId } from "../id2";
import { getGroupNames } from "../sqlCommon";
import { isDefined } from "../utils";
import * as Schema from "./schema";

const getLayers = (all: CustomElement[]): Schema.Layer[] => {
  all.forEach((item) => {
    if (item.layer) item.layer = item.layer.replaceAll("\\", "/");
  });
  const set = new Set<string>(all.map((item) => item.layer).filter(isDefined));
  const unique = [...set.keys()];
  return unique.map((item) => ({ id: makeCustomNodeId(item) }));
};

const getItems = (all: CustomElement[]): Schema.Item[] =>
  all.map((item) => ({
    id: makeCustomLeafId(item.id),
    layer: !item.layer ? undefined : makeCustomNodeId(item.layer),
    label: item.label,
  }));

const getItemTags = (all: CustomElement[]): Schema.ItemTag[] =>
  all.flatMap((item) => (item.tags ? item.tags.map((tag) => ({ id: makeCustomLeafId(item.id), tag })) : []));

const getEdges = (all: CustomElement[]): Schema.Edge[] =>
  all.flatMap((item) =>
    item.dependencies.map((dependency) => ({
      fromId: makeCustomLeafId(item.id),
      toId: makeCustomLeafId(dependency.id),
    }))
  );

const knownItemKeys = new Set<string>(["dependencies", "tags", "layer"]);

const getItemAttrs = (all: CustomElement[]): Schema.ItemAttr[] =>
  all.flatMap((item) =>
    Object.entries(item)
      .filter((kvp) => !knownItemKeys.has(kvp[0]))
      .map((kvp) => ({ id: makeCustomLeafId(item.id), name: kvp[0], value: JSON.stringify(kvp[1]) }))
  );

const getEdgeAttrs = (all: CustomElement[]): Schema.EdgeAttr[] =>
  all.flatMap((item) =>
    item.dependencies.flatMap((dependency) =>
      Object.entries(dependency).map((kvp) => ({
        fromId: makeCustomLeafId(item.id),
        toId: makeCustomLeafId(dependency.id),
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
  // groups
  if (layers.some((row) => row.id.includes("/"))) {
    const groups = getGroupNames(
      layers.map((row) => row.id),
      "/"
    );
    tables.groups.insertMany(groups.map((group) => ({ id: makeCustomGroupId(group), name: group })));
  }
  // views
  tables.views.insertAuto({ viewName: "Custom" });

  // grouped edges
  const edgesFrom = tables.edges
    .join(tables.items, "id", "fromId")
    .distinct()
    .selectAll<Schema.Edge>({ fromId: "items.layer", toId: "edges.toId" });
  tables.edges.insertMany(edgesFrom.filter((edge) => !!edge.fromId));

  const edgesTo = tables.edges
    .join(tables.items, "id", "toId")
    .distinct()
    .selectAll<Schema.Edge>({ fromId: "edges.fromId", toId: "items.layer" });
  tables.edges.insertMany(edgesTo.filter((edge) => !!edge.toId));
};
