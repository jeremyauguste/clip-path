import { describe, it, expect } from "vitest";
import { parseImport } from "@/lib/importParser";

const W = 400, H = 400;

// ─── CSS polygon() ────────────────────────────────────────────────────────────

describe("parseImport — CSS polygon() percentages", () => {
  it("parses triangle percentages", () => {
    const result = parseImport("clip-path: polygon(50% 0%, 0% 100%, 100% 100%);", W, H);
    expect(result).toHaveLength(3);
    expect(result![0]).toMatchObject({ x: 200, y: 0,   type: "corner" });
    expect(result![1]).toMatchObject({ x: 0,   y: 400, type: "corner" });
    expect(result![2]).toMatchObject({ x: 400, y: 400, type: "corner" });
  });

  it("parses bare polygon() without clip-path prefix", () => {
    const result = parseImport("polygon(50% 0%, 0% 100%, 100% 100%)", W, H);
    expect(result).toHaveLength(3);
    expect(result![0]).toMatchObject({ x: 200, y: 0 });
  });

  it("scales percentages against canvas width/height", () => {
    const result = parseImport("polygon(25% 50%, 75% 50%)", 800, 600);
    expect(result![0].x).toBeCloseTo(200, 5);
    expect(result![0].y).toBeCloseTo(300, 5);
    expect(result![1].x).toBeCloseTo(600, 5);
  });

  it("all points get unique string ids", () => {
    const result = parseImport("polygon(50% 0%, 0% 100%, 100% 100%)", W, H)!;
    const ids = result.map((p) => p.id);
    expect(new Set(ids).size).toBe(3);
    for (const id of ids) expect(typeof id).toBe("string");
  });
});

describe("parseImport — CSS polygon() pixels", () => {
  it("parses pixel polygon", () => {
    const result = parseImport("polygon(100px 0px, 300px 0px, 200px 200px)", W, H);
    expect(result).toHaveLength(3);
    expect(result![0]).toMatchObject({ x: 100, y: 0 });
    expect(result![1]).toMatchObject({ x: 300, y: 0 });
    expect(result![2]).toMatchObject({ x: 200, y: 200 });
  });
});

// ─── SVG polygon / polyline ───────────────────────────────────────────────────

describe("parseImport — SVG <polygon>", () => {
  it("parses comma-separated SVG polygon points", () => {
    const result = parseImport('<polygon points="50,0 100,100 0,100"/>', W, H);
    expect(result).toHaveLength(3);
    expect(result![0]).toMatchObject({ x: 50,  y: 0   });
    expect(result![1]).toMatchObject({ x: 100, y: 100 });
    expect(result![2]).toMatchObject({ x: 0,   y: 100 });
  });

  it("parses space-separated SVG polygon points", () => {
    const result = parseImport('<polygon points="50 0 100 100 0 100"/>', W, H);
    expect(result).toHaveLength(3);
    expect(result![0]).toMatchObject({ x: 50, y: 0 });
  });

  it("parses SVG polyline element", () => {
    const result = parseImport('<polyline points="0,0 100,0 100,100"/>', W, H);
    expect(result).toHaveLength(3);
    expect(result![0]).toMatchObject({ x: 0, y: 0 });
    expect(result![2]).toMatchObject({ x: 100, y: 100 });
  });

  it("all polygon points are corner type", () => {
    const result = parseImport('<polygon points="0,0 100,0 50,100"/>', W, H)!;
    expect(result.every((p) => p.type === "corner")).toBe(true);
  });
});

// ─── CSS path() ───────────────────────────────────────────────────────────────

describe("parseImport — CSS path()", () => {
  it("parses simple triangle path", () => {
    const result = parseImport('path("M 50 0 L 100 100 L 0 100 Z")', W, H);
    expect(result).not.toBeNull();
    expect(result!.length).toBeGreaterThanOrEqual(3);
    expect(result![0]).toMatchObject({ x: 50, y: 0, type: "corner" });
  });

  it("parses clip-path: path() with prefix and semicolon", () => {
    const result = parseImport('clip-path: path("M 0 0 L 100 0 L 50 100 Z");', W, H);
    expect(result).not.toBeNull();
    expect(result!.length).toBeGreaterThanOrEqual(3);
  });

  it("parses arc (A) command and produces arc-type points", () => {
    const result = parseImport('path("M 200 40 A 160 160 0 0 1 360 200 A 160 160 0 0 1 200 360 A 160 160 0 0 1 40 200 A 160 160 0 0 1 200 40 Z")', W, H);
    expect(result).not.toBeNull();
    const arcPts = result!.filter((p) => p.type === "arc");
    expect(arcPts.length).toBeGreaterThan(0);
    expect(arcPts[0].rx).toBe(160);
    expect(arcPts[0].ry).toBe(160);
  });

  it("parses relative m/l commands", () => {
    const result = parseImport('path("m 50 0 l 50 100 l -50 0 Z")', W, H);
    expect(result).not.toBeNull();
    expect(result!.length).toBeGreaterThanOrEqual(3);
    expect(result![0]).toMatchObject({ x: 50, y: 0 });
    expect(result![1]).toMatchObject({ x: 100, y: 100 });
  });

  it("parses H and V commands", () => {
    // Square via M + H + V + Z
    const result = parseImport('path("M 0 0 H 100 V 100 L 0 100 Z")', W, H);
    expect(result).not.toBeNull();
    expect(result!.length).toBeGreaterThanOrEqual(4);
    expect(result!.find((p) => p.x === 100 && p.y === 0)).toBeDefined();
    expect(result!.find((p) => p.x === 100 && p.y === 100)).toBeDefined();
  });

  it("parses cubic bezier C command", () => {
    const result = parseImport('path("M 0 0 C 0 50, 100 50, 100 0 Z")', W, H);
    expect(result).not.toBeNull();
    const smoothPt = result!.find((p) => p.type === "smooth");
    expect(smoothPt).toBeDefined();
  });

  it("removes duplicate closing point when path ends at start", () => {
    // Explicit close-back: M 50 0 ... L 50 0 Z → last point duplicates first
    const result = parseImport('path("M 50 0 L 100 100 L 0 100 L 50 0 Z")', W, H);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(3); // duplicate removed
  });
});

// ─── SVG <path> element ───────────────────────────────────────────────────────

describe("parseImport — SVG <path> element", () => {
  it("parses raw SVG path element with d attribute", () => {
    const result = parseImport('<path d="M 0 0 L 100 0 L 50 100 Z"/>', W, H);
    expect(result).not.toBeNull();
    expect(result!.length).toBeGreaterThanOrEqual(3);
  });

  it('parses path with double-quoted d="..."', () => {
    const result = parseImport('<path d="M 10 10 L 90 10 L 50 90 Z" fill="red"/>', W, H);
    expect(result).not.toBeNull();
  });
});

// ─── Invalid input ────────────────────────────────────────────────────────────

describe("parseImport — invalid input", () => {
  it("returns null for empty string", () => {
    expect(parseImport("", W, H)).toBeNull();
  });

  it("returns null for unrelated CSS", () => {
    expect(parseImport("color: red; font-size: 16px;", W, H)).toBeNull();
  });

  it("returns null for plain text", () => {
    expect(parseImport("not valid at all", W, H)).toBeNull();
  });

  it("returns null for incomplete polygon()", () => {
    // No inner coords — polygon() with empty parens parses but produces 0 points,
    // which the caller treats as null
    const result = parseImport("polygon()", W, H);
    // Either null or empty-length result is acceptable
    if (result !== null) expect(result.length).toBe(0);
  });
});
