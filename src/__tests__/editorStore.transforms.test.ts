import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/cssGenerator", () => ({
  generateCssOutput: () => "",
  buildSvgPath: () => "",
}));

vi.mock("@/lib/bezierBounds", () => ({
  computeShapeBounds: () => ({ minX: 0, minY: 0, maxX: 400, maxY: 400 }),
}));

import { useEditorStore } from "@/store/editorStore";
import type { PathPoint } from "@/types/shape";

function pt(id: string, x: number, y: number, extra?: Partial<PathPoint>): PathPoint {
  return { id, x, y, type: "corner", ...extra };
}

function store() { return useEditorStore.getState(); }

function reset() {
  useEditorStore.setState({
    points: [],
    history: [],
    future: [],
    selectedPointId: null,
    canvasSettings: {
      width: 400, height: 400,
      previewMode: "solid",
      previewColor: "#6366f1",
      imagePosition: { x: 50, y: 50 },
      imageSize: 100,
    },
    cssOutput: "",
    cssFormat: "percent",
    activeTool: "select",
    panOffset: { x: 0, y: 0 },
    zoom: 1,
    snapToGrid: false,
    gridSize: 10,
    shapeName: "Untitled Shape",
    shapeId: null,
  });
}

// ─── flipHorizontal ───────────────────────────────────────────────────────────

describe("flipHorizontal", () => {
  beforeEach(reset);

  it("mirrors x-coords around bbox midpoint", () => {
    // bbox x: [0..100], midX=50 → 0↔100, 100↔0, 50↔50
    store().setPoints([pt("a", 0, 0), pt("b", 100, 0), pt("c", 50, 100)]);
    store().flipHorizontal();
    const xs = store().points.map((p) => p.x).sort((a, b) => a - b);
    expect(xs).toEqual([0, 50, 100]);
  });

  it("y-coords are unchanged", () => {
    store().setPoints([pt("a", 0, 0), pt("b", 100, 50), pt("c", 50, 100)]);
    store().flipHorizontal();
    const ys = store().points.map((p) => p.y).sort((a, b) => a - b);
    expect(ys).toEqual([0, 50, 100]);
  });

  it("no-ops on fewer than 2 points", () => {
    store().setPoints([pt("a", 50, 50)]);
    const before = store().points[0].x;
    store().flipHorizontal();
    expect(store().points[0].x).toBe(before);
  });

  it("pushes to history", () => {
    store().setPoints([pt("a", 0, 0), pt("b", 100, 100)]);
    const histLen = store().history.length;
    store().flipHorizontal();
    expect(store().history.length).toBeGreaterThan(histLen);
  });

  it("two flips = identity", () => {
    const original = [pt("a", 10, 20), pt("b", 80, 60), pt("c", 40, 90)];
    store().setPoints(original.map((p) => ({ ...p })));
    store().flipHorizontal();
    store().flipHorizontal();
    const pts = store().points;
    for (let i = 0; i < original.length; i++) {
      expect(pts[i].x).toBeCloseTo(original[i].x, 5);
      expect(pts[i].y).toBeCloseTo(original[i].y, 5);
    }
  });

  it("inverts arc sweep flag", () => {
    store().setPoints([
      pt("s", 0, 0),
      pt("a", 100, 50, { type: "arc", rx: 50, ry: 50, sweep: true }),
    ]);
    store().flipHorizontal();
    expect(store().points.find((p) => p.id === "a")?.sweep).toBe(false);
  });

  it("also flips cp1/cp2 x-coords", () => {
    store().setPoints([
      pt("a", 0, 0, { type: "smooth", cp2: { x: 20, y: 0 } }),
      pt("b", 100, 100, { type: "smooth", cp1: { x: 80, y: 100 } }),
    ]);
    store().flipHorizontal();
    const a = store().points.find((p) => p.id === "a")!;
    // bbox [0..100], midX=50. cp2.x=20 → 80
    expect(a.cp2?.x).toBeCloseTo(80, 5);
  });
});

// ─── flipVertical ─────────────────────────────────────────────────────────────

