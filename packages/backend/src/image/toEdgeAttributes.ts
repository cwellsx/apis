export type EdgeAttributes = { labels?: string[]; tooltip?: string[] };

// dot file attributes must be escaped
// XML, HTML, SVG attributes are not escaped
export const escapeDotString = (s: string): string => s.replace("\\", "\\\\");

export const toEdgeAttributes = (edgeAttributes: EdgeAttributes, attributeValues: Record<string, string>): void => {
  const { labels, tooltip } = edgeAttributes;

  // currently don't want labels because they clutter the graph
  if (labels) {
    // use \l instead of \r\n to left-justify labels
    const edgeLabel = labels.map((s) => escapeDotString(s) + "\\l").join("");
    attributeValues.label = edgeLabel;
  }

  // currently don't want tooltips because instead using richer popups using a div
  if (tooltip) {
    const edgeTooltip = tooltip.map((s) => escapeDotString(s)).join("\n");
    attributeValues.tooltip = edgeTooltip;
  }
};
