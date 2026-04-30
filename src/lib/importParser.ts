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

// Full SVG path parser: M L H V C S Q A Z, absolute and relative
function parseSvgPath(d: string): PathPoint[] {
  const result: PathPoint[] = [];

  // Extract command letters and numbers (handles compact notation, negatives, scientific)
  const re = /([MmLlHhVvCcSsQqTtAaZz])|(-?[0-9]*\.?[0-9]+(?:[eE][+-]?[0-9]+)?)/g;
  const tokens: Array<string | number> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(d)) !== null) {
    tokens.push(m[1] !== undefined ? m[1] : parseFloat(m[2]));
  }

  let i = 0;
  let cx = 0, cy = 0;  // current point (absolute)
  let mx = 0, my = 0;  // last M point (for Z)
  let lastCp2: { x: number; y: number } | null = null; // for S reflection

  const num = () => tokens[i++] as number;
  const hasNum = () => i < tokens.length && typeof tokens[i] === "number";

  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (typeof cmd !== "string") continue;

    const rel = cmd !== cmd.toUpperCase() && cmd.toUpperCase() !== "Z";
    // Convert a relative delta to an absolute coordinate
    const ax = (dx: number) => (rel ? cx + dx : dx);
    const ay = (dy: number) => (rel ? cy + dy : dy);

    switch (cmd.toUpperCase()) {
      case "M": {
        let first = true;
        do {
          const x = ax(num()), y = ay(num());
          cx = x; cy = y;
          if (first) { mx = x; my = y; first = false; }
          result.push({ id: uid(), x, y, type: "corner" });
        } while (hasNum());
        lastCp2 = null;
        break;
      }
      case "L": {
        do {
          const x = ax(num()), y = ay(num());
          cx = x; cy = y;
          result.push({ id: uid(), x, y, type: "corner" });
        } while (hasNum());
        lastCp2 = null;
        break;
      }
      case "H": {
        do {
          cx = rel ? cx + num() : num();
          result.push({ id: uid(), x: cx, y: cy, type: "corner" });
        } while (hasNum());
        lastCp2 = null;
        break;
      }
      case "V": {
        do {
          cy = rel ? cy + num() : num();
          result.push({ id: uid(), x: cx, y: cy, type: "corner" });
        } while (hasNum());
        lastCp2 = null;
        break;
      }
      case "C": {
        do {
          // All six coords are relative to cx,cy at the START of this segment
          const cp1x = ax(num()), cp1y = ay(num());
          const cp2x = ax(num()), cp2y = ay(num());
          const x    = ax(num()), y    = ay(num());
          const prev = result[result.length - 1];
          if (prev) { prev.cp2 = { x: cp1x, y: cp1y }; prev.type = "smooth"; }
          lastCp2 = { x: cp2x, y: cp2y };
          cx = x; cy = y;
          result.push({ id: uid(), x, y, type: "smooth", cp1: { x: cp2x, y: cp2y } });
        } while (hasNum());
        break;
      }
      case "S": {
        do {
          const cp2x = ax(num()), cp2y = ay(num());
          const x    = ax(num()), y    = ay(num());
          // Implicit cp1 = reflection of previous cp2 about current point
          const cp1 = lastCp2
            ? { x: 2 * cx - lastCp2.x, y: 2 * cy - lastCp2.y }
            : { x: cx, y: cy };
          const prev = result[result.length - 1];
          if (prev) { prev.cp2 = cp1; prev.type = "smooth"; }
          lastCp2 = { x: cp2x, y: cp2y };
          cx = x; cy = y;
          result.push({ id: uid(), x, y, type: "smooth", cp1: { x: cp2x, y: cp2y } });
        } while (hasNum());
        break;
      }
      case "Q": {
        // Convert quadratic to cubic: 2/3 rule
        do {
          const qx = ax(num()), qy = ay(num());
          const x  = ax(num()), y  = ay(num());
          const cp1x = cx + (2 / 3) * (qx - cx);
          const cp1y = cy + (2 / 3) * (qy - cy);
          const cp2x = x  + (2 / 3) * (qx - x);
          const cp2y = y  + (2 / 3) * (qy - y);
          const prev = result[result.length - 1];
          if (prev) { prev.cp2 = { x: cp1x, y: cp1y }; prev.type = "smooth"; }
          lastCp2 = { x: cp2x, y: cp2y };
          cx = x; cy = y;
          result.push({ id: uid(), x, y, type: "smooth", cp1: { x: cp2x, y: cp2y } });
        } while (hasNum());
        break;
      }
      case "A": {
        do {
          const rxVal = Math.abs(num());
          const ryVal = Math.abs(num());
          num(); // x-axis-rotation (we always output 0, ignore on import)
          const largeArc = num() !== 0;
          const sweep = num() !== 0;
          cx = ax(num()); cy = ay(num());
          result.push({ id: uid(), x: cx, y: cy, type: "arc", rx: rxVal, ry: ryVal, largeArc, sweep });
        } while (hasNum());
        lastCp2 = null;
        break;
      }
      case "T": {
        // Smooth quadratic: just keep endpoint as corner (approximation)
        do {
          cx = ax(num()); cy = ay(num());
          result.push({ id: uid(), x: cx, y: cy, type: "corner" });
        } while (hasNum());
        lastCp2 = null;
        break;
      }
      case "Z": {
        cx = mx; cy = my;
        lastCp2 = null;
        break;
      }
    }
  }

  // When a path explicitly draws back to the M point (C, A, etc.) before Z,
  // a duplicate closing point is produced — transfer its curve params to first and remove it.
  if (result.length >= 2) {
    const first = result[0];
    const last = result[result.length - 1];
    if (Math.abs(first.x - last.x) < 0.5 && Math.abs(first.y - last.y) < 0.5) {
      if (last.type === "smooth" && last.cp1) {
        first.cp1 = last.cp1;
        if (first.cp2) first.type = "smooth";
      } else if (last.type === "arc") {
        // Transfer arc params so the closing segment stays an arc.
        first.rx = last.rx;
        first.ry = last.ry;
        first.largeArc = last.largeArc;
        first.sweep = last.sweep;
        first.type = "arc";
      }
      result.pop();
    }
  }

  return result;
}
