export const NodeType = { Group: "g", Assembly: "a", Namespace: "n", Type: "t", Method: "m", Custom: "c" } as const;

type Group = typeof NodeType.Group;
type Assembly = typeof NodeType.Assembly;
type Namespace = typeof NodeType.Namespace;
type Type = typeof NodeType.Type;
type Method = typeof NodeType.Method;
type Custom = typeof NodeType.Custom;

export type RootNodeType = Assembly | Namespace;
export type AnyNodeType = Group | Assembly | Namespace | Type | Method | Custom;
