export type CustomError = { messages: string[]; elementId: string; elementJson: string };

export type CustomDependency = { id: string; label: string } & { [key: string]: boolean };

type CustomFields = {
  id: string; // node.nodeId
  label?: string; // node.label
  tags?: string[]; // used to group nodes
  layer?: string; // used to group nodes
  shape?: string; //
  details?: string[]; // details pane
  dependencies: CustomDependency[];
};

export type CustomElement = CustomFields & { [key: string]: string | number };
