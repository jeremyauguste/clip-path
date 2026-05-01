import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/cssGenerator", () => ({
  generateCssOutput: () => "clip-path: polygon(0% 0%, 100% 0%, 100% 100%);",
  buildSvgPath: () => "M 0 0 L 100 0 L 100 100 Z",
}));

vi.mock("@/lib/bezierBounds", () => ({
  computeShapeBounds: () => ({ minX: 0, minY: 0, maxX: 100, maxY: 100 }),
}));

import { useEditorStore } from "@/store/editorStore";
import type { PathPoint } from "@/types/shape";

function pt(id: string, x: number, y: number): PathPoint {
  return { id, x, y, type: "corner" };
}

function getStore() {
  return useEditorStore.getState();
}

function reset() {
  useEditorStore.setState({
    points: [],
    history: [],
    future: [],
    selectedPointId: null,
    canvasSettings: {
      width: 400,
      height: 400,
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
  });
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function push() { getStore().pushHistory(); }
function undo() { getStore().undo(); }
function redo() { getStore().redo(); }
function setPoints(pts: PathPoint[]) { getStore().setPoints(pts); }
function setImg(x: number, y: number) {
  getStore().setCanvasSettings({ imagePosition: { x, y } });
}
function setSize(s: number) {
  getStore().setCanvasSettings({ imageSize: s });
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe("undo / redo — points", () => {
  beforeEach(reset);

  it("undo reverts a point addition", () => {
    push(); setPoints([pt("a", 10, 10)]);
    undo();
    expect(getStore().points).toHaveLength(0);
  });

  it("redo reapplies a point addition", () => {
    push(); setPoints([pt("a", 10, 10)]);
    undo();
    redo();
    expect(getStore().points).toHaveLength(1);
    expect(getStore().points[0].id).toBe("a");
  });

  it("full round-trip: 3 additions → undo×3 → redo×3", () => {
    push(); setPoints([pt("a", 10, 10)]);
    push(); setPoints([pt("a", 10, 10), pt("b", 20, 20)]);
    push(); setPoints([pt("a", 10, 10), pt("b", 20, 20), pt("c", 30, 30)]);

    undo(); expect(getStore().points).toHaveLength(2);
    undo(); expect(getStore().points).toHaveLength(1);
    undo(); expect(getStore().points).toHaveLength(0);

    redo(); expect(getStore().points).toHaveLength(1);
    redo(); expect(getStore().points).toHaveLength(2);
    redo(); expect(getStore().points).toHaveLength(3);
  });

  it("redo past end is a no-op", () => {
    push(); setPoints([pt("a", 10, 10)]);
    undo();
    redo();
    redo(); // already at tip
    expect(getStore().points).toHaveLength(1);
    expect(getStore().future).toHaveLength(0);
  });

  it("undo past beginning is a no-op", () => {
    undo();
    expect(getStore().points).toHaveLength(0);
    expect(getStore().history).toHaveLength(0);
  });

  it("new change after undo clears future", () => {
    push(); setPoints([pt("a", 10, 10)]);
    push(); setPoints([pt("a", 10, 10), pt("b", 20, 20)]);
    undo();

    push(); setPoints([pt("c", 99, 99)]); // branch off
    redo(); // should be no-op
    expect(getStore().points).toHaveLength(1);
    expect(getStore().points[0].id).toBe("c");
  });

  it("undo then redo leaves history in correct state for further undo", () => {
    push(); setPoints([pt("a", 10, 10)]);
    push(); setPoints([pt("a", 10, 10), pt("b", 20, 20)]);

    undo(); // → [a]
    redo(); // → [a, b]
    undo(); // → [a] again
    expect(getStore().points).toHaveLength(1);
  });

  it("pushHistory called without a subsequent change does not corrupt redo", () => {
    // Simulates a canvas click that calls pushHistory but doesn't change anything
    push(); setPoints([pt("a", 10, 10)]);
    undo();
    expect(getStore().future).toHaveLength(1);

    // Spurious pushHistory (e.g. clicking canvas without dragging)
    push(); // clears future!

    // Redo should be gone now
    expect(getStore().future).toHaveLength(0);
    redo();
    expect(getStore().points).toHaveLength(0); // stays undone
  });
});

describe("undo / redo — image position", () => {
  beforeEach(reset);

  it("undo restores previous image position", () => {
    push(); setImg(70, 30);
    undo();
    expect(getStore().canvasSettings.imagePosition).toEqual({ x: 50, y: 50 });
  });

  it("redo restores the newer image position", () => {
    push(); setImg(70, 30);
    undo();
    redo();
    expect(getStore().canvasSettings.imagePosition).toEqual({ x: 70, y: 30 });
  });

  it("multiple image position changes undo/redo correctly", () => {
    push(); setImg(10, 10);
    push(); setImg(20, 20);
    push(); setImg(30, 30);

    undo(); expect(getStore().canvasSettings.imagePosition).toEqual({ x: 20, y: 20 });
    undo(); expect(getStore().canvasSettings.imagePosition).toEqual({ x: 10, y: 10 });
    undo(); expect(getStore().canvasSettings.imagePosition).toEqual({ x: 50, y: 50 });

    redo(); expect(getStore().canvasSettings.imagePosition).toEqual({ x: 10, y: 10 });
    redo(); expect(getStore().canvasSettings.imagePosition).toEqual({ x: 20, y: 20 });
    redo(); expect(getStore().canvasSettings.imagePosition).toEqual({ x: 30, y: 30 });
  });
});

describe("undo / redo — image size", () => {
  beforeEach(reset);

  it("undo restores previous image size", () => {
    push(); setSize(200);
    undo();
    expect(getStore().canvasSettings.imageSize).toBe(100);
  });

  it("redo restores the newer image size", () => {
    push(); setSize(200);
    undo();
    redo();
    expect(getStore().canvasSettings.imageSize).toBe(200);
  });
});

describe("undo / redo — mixed points and image", () => {
  beforeEach(reset);

  it("points and image position are both restored together", () => {
    // state 0: points=[], img={50,50}
    push(); setPoints([pt("a", 10, 10)]); setImg(70, 30);
    // state 1: points=[a], img={70,30}
    push(); setPoints([pt("a", 10, 10), pt("b", 20, 20)]); setImg(90, 10);
    // state 2: points=[a,b], img={90,10}

    undo();
    expect(getStore().points).toHaveLength(1);
    expect(getStore().canvasSettings.imagePosition).toEqual({ x: 70, y: 30 });

    undo();
    expect(getStore().points).toHaveLength(0);
    expect(getStore().canvasSettings.imagePosition).toEqual({ x: 50, y: 50 });

    redo();
    expect(getStore().points).toHaveLength(1);
    expect(getStore().canvasSettings.imagePosition).toEqual({ x: 70, y: 30 });

    redo();
    expect(getStore().points).toHaveLength(2);
    expect(getStore().canvasSettings.imagePosition).toEqual({ x: 90, y: 10 });
  });
});
