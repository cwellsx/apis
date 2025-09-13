import { GraphViewType } from "../../shared-types";
import { AnyNodeId } from "../nodeIds";

export const viewFeatures: Record<GraphViewType, { leafType: AnyNodeId["type"]; details: ("leaf" | "edge")[] }> = {
  references: { leafType: "assembly", details: ["leaf"] },
  apis: { leafType: "method", details: ["leaf"] },
  methods: { leafType: "method", details: ["leaf"] },
  custom: { leafType: "customLeaf", details: ["edge", "leaf"] },
};