describe("flipVertical", () => {
  beforeEach(reset);

  it("mirrors y-coords around bbox midpoint", () => {
    store().setPoints([pt("a", 0, 0), pt("b", 100, 0), pt("c", 50, 100)]);
    store().flipVertical();
    const ys = store().points.map((p) => p.y).sort((a, b) => a - b);
    expect(ys).toEqual([0, 100, 100]);
  });

  it("x-coords are unchanged", () => {
    store().setPoints([pt("a", 0, 0), pt("b", 100, 50), pt("c", 50, 100)]);
    store().flipVertical();
    const xs = store().points.map((p) => p.x).sort((a, b) => a - b);
    expect(xs).toEqual([0, 50, 100]);
  });

  it("no-ops on fewer than 2 points", () => {
    store().setPoints([pt("a", 50, 30)]);
    const before = store().points[0].y;
    store().flipVertical();
    expect(store().points[0].y).toBe(before);
  });

  it("two flips = identity", () => {
    const original = [pt("a", 10, 20), pt("b", 80, 60), pt("c", 40, 90)];
    store().setPoints(original.map((p) => ({ ...p })));
    store().flipVertical();
    store().flipVertical();
    const pts = store().points;
    for (let i = 0; i < original.length; i++) {
      expect(pts[i].x).toBeCloseTo(original[i].x, 5);
      expect(pts[i].y).toBeCloseTo(original[i].y, 5);
    }
  });

  it("inverts arc sweep flag", () => {
    store().setPoints([
      pt("s", 0, 0),
      pt("a", 50, 100, { type: "arc", rx: 60, ry: 60, sweep: false }),
    ]);
    store().flipVertical();
    expect(store().points.find((p) => p.id === "a")?.sweep).toBe(true);
  });
});

// ─── rotate90CW ───────────────────────────────────────────────────────────────

describe("rotate90CW", () => {
  beforeEach(reset);

  it("no-ops on fewer than 2 points", () => {
    store().setPoints([pt("a", 100, 50)]);
    const before = { x: 100, y: 50 };
    store().rotate90CW();
    expect(store().points[0]).toMatchObject(before);
  });

  it("all coordinates are non-negative after rotation (normalization)", () => {
    store().setPoints([pt("a", 0, 0), pt("b", 200, 0), pt("c", 100, 150)]);
    store().rotate90CW();
    for (const p of store().points) {
      expect(p.x).toBeGreaterThanOrEqual(-0.001);
      expect(p.y).toBeGreaterThanOrEqual(-0.001);
    }
  });

  it("bounding box width/height swap after rotation", () => {
    store().setPoints([pt("a", 0, 0), pt("b", 200, 0), pt("c", 0, 100)]);
    const beforeW = 200, beforeH = 100;
    store().rotate90CW();
    const pts = store().points;
    const allX = pts.map((p) => p.x);
    const allY = pts.map((p) => p.y);
    const afterW = Math.max(...allX) - Math.min(...allX);
    const afterH = Math.max(...allY) - Math.min(...allY);
    expect(afterW).toBeCloseTo(beforeH, 1);
    expect(afterH).toBeCloseTo(beforeW, 1);
  });

  it("pushes to history", () => {
    store().setPoints([pt("a", 0, 0), pt("b", 100, 100)]);
    const histLen = store().history.length;
    store().rotate90CW();
    expect(store().history.length).toBeGreaterThan(histLen);
  });

  it("four 90° CW rotations of a square = identity", () => {
    // Square: bbox always 100x100, center always (50,50) → normalization is a no-op
    store().setPoints([pt("a", 0, 0), pt("b", 100, 0), pt("c", 100, 100), pt("d", 0, 100)]);
    const original = store().points.map((p) => ({ id: p.id, x: p.x, y: p.y }));
    for (let i = 0; i < 4; i++) store().rotate90CW();
    const final = store().points;
    for (const orig of original) {
      const fin = final.find((p) => p.id === orig.id)!;
      expect(fin.x).toBeCloseTo(orig.x, 1);
      expect(fin.y).toBeCloseTo(orig.y, 1);
    }
  });

  it("swaps rx and ry for arc points", () => {
    store().setPoints([
      pt("b", 0, 0),
      pt("a", 200, 0, { type: "arc", rx: 100, ry: 50 }),
    ]);
    store().rotate90CW();
    const rotated = store().points.find((p) => p.id === "a")!;
    expect(rotated.rx).toBe(50);
    expect(rotated.ry).toBe(100);
  });
});

// ─── rotate90CCW ──────────────────────────────────────────────────────────────

