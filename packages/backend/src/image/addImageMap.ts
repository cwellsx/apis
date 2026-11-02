import { readFileSync, writeFileSync } from "fs";
import { basename, dirname, extname, join } from "path";
import type { ElementCompact } from "xml-js";
import { xml2js } from "xml-js";
import { computePaddedHitArea } from "./computePaddedHitArea";

// Thickness (in px) of the padded hit area around each GraphViz spline.
const PADDING = 5;

// the code in computePaddedHitArea doesn't seem to work at all well -- maybe try to debug it later
const tryPaddedHitAreas = false;

/**
 * Reads a GraphViz SVG and its matching *.map file, then writes a new SVG
 * (named e.g. "assemblies-mapped.svg") that contains extra <polygon> hit
 * areas around every edge.  The new polygons are wider than the drawn edge
 * so they are easier to click/hover, and they scale with the SVG because
 * they are part of the SVG itself (unlike a standalone image map).
 *
 * @returns the path of the newly written SVG file.
 */
export const addImageMap = (imagePath: string, mapPath: string): string => {
  // --- parse the map file -------------------------------------------------
  const mapXml = readFileSync(mapPath, "utf-8");
  const mapRoot: ElementCompact = xml2js(mapXml, { compact: true });
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const areasRaw = mapRoot["map"]["area"];
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const areas: ElementCompact[] = Array.isArray(areasRaw) ? areasRaw : areasRaw ? [areasRaw] : [];

  // Only edges: shape="poly" and the id contains the edge separator "||".
  const edgeAreas = areas.filter((a) => {
    const attr = a?._attributes;
    return attr?.shape === "poly" && String(attr.id).includes("||");
  });

  // --- build the new <polygon> elements -----------------------------------
  const newPolygons = edgeAreas.map((area) => {
    const attr = area._attributes!;
    const id = String(attr.id);
    const coords = String(attr.coords)
      .split(",")
      .map((s) => parseInt(s.trim(), 10));

    const points: Array<[number, number]> = [];
    for (let i = 0; i < coords.length; i += 2) {
      points.push([coords[i], coords[i + 1]]);
    }

    const [tx, ty] = [-4, 316];
    const svgPoints: Array<[number, number]> = points.map(([x, y]) => [x * 0.75 + tx, y * 0.75 - ty]);

    const padded = tryPaddedHitAreas ? computePaddedHitArea(svgPoints, PADDING) : svgPoints;
    const pointsStr = padded.map((p) => `${p[0]},${p[1]}`).join(" ");

    return `  <polygon points="${pointsStr}" data-from-id="${id}" class="hit-edge" />`;
  });

  // --- insert into the SVG ------------------------------------------------
  const svgContent = readFileSync(imagePath, "utf-8");
  const polygonBlock = newPolygons.join("\n");

  // Insert inside the graph group (the <g> that carries a transform), right
  // before its closing tag -- i.e. after all existing GraphViz content.
  const insertPos = svgContent.lastIndexOf("</g>");
  const newSvg = svgContent.slice(0, insertPos) + polygonBlock + "\n" + svgContent.slice(insertPos);

  // --- write the mapped SVG ----------------------------------------------
  const dir = dirname(imagePath);
  const base = basename(imagePath, extname(imagePath));
  const outPath = join(dir, `${base}-mapped.svg`);
  writeFileSync(outPath, newSvg, "utf-8");

  return outPath;
};
