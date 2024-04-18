export type Area = {
  id: string;
  shape: "poly" | "rect";
  coords: number[];
};

export type Image = {
  imagePath: string;
  areas: Area[];
  now: number; // https://stackoverflow.com/questions/47922687/force-react-to-reload-an-image-file
};
