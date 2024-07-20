import { GraphViewType, NodeId } from "../../shared-types";
import { options } from "./options";

export const viewFeatures: Record<GraphViewType, { leafType: NodeId["type"]; details: ("leaf" | "edge")[] }> = {
  references: { leafType: "assembly", details: ["leaf"] },
  apis: options.reuseCallStack ? { leafType: "method", details: ["leaf"] } : { leafType: "type", details: ["edge"] },
  methods: { leafType: "method", details: ["leaf"] },
  custom: { leafType: "customLeaf", details: [] },
};
