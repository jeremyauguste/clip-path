import { PathPoint } from "@/types/shape";

export interface Bounds {
  minX: number; maxX: number; minY: number; maxY: number;
}

function solveQuadraticEq(a: number, b: number, c: number): number[] {
  if (Math.abs(a) < 1e-10) {
    return Math.abs(b) > 1e-10 ? [-c / b] : [];
  }
  const disc = b * b - 4 * a * c;
  if (disc < 0) return [];
  const sq = Math.sqrt(disc);
  return [(-b - sq) / (2 * a), (-b + sq) / (2 * a)];
}

function cubicExtrema(p0: number, p1: number, p2: number, p3: number): number[] {
  return solveQuadraticEq(
    3 * (-p0 + 3 * p1 - 3 * p2 + p3),
    6 * (p0 - 2 * p1 + p2),
    3 * (p1 - p0)
  ).filter((t) => t > 0 && t < 1);
}

function evalCubic(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const m = 1 - t;
  return m * m * m * p0 + 3 * m * m * t * p1 + 3 * m * t * t * p2 + t * t * t * p3;
}

function quadraticExtremum(p0: number, p1: number, p2: number): number[] {
  const denom = p0 - 2 * p1 + p2;
  if (Math.abs(denom) < 1e-10) return [];
  const t = (p0 - p1) / denom;
  return t > 0 && t < 1 ? [t] : [];
}

function evalQuadratic(p0: number, p1: number, p2: number, t: number): number {
  const m = 1 - t;
  return m * m * p0 + 2 * m * t * p1 + t * t * p2;
}

// Returns whether angle `theta` lies on the arc from `theta1` spanning `dTheta`.
function inArcRange(theta: number, theta1: number, dTheta: number): boolean {
  const PI2 = 2 * Math.PI;
  const t = ((theta - theta1) % PI2 + PI2) % PI2;
  return dTheta >= 0 ? t <= dTheta : t >= PI2 + dTheta;
}

// Axis-aligned bounding box contribution from an SVG arc (phi=0).
// Returns extra x and y extrema that may extend beyond the endpoints.
function arcExtrema(
  x1: number, y1: number,
  rx: number, ry: number,
  fA: boolean, fS: boolean,
  x2: number, y2: number
): { xs: number[]; ys: number[] } {
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  if (rx < 1e-10 || ry < 1e-10) return { xs: [], ys: [] };

  // Midpoint transformation (phi=0 simplifies cos=1, sin=0)
  const dx2 = (x1 - x2) / 2;
  const dy2 = (y1 - y2) / 2;
  const x1p = dx2, y1p = dy2;

  // Ensure radii are large enough to span the chord
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) { const s = Math.sqrt(lambda); rx *= s; ry *= s; }

  // Center in transformed space
  const rxSq = rx * rx, rySq = ry * ry;
  const x1pSq = x1p * x1p, y1pSq = y1p * y1p;
  const num = Math.max(0, rxSq * rySq - rxSq * y1pSq - rySq * x1pSq);
  const den = rxSq * y1pSq + rySq * x1pSq;
  const coef = (fA !== fS ? 1 : -1) * (den > 0 ? Math.sqrt(num / den) : 0);
  const cxp = coef * (rx * y1p / ry);
  const cyp = coef * (-ry * x1p / rx);

  // Absolute center (phi=0)
  const cx = cxp + (x1 + x2) / 2;
  const cy = cyp + (y1 + y2) / 2;

  // Start angle and sweep
  const ux = (x1p - cxp) / rx, uy = (y1p - cyp) / ry;
  const vx = (-x1p - cxp) / rx, vy = (-y1p - cyp) / ry;
  const theta1 = Math.atan2(uy, ux);
  let dTheta = Math.atan2(vy, vx) - theta1;
  if (!fS && dTheta > 0) dTheta -= 2 * Math.PI;
  if (fS && dTheta < 0) dTheta += 2 * Math.PI;

  // Extrema at 0, π/2, π, 3π/2 (phi=0 case)
  const xs: number[] = [], ys: number[] = [];
  const corners = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
  for (const th of corners) {
    if (inArcRange(th, theta1, dTheta)) {
      xs.push(cx + rx * Math.cos(th));
      ys.push(cy + ry * Math.sin(th));
    }
  }
  return { xs, ys };
}

function expandBounds(acc: Bounds, xs: number[], ys: number[]) {
  for (const x of xs) { if (x < acc.minX) acc.minX = x; if (x > acc.maxX) acc.maxX = x; }
  for (const y of ys) { if (y < acc.minY) acc.minY = y; if (y > acc.maxY) acc.maxY = y; }
}

export function computeShapeBounds(points: PathPoint[]): Bounds | null {
  if (!points.length) return null;

  const acc: Bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };

  for (const p of points) {
    if (p.x < acc.minX) acc.minX = p.x;
    if (p.x > acc.maxX) acc.maxX = p.x;
    if (p.y < acc.minY) acc.minY = p.y;
    if (p.y > acc.maxY) acc.maxY = p.y;
  }

  const n = points.length;
  const edgeCount = n >= 3 ? n : n - 1;

  for (let i = 0; i < edgeCount; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];

    if (b.type === "arc") {
      const rx = b.rx ?? 50, ry = b.ry ?? rx;
      const { xs, ys } = arcExtrema(a.x, a.y, rx, ry, !!b.largeArc, b.sweep !== false, b.x, b.y);
      expandBounds(acc, xs, ys);
    } else if (b.type === "quadratic" && b.cp1) {
      const { x: cx, y: cy } = b.cp1;
      const txs = quadraticExtremum(a.x, cx, b.x);
      const tys = quadraticExtremum(a.y, cy, b.y);
      expandBounds(
        acc,
        [a.x, b.x, ...txs.map((t) => evalQuadratic(a.x, cx, b.x, t))],
        [a.y, b.y, ...tys.map((t) => evalQuadratic(a.y, cy, b.y, t))]
      );
    } else if (b.type === "smooth" || a.type === "smooth") {
      const cp1 = a.cp2 ?? { x: a.x, y: a.y };
      const cp2 = b.cp1 ?? { x: b.x, y: b.y };
      const txs = cubicExtrema(a.x, cp1.x, cp2.x, b.x);
      const tys = cubicExtrema(a.y, cp1.y, cp2.y, b.y);
      expandBounds(
        acc,
        [a.x, b.x, ...txs.map((t) => evalCubic(a.x, cp1.x, cp2.x, b.x, t))],
        [a.y, b.y, ...tys.map((t) => evalCubic(a.y, cp1.y, cp2.y, b.y, t))]
      );
    }
  }

  return acc;
}
