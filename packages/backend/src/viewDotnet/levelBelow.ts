import { NodeType } from "../contracts-ui";
import type { AnyDotnetType } from "../contracts-ui";

// the kind of node which is one level below this kind: a group holds assemblies, a namespace holds types, a type
// holds methods, and a method holds nothing
export const levelBelow = (type: AnyDotnetType): AnyDotnetType | undefined => {
  switch (type) {
    case NodeType.Group:
      return NodeType.Assembly;
    case NodeType.Assembly:
      return NodeType.Namespace;
    case NodeType.Namespace:
      return NodeType.Type;
    case NodeType.Type:
      return NodeType.Method;
    case NodeType.Method:
      return undefined;
  }
};