describe("rotate90CCW", () => {
  beforeEach(reset);

  it("no-ops on fewer than 2 points", () => {
    store().setPoints([pt("a", 100, 50)]);
    store().rotate90CCW();
    expect(store().points[0]).toMatchObject({ x: 100, y: 50 });
  });

  it("all coordinates are non-negative after rotation", () => {
    store().setPoints([pt("a", 0, 0), pt("b", 200, 0), pt("c", 100, 150)]);
    store().rotate90CCW();
    for (const p of store().points) {
      expect(p.x).toBeGreaterThanOrEqual(-0.001);
      expect(p.y).toBeGreaterThanOrEqual(-0.001);
    }
  });

  it("four 90° CCW rotations of a square = identity", () => {
    store().setPoints([pt("a", 0, 0), pt("b", 100, 0), pt("c", 100, 100), pt("d", 0, 100)]);
    const original = store().points.map((p) => ({ id: p.id, x: p.x, y: p.y }));
    for (let i = 0; i < 4; i++) store().rotate90CCW();
    const final = store().points;
    for (const orig of original) {
      const fin = final.find((p) => p.id === orig.id)!;
      expect(fin.x).toBeCloseTo(orig.x, 1);
      expect(fin.y).toBeCloseTo(orig.y, 1);
    }
  });

  it("swaps rx and ry for arc points", () => {
    store().setPoints([
      pt("b", 0, 0),
      pt("a", 0, 200, { type: "arc", rx: 80, ry: 30 }),
    ]);
    store().rotate90CCW();
    const rotated = store().points.find((p) => p.id === "a")!;
    expect(rotated.rx).toBe(30);
    expect(rotated.ry).toBe(80);
  });
});

// ─── makeHollow ───────────────────────────────────────────────────────────────

describe("makeHollow", () => {
  beforeEach(reset);

  it("doubles the point count", () => {
    store().setPoints([pt("a", 0, 0), pt("b", 200, 0), pt("c", 100, 200)]);
    store().makeHollow();
    expect(store().points).toHaveLength(6);
  });

  it("outer ring order is preserved", () => {
    store().setPoints([pt("a", 0, 0), pt("b", 200, 0), pt("c", 100, 200)]);
    store().makeHollow();
    expect(store().points[0].id).toBe("a");
    expect(store().points[1].id).toBe("b");
    expect(store().points[2].id).toBe("c");
  });

  it("first inner point has subpathStart=true", () => {
    store().setPoints([pt("a", 0, 0), pt("b", 200, 0), pt("c", 100, 200)]);
    store().makeHollow();
    expect(store().points[3].subpathStart).toBe(true);
  });

  it("remaining inner points have no subpathStart", () => {
    store().setPoints([pt("a", 0, 0), pt("b", 200, 0), pt("c", 100, 200)]);
    store().makeHollow();
    for (const p of store().points.slice(4)) {
      expect(p.subpathStart).toBeFalsy();
    }
  });

  it("outer ring points have no subpathStart", () => {
    store().setPoints([pt("a", 0, 0), pt("b", 200, 0), pt("c", 100, 200)]);
    store().makeHollow();
    for (const p of store().points.slice(0, 3)) {
      expect(p.subpathStart).toBeFalsy();
    }
  });

  it("inner points are 50% scaled toward centroid", () => {
    const pts = [pt("a", 0, 0), pt("b", 300, 0), pt("c", 150, 300)];
    store().setPoints(pts);
    store().makeHollow();
    const cx = (0 + 300 + 150) / 3;
    const cy = (0 + 0 + 300) / 3;
    const inner = store().points.slice(3);
    expect(inner[0].x).toBeCloseTo(cx + (0 - cx) * 0.5, 5);
    expect(inner[0].y).toBeCloseTo(cy + (0 - cy) * 0.5, 5);
    expect(inner[1].x).toBeCloseTo(cx + (300 - cx) * 0.5, 5);
    expect(inner[1].y).toBeCloseTo(cy + (0 - cy) * 0.5, 5);
  });

  it("scales arc rx/ry by 0.5 for arc points", () => {
    store().setPoints([
      pt("a", 360, 200, { type: "arc", rx: 160, ry: 80,  sweep: true }),
      pt("b", 200, 360, { type: "arc", rx: 160, ry: 80,  sweep: true }),
      pt("c", 40,  200, { type: "arc", rx: 160, ry: 80,  sweep: true }),
    ]);
    store().makeHollow();
    const innerFirst = store().points[3];
    expect(innerFirst.rx).toBeCloseTo(80,  5); // 160 * 0.5
    expect(innerFirst.ry).toBeCloseTo(40,  5); // 80  * 0.5
  });

  it("is a no-op when already hollow (subpathStart exists)", () => {
    store().setPoints([
      pt("a", 0, 0), pt("b", 200, 0), pt("c", 100, 200),
      pt("d", 50, 50, { subpathStart: true }), pt("e", 150, 50), pt("f", 100, 150),
    ]);
    store().makeHollow();
    expect(store().points).toHaveLength(6);
  });

  it("is a no-op on fewer than 3 points", () => {
    store().setPoints([pt("a", 0, 0), pt("b", 100, 100)]);
    store().makeHollow();
    expect(store().points).toHaveLength(2);
  });

  it("pushes to history", () => {
    store().setPoints([pt("a", 0, 0), pt("b", 200, 0), pt("c", 100, 200)]);
    const histLen = store().history.length;
    store().makeHollow();
    expect(store().history.length).toBeGreaterThan(histLen);
  });

  it("inner point ids differ from outer ids", () => {
    store().setPoints([pt("a", 0, 0), pt("b", 200, 0), pt("c", 100, 200)]);
    store().makeHollow();
    const outerIds = new Set(["a", "b", "c"]);
    for (const p of store().points.slice(3)) {
      expect(outerIds.has(p.id)).toBe(false);
    }
  });
});

