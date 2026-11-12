import { defaultDotnetOptions, DotnetOptions } from "./dotnetOptions";
import type { ConfigurationProperty, ConfigurationSchema } from "./schema";

// The dotnet view's own options, described the way the app options are. The section is the view's name, because
// the panel shows the options of whichever view is selected, and the section is what tells them apart.
export const dotnetOptionsSection = "dotnet";

// A property for every field of DotnetOptions, and only for those: a field which is added, renamed or removed
// makes this a compile error, rather than a control which quietly does nothing. The defaults come from
// defaultDotnetOptions for the same reason.
const dotnetOptionProperties: { [K in keyof DotnetOptions]: ConfigurationProperty } = {
  clusterNamespaces: {
    type: "boolean",
    default: defaultDotnetOptions.clusterNamespaces,
    markdownDescription:
      "When enabled, the `Foo.Bar.Baz` namespace is a node within `Foo.Bar`. When disabled, all are revealed when the assembly is opened.",
  },
};

// Which group each option belongs to: exhaustive over the fields of DotnetOptions, like the properties above
const dotnetOptionGroups: { [K in keyof DotnetOptions]: string } = { clusterNamespaces: "Progressive Reveal" };

// The groups, in the order in which their first option appears above
export const dotnetOptionsSchemas: ConfigurationSchema[] = [...new Set(Object.values(dotnetOptionGroups))].map(
  (title) => ({
    title,
    properties: Object.fromEntries(
      Object.entries(dotnetOptionProperties)
        .filter(([key]) => dotnetOptionGroups[key as keyof DotnetOptions] === title)
        .map(([key, property]) => [`${dotnetOptionsSection}.${key}`, property])
    ),
  })
);
