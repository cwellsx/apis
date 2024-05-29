import { ElementCompact, xml2js } from "xml-js";
import { Area, AreaClass, makeUniqueEdgeId, textIsEdgeId } from "../shared-types";

/*
Input is a *.map file, created by Graphviz, which has a format like this:

```xml
<map id="SRC" name="SRC">
<area shape="rect" id="ModelClipboard" href="foo" title="ModelClipboard" alt="" coords="154,293,315,341"/>
<area shape="poly" id="ModelClipboard|System.Windows.Forms" href="foo" alt="" coords="231,342,224,375,218,374,226,341"/>
</map>
```

This module is implemented using the xml-js package instead of xml2json because
xml2json says that it "uses node-expat which will require extra steps if you want to get it installed on Windows"

Output from xml-js has a format like this:

```json
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
```

To run xml-js from the command-line, add a line like the following to package.json and then `npm run xml`

    "xml": "xml-js C:\\Users\\Christopher\\AppData\\Roaming\\@cwellsx\\apis\\assemblies.xml --compact --spaces 2"

*/

type Attributes = {
  _attributes: {
    shape: "poly" | "rect";
    id: string;
    coords: string;
    title?: string;
  };
};

export type ExtraAttributes = {
  className: AreaClass;
  tooltip?: string;
};

export function convertXmlMapToAreas(xml: string, getNodeAttributes: (id: string) => ExtraAttributes): Area[] {
  const root: ElementCompact = xml2js(xml, { compact: true });
  const converted: Attributes[] | Attributes = root["map"]["area"];
  const areas: Attributes[] = Array.isArray(converted) ? converted : [converted];

  // very long edges are split (by GraphViz) into two areas with identical id values
  const allIds = new Set<string>();
  const makeUniqueId = (id: string): string => {
    if (allIds.has(id)) {
      if (!textIsEdgeId(id)) throw new Error("Duplicated non-edge id");
      const original = id;
      for (let index = 1; ; ++index) {
        id = makeUniqueEdgeId(original, index);
        if (!allIds.has(id)) break;
      }
    }
    allIds.add(id);
    return id;
  };

  return areas.map((el) => {
    const attr = el._attributes;
    const coords = attr.coords.split(",").map((s) => parseInt(s));
    const { className, tooltip } = getNodeAttributes(attr.id);

    const area = { id: makeUniqueId(attr.id), shape: attr.shape, coords, className, tooltip: tooltip ?? attr.title };
    if (!area.id || (area.shape != "poly" && area.shape != "rect") || coords.length == 0 || coords.length % 2 != 0)
      throw new Error("Missing Area property");
    return area;
  });
}
