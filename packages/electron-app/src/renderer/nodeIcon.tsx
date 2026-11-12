import * as React from "react";
import { NodeType, type AnyNodeType } from "backend-ui";
import { ImageLibrary } from "./images.tsx";

// The icon for a node type, as a ready-made element. It carries the name of the type for assistive
// technology, because the icon is the only thing which says what kind of thing a node is -- the label
// alone doesn't. role="img" makes it a leaf in the accessibility tree, so its paths and its style element
// are not exposed along with the name.
//
// Node types which have no icon in the ImageLibrary (groups, and custom data) return undefined, so they
// show no icon rather than a misleading one.
export const toNodeIcon = (nodeType: AnyNodeType): React.ReactNode => {
  switch (nodeType) {
    case NodeType.Assembly:
      return <ImageLibrary.SvgAssembly role="img" aria-label="Assembly" />;
    case NodeType.Namespace:
      return <ImageLibrary.SvgNamespace role="img" aria-label="Namespace" />;
    case NodeType.Type:
      return <ImageLibrary.SvgClassPublic role="img" aria-label="Type" />;
    case NodeType.Method:
      return <ImageLibrary.SvgMethodPublic role="img" aria-label="Method" />;
  }
  return undefined;
};
