// an essential component of other more complicated types
// not a stand-alone type exported via index.ts

export type TextNode = {
  label: string;
  id: string; // unique within graph and/or within group tree
};
