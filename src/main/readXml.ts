import { ElementCompact, xml2js } from "xml-js";
import { Area } from "../shared-types";

// this is implemented using the xml-js package instead of xml2json because
// xml2json says that it "uses node-expat which will require extra steps if you want to get it installed on Windows"

/* output from xml-js has a format like this:

{
  "map": {
    "_attributes": {
      "id": "SRC",
      "name": "SRC"
    },
    "area": [
      {
        "_attributes": {
          "shape": "rect",
          "id": "ModelClipboard",
          "href": "foo",
          "title": "ModelClipboard",
          "alt": "",
          "coords": "651,293,797,341"
        }
      },
      {
        "_attributes": {
          "shape": "poly",
          "id": "ModelClipboard|mscorlib",
          "href": "foo",
          "alt": "",
          "coords": "652,343,600,364,548,392,522,414,498,439,433,484,430,480,494,435,519,410,545,387,597,359,650,338"
        }
      },

    To run it from the command-line, add a line like the following to package.json and then `npm run xml`

        "xml": "xml-js C:\\Users\\Christopher\\AppData\\Roaming\\@cwellsx\\apis\\assemblies.xml --compact --spaces 2"

*/

type Attributes = {
  _attributes: {
    shape: "poly" | "rect";
    id: string;
    coords: string;
  };
};

export function readXml(xml: string): Area[] {
  const root: ElementCompact = xml2js(xml, { compact: true });
  const areas: Attributes[] = root["map"]["area"];
  return areas.map((el) => {
    const attr = el._attributes;
    const coords = attr.coords.split(",").map((s) => parseInt(s));
    const area = { id: attr.id, shape: attr.shape, coords };
    if (!area.id || (area.shape != "poly" && area.shape != "rect") || coords.length == 0 || coords.length % 2 != 0)
      throw Error("Missing Area property");
    return area;
  });
}
