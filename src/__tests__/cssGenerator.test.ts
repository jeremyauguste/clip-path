import { describe, it, expect } from "vitest";
import { buildSvgPath, segmentCmd, generateCssOutput } from "@/lib/cssGenerator";
import type { PathPoint } from "@/types/shape";

function pt(id: string, x: number, y: number, extra?: Partial<PathPoint>): PathPoint {
  return { id, x, y, type: "corner", ...extra };
}

// ─── segmentCmd ───────────────────────────────────────────────────────────────

describe("segmentCmd — corner", () => {
  it("corner→corner produces L", () => {
    expect(segmentCmd(pt("a", 0, 0), pt("b", 100, 100))).toBe(" L 100 100");
  });
});

describe("segmentCmd — arc", () => {
  it("arc produces A command", () => {
    const prev = pt("a", 0, 0);
    const cur  = pt("b", 100, 0, { type: "arc", rx: 50, ry: 50, largeArc: false, sweep: true });
    const cmd  = segmentCmd(prev, cur);
    expect(cmd).toMatch(/^ A /);
    expect(cmd).toContain("100 0");
  });

  it("sweep=true emits flag 1", () => {
    const cmd = segmentCmd(pt("a", 0, 0), pt("b", 100, 0, { type: "arc", rx: 50, sweep: true }));
    expect(cmd).toMatch(/A 50 50 0 0 1 100 0/);
  });

  it("sweep=false emits flag 0", () => {
    const cmd = segmentCmd(pt("a", 0, 0), pt("b", 100, 0, { type: "arc", rx: 50, sweep: false }));
    expect(cmd).toMatch(/A 50 50 0 0 0 100 0/);
  });

  it("sweep=undefined defaults to 1", () => {
    const cmd = segmentCmd(pt("a", 0, 0), pt("b", 100, 0, { type: "arc", rx: 50 }));
    expect(cmd).toContain(" 0 1 "); // largeArc=0, sweep=1
  });

  it("largeArc=true emits flag 1", () => {
    const cmd = segmentCmd(pt("a", 0, 0), pt("b", 100, 0, { type: "arc", rx: 50, largeArc: true, sweep: false }));
    expect(cmd).toContain(" 1 0 ");
  });

  it("ry falls back to rx when undefined", () => {
    const cmd = segmentCmd(pt("a", 0, 0), pt("b", 100, 0, { type: "arc", rx: 80 }));
    expect(cmd).toMatch(/A 80 80/);
  });

  it("rx falls back to 50 when both are undefined", () => {
    const cmd = segmentCmd(pt("a", 0, 0), pt("b", 100, 0, { type: "arc" }));
    expect(cmd).toMatch(/A 50 50/);
  });
});

describe("segmentCmd — quadratic", () => {
  it("quadratic produces Q with cp1", () => {
    const cmd = segmentCmd(pt("a", 0, 0), pt("b", 100, 100, { type: "quadratic", cp1: { x: 50, y: 0 } }));
    expect(cmd).toMatch(/^ Q /);
    expect(cmd).toContain("50 0,");
    expect(cmd).toContain("100 100");
  });

  it("quadratic falls back to endpoint when cp1 missing", () => {
    const cmd = segmentCmd(pt("a", 0, 0), pt("b", 100, 100, { type: "quadratic" }));
    expect(cmd).toMatch(/Q 100 100, 100 100/);
  });
});

describe("segmentCmd — smooth", () => {
  it("smooth→smooth produces C using cp2/cp1", () => {
    const prev = pt("a", 0, 0, { type: "smooth", cp2: { x: 10, y: 0 } });
    const cur  = pt("b", 100, 0, { type: "smooth", cp1: { x: 90, y: 0 } });
    const cmd  = segmentCmd(prev, cur);
    expect(cmd).toMatch(/^ C /);
    expect(cmd).toContain("10 0,");
    expect(cmd).toContain("90 0,");
    expect(cmd).toContain("100 0");
  });

  it("smooth falls back to anchor positions when handles missing", () => {
    const prev = pt("a", 0, 0, { type: "smooth" });
    const cur  = pt("b", 100, 0, { type: "smooth" });
    const cmd  = segmentCmd(prev, cur);
    expect(cmd).toMatch(/^ C /);
    expect(cmd).toContain("0 0,");
    expect(cmd).toContain("100 0,");
  });

  it("corner→smooth produces C (prev smooth drives it)", () => {
    const prev = pt("a", 0, 0, { type: "smooth", cp2: { x: 20, y: 0 } });
    const cur  = pt("b", 100, 0, { type: "corner" });
    expect(segmentCmd(prev, cur)).toMatch(/^ C /);
  });
});

// ─── buildSvgPath ─────────────────────────────────────────────────────────────

