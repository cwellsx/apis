/**
 * Compute a padded hit-area polygon around a GraphViz spline.
 *
 * @param points  Array of [x, y] coordinates from GraphViz's "coords" attribute.
 * @param padding Thickness (in px) of the padded hit area around the spline.
 *                You can scale this with zoomPercent if desired.
 *
 * @returns Array of [x, y] points forming a closed polygon suitable for an SVG <polygon>.
 *
 * The algorithm:
 *   - For each segment Pi -> Pi+1, compute a perpendicular vector.
 *   - Normalize it and scale it to the desired padding.
 *   - Offset both endpoints to create a quad (A1, A2, B1, B2).
 *   - Collect all "top" points (A1 -> B1) in forward order.
 *   - Collect all "bottom" points (B2 -> A2) in reverse order.
 *   - Concatenate them to form one clean, non-self-intersecting polygon.
 */
export function computePaddedHitArea(points: Array<[number, number]>, padding: number): Array<[number, number]> {
  // If fewer than 2 points, no spline → no hit area.
  if (points.length < 2) {
    return [];
  }

  // These arrays will hold the top and bottom boundaries of the padded spline.
  const topBoundary: Array<[number, number]> = [];
  const bottomBoundary: Array<[number, number]> = [];

  // Process each segment Pi -> Pi+1
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[i + 1];

    // Segment direction
    const dx = bx - ax;
    const dy = by - ay;

    // Perpendicular vector (-dy, dx)
    let nx = -dy;
    let ny = dx;

    // Normalize
    const len = Math.hypot(nx, ny);
    if (len === 0) {
      // Degenerate segment: skip it
      continue;
    }
    nx /= len;
    ny /= len;

    // Scale to padding
    const px = nx * padding;
    const py = ny * padding;

    // Quad points:
    // A1 and B1 are the "top" edge
    // A2 and B2 are the "bottom" edge
    const A1: [number, number] = [ax + px, ay + py];
    const A2: [number, number] = [ax - px, ay - py];
    const B1: [number, number] = [bx + px, by + py];
    const B2: [number, number] = [bx - px, by - py];

    // Collect top edge in forward order
    topBoundary.push(A1, B1);

    // Collect bottom edge in forward order (we will reverse later)
    bottomBoundary.push(B2, A2);
  }

  // Reverse bottom boundary so it runs backward along the spline
  bottomBoundary.reverse();

  // Final polygon: top boundary forward + bottom boundary backward
  const polygon = [...topBoundary, ...bottomBoundary];

  return polygon;
}