// ─── togglePointType ──────────────────────────────────────────────────────────

describe("removeHollow", () => {
  beforeEach(reset);

  it("removes the inner ring, leaving only the outer ring", () => {
    store().setPoints([
      pt("a", 0, 0), pt("b", 200, 0), pt("c", 100, 200),
      pt("d", 50, 50, { subpathStart: true }), pt("e", 150, 50), pt("f", 100, 150),
    ]);
    store().removeHollow();
    expect(store().points).toHaveLength(3);
    expect(store().points.map((p) => p.id)).toEqual(["a", "b", "c"]);
  });

  it("clears subpathStart from the remaining points", () => {
    store().setPoints([
      pt("a", 0, 0), pt("b", 200, 0), pt("c", 100, 200),
      pt("d", 50, 50, { subpathStart: true }), pt("e", 150, 50),
    ]);
    store().removeHollow();
    for (const p of store().points) expect(p.subpathStart).toBeFalsy();
  });

  it("is a no-op when not hollow", () => {
    store().setPoints([pt("a", 0, 0), pt("b", 200, 0), pt("c", 100, 200)]);
    store().removeHollow();
    expect(store().points).toHaveLength(3);
  });

  it("is a no-op on empty points", () => {
    store().removeHollow();
    expect(store().points).toHaveLength(0);
  });

  it("pushes to history", () => {
    store().setPoints([
      pt("a", 0, 0), pt("b", 200, 0), pt("c", 100, 200),
      pt("d", 50, 50, { subpathStart: true }), pt("e", 150, 50), pt("f", 100, 150),
    ]);
    const histLen = store().history.length;
    store().removeHollow();
    expect(store().history.length).toBeGreaterThan(histLen);
  });

  it("makeHollow then removeHollow restores original point count", () => {
    store().setPoints([pt("a", 0, 0), pt("b", 200, 0), pt("c", 100, 200)]);
    store().makeHollow();
    store().removeHollow();
    expect(store().points).toHaveLength(3);
    expect(store().points.every((p) => !p.subpathStart)).toBe(true);
  });
});

describe("togglePointType", () => {
  beforeEach(reset);

  it("corner → smooth (with handles)", () => {
    store().setPoints([pt("a", 100, 100)]);
    store().togglePointType("a");
    const p = store().points[0];
    expect(p.type).toBe("smooth");
    expect(p.cp1).toBeDefined();
    expect(p.cp2).toBeDefined();
  });

  it("smooth → quadratic (cp2 removed)", () => {
    store().setPoints([pt("a", 100, 100, { type: "smooth", cp1: { x: 60, y: 100 }, cp2: { x: 140, y: 100 } })]);
    store().togglePointType("a");
    const p = store().points[0];
    expect(p.type).toBe("quadratic");
    expect(p.cp1).toBeDefined();
    expect(p.cp2).toBeUndefined();
  });

  it("quadratic → arc (with rx/ry)", () => {
    store().setPoints([pt("a", 100, 100, { type: "quadratic", cp1: { x: 100, y: 50 } })]);
    store().togglePointType("a");
    const p = store().points[0];
    expect(p.type).toBe("arc");
    expect(p.rx).toBeDefined();
    expect(p.ry).toBeDefined();
    expect(p.cp1).toBeUndefined();
  });

  it("arc → corner (all handles/arc params removed)", () => {
    store().setPoints([pt("a", 100, 100, { type: "arc", rx: 80, ry: 80, sweep: true })]);
    store().togglePointType("a");
    const p = store().points[0];
    expect(p.type).toBe("corner");
    expect(p.cp1).toBeUndefined();
    expect(p.cp2).toBeUndefined();
    expect(p.rx).toBeUndefined();
    expect(p.ry).toBeUndefined();
  });

  it("full cycle corner→smooth→quadratic→arc→corner", () => {
    store().setPoints([pt("a", 100, 100)]);
    const types = ["smooth", "quadratic", "arc", "corner"] as const;
    for (const expected of types) {
      store().togglePointType("a");
      expect(store().points[0].type).toBe(expected);
    }
  });

  it("unknown id is a no-op", () => {
    store().setPoints([pt("a", 0, 0)]);
    store().togglePointType("nonexistent");
    expect(store().points[0].type).toBe("corner");
  });

  it("pushes to history", () => {
    store().setPoints([pt("a", 100, 100)]);
    const histLen = store().history.length;
    store().togglePointType("a");
    expect(store().history.length).toBeGreaterThan(histLen);
  });
});

