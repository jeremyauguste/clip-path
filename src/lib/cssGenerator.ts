import { PathPoint } from "@/types/shape";

function hasCurves(points: PathPoint[]): boolean {
  return points.some((p) => p.type === "smooth");
}

function toPathD(points: PathPoint[]): string {
  if (!points.length) return "";
  const [first, ...rest] = points;
  let d = `M ${first.x} ${first.y}`;
  for (const p of rest) {
    const prev = points[points.indexOf(p) - 1];
    if (p.type === "smooth" || prev.type === "smooth") {
      const cp1 = prev.cp2 ?? { x: prev.x, y: prev.y };
      const cp2 = p.cp1 ?? { x: p.x, y: p.y };
      d += ` C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p.x} ${p.y}`;
    } else {
      d += ` L ${p.x} ${p.y}`;
    }
  }
  // close path — connect last point back to first
  const last = points[points.length - 1];
  if (last.type === "smooth" || first.type === "smooth") {
    const cp1 = last.cp2 ?? { x: last.x, y: last.y };
    const cp2 = first.cp1 ?? { x: first.x, y: first.y };
    d += ` C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${first.x} ${first.y}`;
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

export function generateCssOutput(points: PathPoint[], w: number, h: number): string {
  if (!points.length) return "";
  if (hasCurves(points)) {
    return `clip-path: path("${toPathD(points)}");`;
  }
  return toPolygon(points, w, h);
}
