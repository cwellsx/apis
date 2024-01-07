// this Graph.css doesn't work correctly
// - the canvas is resized but not moved like the img is
// - the coordinates in the map are not updated
// fixing this will require changes inside the ImageMapper component
// see also
// - https://stackoverflow.com/questions/13321067/dynamically-resizing-image-maps-and-images
// - https://stackoverflow.com/questions/3029422/how-to-auto-resize-an-image-while-maintaining-aspect-ratio
// import "./Graph.css";

import * as React from "react";
import type { Area as MyArea } from "../shared-types";
import { ImageMapper, Area, Map, AreaMouseEvent } from "./ImageMapper"; // copied from "react-image-mapper2"

type GraphProps = {
  imagePath: string;
  areas: MyArea[];
  now: number; // https://stackoverflow.com/questions/47922687/force-react-to-reload-an-image-file
};

export const Graph: React.FunctionComponent<GraphProps> = (props: GraphProps) => {
  const { imagePath, areas, now } = props;
  if (!imagePath) return <>"Loading..."</>;

  const map: Map = {
    name: "foo",
    // convert from MyArea (defined in "../shared-types") to Area (defined in "./ImageMapper")
    areas: areas.map((area) => {
      return { shape: area.shape, coords: area.coords, _id: area.id };
    }),
  };

  const onClick = (area: Area, index: number, event: AreaMouseEvent): void => {
    console.log(`Clicked area ${area._id}`);
  };

  return (
    <ImageMapper
      src={`${imagePath}?${now}`}
      map={map}
      strokeColor="red"
      lineWidth={1}
      active={true}
      onClick={onClick}
    />
  );
};
