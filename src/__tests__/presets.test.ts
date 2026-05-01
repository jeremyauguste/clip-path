import { describe, it, expect } from "vitest";
import { generatePolygon, generateStar, PRESETS } from "@/lib/presets";

// ─── generatePolygon ──────────────────────────────────────────────────────────

describe("generatePolygon", () => {
  it("produces exactly n points", () => {
    for (const n of [3, 4, 5, 6, 8, 12, 20]) {
      expect(generatePolygon(n)).toHaveLength(n);
    }
  });

  it("all points are corner type", () => {
    expect(generatePolygon(6).every((p) => p.type === "corner")).toBe(true);
  });

  it("all points are equidistant from center (200, 200)", () => {
    const pts = generatePolygon(8);
    const dists = pts.map((p) => Math.hypot(p.x - 200, p.y - 200));
    const first = dists[0];
    for (const d of dists) expect(d).toBeCloseTo(first, 6);
  });

  it("radius is 160", () => {
    const pts = generatePolygon(4);
    for (const p of pts) {
      expect(Math.hypot(p.x - 200, p.y - 200)).toBeCloseTo(160, 5);
    }
  });

  it("each point gets a unique id", () => {
    const pts = generatePolygon(6);
    const ids = new Set(pts.map((p) => p.id));
    expect(ids.size).toBe(6);
  });

  it("first point is at top (angle -90°)", () => {
    const pts = generatePolygon(4);
    // With 4 sides and -90° offset, first point should be at (200, 40) = center + (0, -160)
    expect(pts[0].x).toBeCloseTo(200, 5);
    expect(pts[0].y).toBeCloseTo(40, 5);
  });
});

// ─── generateStar ─────────────────────────────────────────────────────────────

describe("generateStar", () => {
  it("produces 2*n points", () => {
    for (const n of [3, 4, 5, 8, 16]) {
      expect(generateStar(n)).toHaveLength(n * 2);
    }
  });

  it("all points are corner type", () => {
    expect(generateStar(5).every((p) => p.type === "corner")).toBe(true);
  });

  it("alternates outer (160) and inner (65) radii", () => {
    const pts = generateStar(5);
    const cx = 200, cy = 200;
    for (let i = 0; i < pts.length; i++) {
      const dist = Math.hypot(pts[i].x - cx, pts[i].y - cy);
      const expected = i % 2 === 0 ? 160 : 65;
      expect(dist).toBeCloseTo(expected, 4);
    }
  });

  it("each point gets a unique id", () => {
    const pts = generateStar(5);
    expect(new Set(pts.map((p) => p.id)).size).toBe(10);
  });
});

// ─── PRESETS ──────────────────────────────────────────────────────────────────

describe("PRESETS — structure", () => {
  it("every preset has a label string and a points function", () => {
    for (const [, preset] of Object.entries(PRESETS)) {
      expect(typeof preset.label).toBe("string");
      expect(preset.label.length).toBeGreaterThan(0);
      expect(typeof preset.points).toBe("function");
    }
  });

  it("all preset points have unique ids within each preset", () => {
    for (const [key, preset] of Object.entries(PRESETS)) {
      const pts = preset.points();
      const ids = pts.map((p) => p.id);
      expect(new Set(ids).size).toBe(pts.length);
    }
  });

  it("calling points() twice returns independent arrays (fresh ids)", () => {
    const a = PRESETS.triangle.points();
    const b = PRESETS.triangle.points();
    // Both have the same coordinates but different ids (Math.random)
    expect(a[0].id).not.toBe(b[0].id);
    expect(a[0].x).toBe(b[0].x);
  });
});

describe("PRESETS — individual shapes", () => {
  it("triangle: 3 corner points", () => {
    const pts = PRESETS.triangle.points();
    expect(pts).toHaveLength(3);
    expect(pts.every((p) => p.type === "corner")).toBe(true);
  });

  it("rectangle: 4 corner points forming an axis-aligned rect", () => {
    const pts = PRESETS.rectangle.points();
    expect(pts).toHaveLength(4);
    const xs = new Set(pts.map((p) => p.x));
    const ys = new Set(pts.map((p) => p.y));
    expect(xs.size).toBe(2); // two distinct x values
    expect(ys.size).toBe(2); // two distinct y values
  });

  it("pentagon: 5 corner points", () => {
    expect(PRESETS.pentagon.points()).toHaveLength(5);
  });

  it("hexagon: 6 corner points", () => {
    const pts = PRESETS.hexagon.points();
    expect(pts).toHaveLength(6);
    expect(pts.every((p) => p.type === "corner")).toBe(true);
  });

  it("arrow: 7 corner points", () => {
    expect(PRESETS.arrow.points()).toHaveLength(7);
  });

  it("chevron: 6 corner points", () => {
    expect(PRESETS.chevron.points()).toHaveLength(6);
  });

  it("parallelogram: 4 corner points", () => {
    expect(PRESETS.parallelogram.points()).toHaveLength(4);
  });

  it("star: 10 corner points", () => {
    const pts = PRESETS.star.points();
    expect(pts).toHaveLength(10);
    expect(pts.every((p) => p.type === "corner")).toBe(true);
  });

  it("circle: 4 arc points all with rx=ry=160 and sweep=true", () => {
    const pts = PRESETS.circle.points();
    expect(pts).toHaveLength(4);
    expect(pts.every((p) => p.type === "arc")).toBe(true);
    expect(pts.every((p) => p.rx === 160 && p.ry === 160)).toBe(true);
    expect(pts.every((p) => p.sweep === true)).toBe(true);
  });

  it("circle: points lie on a circle of radius 160 centered at (200, 200)", () => {
    const pts = PRESETS.circle.points();
    for (const p of pts) {
      expect(Math.hypot(p.x - 200, p.y - 200)).toBeCloseTo(160, 4);
    }
  });

  it("semicircle: 1 corner + 1 arc point", () => {
    const pts = PRESETS.semicircle.points();
    expect(pts).toHaveLength(2);
    expect(pts[0].type).toBe("corner");
    expect(pts[1].type).toBe("arc");
    expect(pts[1].rx).toBe(160);
  });
});
