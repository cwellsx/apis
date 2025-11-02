import { AnyNodeId } from "../nodeIds";
import { GraphViewType } from "../contracts-ui";

export const viewFeatures: Record<GraphViewType, { leafType: AnyNodeId["type"]; details: ("leaf" | "edge")[] }> = {
  references: { leafType: "assembly", details: ["leaf"] },
  apis: { leafType: "method", details: ["leaf"] },
  methods: { leafType: "method", details: ["leaf"] },
  custom: { leafType: "customLeaf", details: ["edge", "leaf"] },
};