// ─── addPoint / removePoint / updatePoint ─────────────────────────────────────

describe("addPoint", () => {
  beforeEach(reset);

  it("appends the point", () => {
    store().addPoint(pt("a", 50, 50));
    expect(store().points).toHaveLength(1);
    expect(store().points[0].id).toBe("a");
  });

  it("pushes to history", () => {
    const histLen = store().history.length;
    store().addPoint(pt("a", 50, 50));
    expect(store().history.length).toBeGreaterThan(histLen);
  });

  it("successive adds accumulate", () => {
    store().addPoint(pt("a", 0, 0));
    store().addPoint(pt("b", 100, 100));
    expect(store().points).toHaveLength(2);
  });
});

describe("removePoint", () => {
  beforeEach(reset);

  it("removes the specified point", () => {
    store().setPoints([pt("a", 0, 0), pt("b", 100, 0)]);
    store().removePoint("a");
    expect(store().points).toHaveLength(1);
    expect(store().points[0].id).toBe("b");
  });

  it("clears selectedPointId", () => {
    store().setPoints([pt("a", 0, 0)]);
    store().setSelectedPointId("a");
    store().removePoint("a");
    expect(store().selectedPointId).toBeNull();
  });

  it("pushes to history", () => {
    store().setPoints([pt("a", 0, 0)]);
    const histLen = store().history.length;
    store().removePoint("a");
    expect(store().history.length).toBeGreaterThan(histLen);
  });

  it("non-existent id is a no-op", () => {
    store().setPoints([pt("a", 0, 0)]);
    store().removePoint("z");
    expect(store().points).toHaveLength(1);
  });
});

describe("updatePoint", () => {
  beforeEach(reset);

  it("updates x and y of target point", () => {
    store().setPoints([pt("a", 0, 0), pt("b", 100, 100)]);
    store().updatePoint("a", { x: 50, y: 75 });
    expect(store().points.find((p) => p.id === "a")).toMatchObject({ x: 50, y: 75 });
  });

  it("other points are not affected", () => {
    store().setPoints([pt("a", 0, 0), pt("b", 100, 100)]);
    store().updatePoint("a", { x: 50 });
    expect(store().points.find((p) => p.id === "b")).toMatchObject({ x: 100, y: 100 });
  });

  it("can update cp1 and cp2", () => {
    store().setPoints([pt("a", 0, 0, { type: "smooth" })]);
    store().updatePoint("a", { cp1: { x: 10, y: 20 } });
    expect(store().points[0].cp1).toEqual({ x: 10, y: 20 });
  });
});

// ─── zoom / pan ───────────────────────────────────────────────────────────────

describe("zoom and pan", () => {
  beforeEach(reset);

  it("setZoom clamps to [MIN, MAX]", () => {
    store().setZoom(0.001);
    expect(store().zoom).toBeGreaterThanOrEqual(0.1);

    store().setZoom(999);
    expect(store().zoom).toBeLessThanOrEqual(8);
  });

  it("setZoom sets valid value", () => {
    store().setZoom(2.5);
    expect(store().zoom).toBe(2.5);
  });

  it("setPanOffset stores value", () => {
    store().setPanOffset({ x: 100, y: -50 });
    expect(store().panOffset).toEqual({ x: 100, y: -50 });
  });

  it("zoomToward maintains cursor-world invariant", () => {
    store().setZoom(1);
    store().setPanOffset({ x: 0, y: 0 });
    // Zoom in 2x toward cursor at (200, 200)
    store().zoomToward(-100, 200, 200); // delta=-100 → 1 * (1 - (-100)*0.01) = 2
    const newZoom = store().zoom;
    const newPan = store().panOffset;
    // World point at cursor before and after should match:
    // worldX = (cursorX - panX) / zoom → (200 - 0) / 1 = 200
    // after: (200 - newPan.x) / newZoom should ≈ 200
    const worldX = (200 - newPan.x) / newZoom;
    const worldY = (200 - newPan.y) / newZoom;
    expect(worldX).toBeCloseTo(200, 2);
    expect(worldY).toBeCloseTo(200, 2);
  });
});
