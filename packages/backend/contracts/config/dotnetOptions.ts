export type DotnetOptions = {
  // when enabled, a namespace which extends another is a node inside it -- Foo.Bar.Baz inside Foo.Bar
  clusterNamespaces: boolean;
  // when enabled, a type which is nested in another is a node inside it -- Foo.Bar inside Foo
  clusterTypes: boolean;
};
export const defaultDotnetOptions: DotnetOptions = { clusterNamespaces: true, clusterTypes: true };
