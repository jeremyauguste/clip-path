import { PathPoint } from "@/types/shape";

function hasCurves(points: PathPoint[]): boolean {
  return points.some((p) => p.type === "smooth" || p.type === "quadratic" || p.type === "arc");
}

export function segmentCmd(prev: PathPoint, cur: PathPoint): string {
  if (cur.type === "arc") {
    const rx = +(cur.rx ?? 50).toFixed(3);
    const ry = +(cur.ry ?? rx).toFixed(3);
    const la = cur.largeArc ? 1 : 0;
    const sw = cur.sweep !== false ? 1 : 0;
    return ` A ${rx} ${ry} 0 ${la} ${sw} ${cur.x} ${cur.y}`;
  }
  if (cur.type === "quadratic") {
    const cp = cur.cp1 ?? { x: cur.x, y: cur.y };
    return ` Q ${cp.x} ${cp.y}, ${cur.x} ${cur.y}`;
  }
  if (cur.type === "smooth" || prev.type === "smooth") {
    const cp1 = prev.cp2 ?? { x: prev.x, y: prev.y };
    const cp2 = cur.cp1 ?? { x: cur.x, y: cur.y };
    return ` C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${cur.x} ${cur.y}`;
  }
  return ` L ${cur.x} ${cur.y}`;
}

// Shared path builder used by both the CSS generator and the SVG overlay
export function buildSvgPath(points: PathPoint[]): string {
  if (!points.length) return "";
  const [first, ...rest] = points;
  let d = `M ${first.x} ${first.y}`;
  for (let i = 0; i < rest.length; i++) {
    d += segmentCmd(points[i], rest[i]);
  }
  if (points.length > 2) {
    const last = points[points.length - 1];
    if (
      first.type === "arc" ||
      first.type === "quadratic" ||
      first.type === "smooth" ||
      last.type === "smooth"
    ) {
      d += segmentCmd(last, first);
    }
  }
  d += " Z";
  return d;
}

function toPolygon(points: PathPoint[], w: number, h: number): string {
  const coords = points
    .map((p) => `${((p.x / w) * 100).toFixed(1)}% ${((p.y / h) * 100).toFixed(1)}%`)
    .join(", ");
  return `clip-path: polygon(${coords});`;
}

function toPolygonPx(points: PathPoint[]): string {
  const coords = points.map((p) => `${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`).join(", ");
  return `clip-path: polygon(${coords});`;
}

export function generateCssOutput(
  points: PathPoint[],
  w: number,
  h: number,
  format: "percent" | "pixel" = "percent"
): string {
  if (!points.length) return "";
  if (hasCurves(points)) {
    return `clip-path: path("${buildSvgPath(points)}");`;
  }
  return format === "pixel" ? toPolygonPx(points) : toPolygon(points, w, h);
}
