import { Groups } from "./grouped";

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

export type ViewOptions = {
  showGrouped: boolean;
};

export const defaultViewOptions: ViewOptions = { showGrouped: true };

export type View = {
  image: Image | string; // string is a message if there isn't an Image
  groups: Groups | null; // send null if previously-sent Groups has not changed
  leafVisible: string[];
  groupExpanded: string[];
  viewOptions: ViewOptions;
};
