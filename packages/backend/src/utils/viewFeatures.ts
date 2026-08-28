import { GraphOptions } from "../contracts-ui";

export const viewFeatures: Record<GraphOptions.AnyGraphType, { details: ("leaf" | "edge")[] }> = {
  references: { details: ["leaf"] },
  apis: { details: ["leaf"] },
  methods: { details: ["leaf"] },
  custom: { details: ["edge", "leaf"] },
};
