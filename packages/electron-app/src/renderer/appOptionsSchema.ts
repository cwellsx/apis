import { AppOptions, defaultAppOptions } from "backend-ui";
import type { ConfigurationProperty, ConfigurationSchema } from "./configuration";
import { zooms } from "./useZoomPercent";

// The app's own options, described the way VS Code describes an extension's settings, so that the panel which
// shows them is the same one a VS Code extension would drive from its contributes.configuration. The section
// is the product's name, and the keys below it are the fields of AppOptions, which is what the panel reports.
export const appOptionsSection = "apis";

// Keys which are not described here are still preserved: the panel reports the values it was given with only
// the edited key changed, so an option this panel doesn't show cannot be lost by editing one it does.
//
// A property for every field of AppOptions, and only for those: a field which is added, renamed or removed
// makes this a compile error, rather than a control which quietly does nothing. The defaults come from
// defaultAppOptions for the same reason.
const appOptionProperties: { [K in keyof AppOptions]: ConfigurationProperty } = {
  zoomPercent: {
    type: "number",
    enum: zooms,
    enumItemLabels: zooms.map((zoom) => `${zoom}%`),
    default: defaultAppOptions.zoomPercent,
    description: "How much the graph is scaled, as a percentage.",
  },
  fontSize: {
    type: "number",
    minimum: 5,
    maximum: 18,
    default: defaultAppOptions.fontSize,
    description: "Text size, in pixels, of a text view.",
  },
  clusterNamespaces: {
    type: "boolean",
    default: defaultAppOptions.clusterNamespaces,
    markdownDescription:
      "When enabled, the `Foo.Bar.Baz` namespace is a node within `Foo.Bar`. When disabled, all are revealed when the assembly is opened.",
  },
};

// Which group each option belongs to: exhaustive over the fields of AppOptions, like the properties above, so
// that a new field cannot be left out of the panel by accident.
//
// VS Code also allows an optional `order` on a group and on a setting, which the settings editor sorts by
// before falling back to lexicographical order. That is not implemented here yet: the panel sorts
// lexicographically, which is that same fallback, so adding `order` later would only change the exceptions.
const appOptionGroups: { [K in keyof AppOptions]: string } = {
  zoomPercent: "Size",
  fontSize: "Size",
  clusterNamespaces: "Progressive Reveal",
};

// The groups, in the order in which their first option appears above
export const appOptionsSchemas: ConfigurationSchema[] = [...new Set(Object.values(appOptionGroups))].map((title) => ({
  title,
  properties: Object.fromEntries(
    Object.entries(appOptionProperties)
      .filter(([key]) => appOptionGroups[key as keyof AppOptions] === title)
      .map(([key, property]) => [`${appOptionsSection}.${key}`, property])
  ),
}));
