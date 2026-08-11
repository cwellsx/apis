import { GraphType } from "../contracts-ui";
import { AnyNodeId } from "../nodeIds";

export const viewFeatures: Record<GraphType, { leafType: AnyNodeId["type"]; details: ("leaf" | "edge")[] }> = {
  references: { leafType: "assembly", details: ["leaf"] },
  apis: { leafType: "method", details: ["leaf"] },
  methods: { leafType: "method", details: ["leaf"] },
  custom: { leafType: "customLeaf", details: ["edge", "leaf"] },
};
