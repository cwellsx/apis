export type DotnetOptions = {
  // when enabled, a namespace which extends another is a node inside it -- Foo.Bar.Baz inside Foo.Bar
  clusterNamespaces: boolean;
};
export const defaultDotnetOptions: DotnetOptions = { clusterNamespaces: true };
