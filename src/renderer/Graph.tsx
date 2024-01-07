// this Graph.css doesn't work correctly
// - the canvas is resized but not moved like the img is
// - the coordinates in the map are not updated
// fixing this will require changes inside the ImageMapper component
// import "./Graph.css";
import type { Area } from "../shared-types";
import * as React from "react";
//import { ImageMapper, Area as MapArea, Map } from "react-image-mapper2";
import { ImageMapper, Area as MapArea, Map } from "./ImageMapper";

type GraphProps = {
  imagePath: string;
  areas: Area[];
  now: number; // https://stackoverflow.com/questions/47922687/force-react-to-reload-an-image-file
};

export const Graph: React.FunctionComponent<GraphProps> = (props: GraphProps) => {
  const { imagePath, areas, now } = props;
  if (!imagePath) return <>"Loading..."</>;

  const mapAreas: MapArea[] = areas.map((area) => {
    return { shape: area.shape, coords: area.coords, _id: area.id, strokeColor: "red", lineWidth: 1 };
  });
  const map: Map = { name: "foo", areas: mapAreas };
  return (
    <ImageMapper src={`${imagePath}?${now}`} map={map} strokeColor="red" active={true} width={1697} height={539} />
  );
};
