export type Area = {
  id: string;
  shape: "poly" | "rect";
  coords: number[];
};

export type Node = {
  label: string;
  id?: string; // initialize this if the label isn't unique within the View, to identify the Node
  children?: Node[];
  isShown: boolean;
};

export type View = {
  imagePath: string;
  areas: Area[];
  nodes: Node[];
  now: number; // https://stackoverflow.com/questions/47922687/force-react-to-reload-an-image-file
};