describe("buildSvgPath", () => {
  it("empty array returns empty string", () => {
    expect(buildSvgPath([])).toBe("");
  });

  it("single point produces M...Z", () => {
    expect(buildSvgPath([pt("a", 50, 75)])).toBe("M 50 75 Z");
  });

  it("triangle produces M L L Z", () => {
    const d = buildSvgPath([pt("a", 0, 0), pt("b", 100, 0), pt("c", 50, 100)]);
    expect(d).toMatch(/^M 0 0/);
    expect(d).toContain("L 100 0");
    expect(d).toContain("L 50 100");
    expect(d).toMatch(/Z$/);
  });

  it("subpathStart splits into two M...Z rings", () => {
    const outer = [pt("a", 0, 0), pt("b", 200, 0), pt("c", 100, 200)];
    const inner = [
      pt("d", 50, 50, { subpathStart: true }),
      pt("e", 150, 50),
      pt("f", 100, 150),
    ];
    const d = buildSvgPath([...outer, ...inner]);
    // Two closed rings separated by a space
    const parts = d.split(" Z ");
    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatch(/^M 0 0/);
    expect(parts[1]).toMatch(/^M 50 50/);
    expect(d).toMatch(/Z$/);
  });

  it("subpathStart on very first point still produces one ring", () => {
    const pts = [
      pt("a", 0, 0, { subpathStart: true }),
      pt("b", 100, 0),
      pt("c", 50, 100),
    ];
    const d = buildSvgPath(pts);
    // Only one M command
    expect((d.match(/M /g) ?? []).length).toBe(1);
  });

  it("arc closing segment is included when first.type === arc", () => {
    const r = 160;
    const pts = [
      pt("a", 360, 200, { type: "arc", rx: r, ry: r, sweep: true }),
      pt("b", 200, 360, { type: "arc", rx: r, ry: r, sweep: true }),
      pt("c", 40,  200, { type: "arc", rx: r, ry: r, sweep: true }),
      pt("d", 200, 40,  { type: "arc", rx: r, ry: r, sweep: true }),
    ];
    const d = buildSvgPath(pts);
    // The path should contain 4 A commands (one per arc point, including closing)
    expect((d.match(/A /g) ?? []).length).toBe(4);
  });
});

// ─── generateCssOutput ────────────────────────────────────────────────────────

describe("generateCssOutput", () => {
  const W = 400, H = 400;

  it("empty points returns empty string", () => {
    expect(generateCssOutput([], W, H)).toBe("");
  });

  it("corner-only points with percent format → polygon()", () => {
    const points = [pt("a", 200, 0), pt("b", 400, 400), pt("c", 0, 400)];
    const css = generateCssOutput(points, W, H, "percent");
    expect(css).toMatch(/^clip-path: polygon\(/);
    expect(css).toContain("50.0%");
    expect(css).not.toContain("path(");
  });

  it("corner-only points with pixel format → polygon() with px", () => {
    const points = [pt("a", 100, 0), pt("b", 300, 0), pt("c", 200, 200)];
    const css = generateCssOutput(points, W, H, "pixel");
    expect(css).toMatch(/^clip-path: polygon\(/);
    expect(css).toContain("100.0px");
    expect(css).not.toContain("%");
  });

  it("smooth points → path() regardless of format flag", () => {
    const points = [
      pt("a", 0, 0, { type: "smooth", cp2: { x: 50, y: 0 } }),
      pt("b", 200, 0),
      pt("c", 100, 200),
    ];
    const css = generateCssOutput(points, W, H, "percent");
    expect(css).toMatch(/^clip-path: path\("/);
    expect(css).not.toContain("polygon(");
  });

  it("arc points → path()", () => {
    const points = [
      pt("a", 360, 200),
      pt("b", 40, 200, { type: "arc", rx: 160, ry: 160, sweep: false }),
    ];
    expect(generateCssOutput(points, W, H, "percent")).toMatch(/^clip-path: path\("/);
  });

  it("explicit path format converts corner-only to path()", () => {
    const points = [pt("a", 0, 0), pt("b", 100, 0), pt("c", 50, 100)];
    const css = generateCssOutput(points, W, H, "path");
    expect(css).toMatch(/^clip-path: path\("/);
    expect(css).not.toContain("polygon(");
  });

  it("subpath → path(evenodd,...)", () => {
    const outer = [pt("a", 0, 0), pt("b", 400, 0), pt("c", 400, 400), pt("d", 0, 400)];
    const inner = [
      pt("e", 100, 100, { subpathStart: true }),
      pt("f", 300, 100),
      pt("g", 300, 300),
      pt("h", 100, 300),
    ];
    const css = generateCssOutput([...outer, ...inner], W, H, "percent");
    expect(css).toMatch(/^clip-path: path\(evenodd,/);
  });

  it("percent coords scale correctly", () => {
    // Point at (100,200) on 400x400 = 25% 50%
    const points = [pt("a", 100, 200), pt("b", 400, 0), pt("c", 0, 400)];
    const css = generateCssOutput(points, W, H, "percent");
    expect(css).toContain("25.0%");
    expect(css).toContain("50.0%");
  });
});
