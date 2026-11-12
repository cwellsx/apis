// The schema of a configuration, as VS Code describes an extension's settings in contributes.configuration: the
// categories, and the properties within them. Nothing here knows about React, and nothing here is a value.

type ConfigurationPropertyType = "boolean" | "number" | "string" | "array" | "object";

export type ConfigurationProperty = {
  type: ConfigurationPropertyType;
  default?: unknown;
  description?: string;
  // markdown, shown in preference to `description`, as the settings editor does
  markdownDescription?: string;
  enum?: (string | number)[];
  // the option names shown for an enum, one per option: the label is shown, the enum's own value is what is set
  enumItemLabels?: string[];
  minimum?: number;
  maximum?: number;
  items?: ConfigurationProperty;
};

export type ConfigurationSchema = { title: string; properties: Record<string, ConfigurationProperty> };
