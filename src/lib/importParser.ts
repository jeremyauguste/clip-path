import { PathPoint } from "@/types/shape";

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function toPathPoints(coords: [number, number][]): PathPoint[] {
  return coords.map(([x, y]) => ({ id: uid(), x, y, type: "corner" }));
}

// Parse "x1,y1 x2,y2 ..." or "x1 y1, x2 y2 ..." SVG points attribute
function parseSvgPoints(raw: string): [number, number][] {
  const nums = raw.trim().split(/[\s,]+/).map(Number).filter((n) => !isNaN(n));
  const pairs: [number, number][] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pairs.push([nums[i], nums[i + 1]]);
  return pairs;
}

// Parse CSS percentage pairs: "50% 0%, 100% 100%, 0% 100%"
function parsePolygonPercentages(inner: string, w: number, h: number): PathPoint[] {
  const pairs = inner.split(",").map((s) => s.trim());
  return pairs.map((pair) => {
    const [xStr, yStr] = pair.split(/\s+/);
    const x = (parseFloat(xStr) / 100) * w;
    const y = (parseFloat(yStr) / 100) * h;
    return { id: uid(), x, y, type: "corner" as const };
  });
}

// Parse CSS pixel pairs: "50px 0px, 100px 100px"
function parsePolygonPixels(inner: string): PathPoint[] {
  const pairs = inner.split(",").map((s) => s.trim());
  return pairs.map((pair) => {
    const [xStr, yStr] = pair.split(/\s+/);
    const x = parseFloat(xStr);
    const y = parseFloat(yStr);
    return { id: uid(), x, y, type: "corner" as const };
  });
}

function isPercentagePair(s: string): boolean {
  return s.includes("%");
}

export function parseImport(
  input: string,
  canvasWidth: number,
  canvasHeight: number
): PathPoint[] | null {
  const trimmed = input.trim();

  // --- SVG <polygon points="..."> ---
  const svgPolygonMatch = trimmed.match(/<polygon[^>]*points=["']([^"']+)["']/i);
  if (svgPolygonMatch) {
    const coords = parseSvgPoints(svgPolygonMatch[1]);
    return toPathPoints(coords);
  }

  // --- SVG <polyline points="..."> ---
  const svgPolylineMatch = trimmed.match(/<polyline[^>]*points=["']([^"']+)["']/i);
  if (svgPolylineMatch) {
    const coords = parseSvgPoints(svgPolylineMatch[1]);
    return toPathPoints(coords);
  }

  // --- CSS clip-path: polygon(...) ---
  const polygonMatch = trimmed.match(/polygon\(([^)]+)\)/i);
  if (polygonMatch) {
    const inner = polygonMatch[1];
    if (isPercentagePair(inner)) {
      return parsePolygonPercentages(inner, canvasWidth, canvasHeight);
    }
    return parsePolygonPixels(inner);
  }

  // --- CSS clip-path: path("...") ---
  const pathMatch = trimmed.match(/path\(["']([^"']+)["']\)/i);
  if (pathMatch) {
    return parseSvgPath(pathMatch[1]);
  }

  // --- Raw SVG path d="..." ---
  const svgPathMatch = trimmed.match(/<path[^>]*\bd=["']([^"']+)["']/i);
  if (svgPathMatch) {
    return parseSvgPath(svgPathMatch[1]);
  }

  return null;
}

// Minimal SVG path parser: handles M, L, C, Z (absolute commands only)
function parseSvgPath(d: string): PathPoint[] {
  const points: PathPoint[] = [];
  const tokens = d.trim().split(/(?=[MLCZmlcz])/);

  for (const token of tokens) {
    const cmd = token[0].toUpperCase();
    const nums = token
      .slice(1)
      .trim()
      .split(/[\s,]+/)
      .map(Number)
      .filter((n) => !isNaN(n));

    if (cmd === "M" || cmd === "L") {
      for (let i = 0; i + 1 < nums.length; i += 2) {
        points.push({ id: uid(), x: nums[i], y: nums[i + 1], type: "corner" });
      }
    } else if (cmd === "C") {
      // C cp1x cp1y cp2x cp2y x y
      for (let i = 0; i + 5 < nums.length; i += 6) {
        const prev = points[points.length - 1];
        if (prev) {
          prev.cp2 = { x: nums[i], y: nums[i + 1] };
          prev.type = "smooth";
        }
        points.push({
          id: uid(),
          x: nums[i + 4],
          y: nums[i + 5],
          type: "smooth",
          cp1: { x: nums[i + 2], y: nums[i + 3] },
        });
      }
    }
    // Z closes path — no new point needed
  }

  return points;
}
