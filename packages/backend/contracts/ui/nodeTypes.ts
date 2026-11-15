import { NodeType } from "./nodeType";

type Group = typeof NodeType.Group;
type Assembly = typeof NodeType.Assembly;
type Namespace = typeof NodeType.Namespace;
type Type = typeof NodeType.Type;
type Method = typeof NodeType.Method;
type CustomGroup = typeof NodeType.CustomGroup;
type CustomNode = typeof NodeType.CustomNode;
type CustomLeaf = typeof NodeType.CustomLeaf;

export type RootNodeType = Assembly | CustomNode;
export type AnyNodeType = Group | Assembly | Namespace | Type | Method | CustomGroup | CustomNode | CustomLeaf;
export type AnyLeafType = Assembly | Method | CustomLeaf;
export type AnyGroupType = Group | CustomGroup;

// the node types of the dotnet view: everything except the three custom ones
export type AnyDotnetType = Group | Assembly | Namespace | Type | Method;
