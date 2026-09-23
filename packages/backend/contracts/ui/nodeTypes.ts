import { NodeType } from "./nodeType";

type Group = typeof NodeType.Group;
type Assembly = typeof NodeType.Assembly;
type Namespace = typeof NodeType.Namespace;
type Type = typeof NodeType.Type;
type Method = typeof NodeType.Method;
type Custom = typeof NodeType.Custom;

export type RootNodeType = Assembly | Namespace;
export type MethodNodeType = Method;
export type AnyNodeType = Group | Assembly | Namespace | Type | Method | Custom;
export type AnyLeafType = Assembly | Method | Custom;
