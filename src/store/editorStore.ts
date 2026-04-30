import { create } from "zustand";
import { PathPoint, CanvasSettings, PreviewMode } from "@/types/shape";
import { generateCssOutput } from "@/lib/cssGenerator";
import { computeShapeBounds } from "@/lib/bezierBounds";

const MAX_HISTORY = 50;

interface EditorStore {
  points: PathPoint[];
  history: PathPoint[][];
  future: PathPoint[][];
  canvasSettings: CanvasSettings;
  selectedPointId: string | null;
  activeTool: "select" | "pen" | "hand";
  cssOutput: string;

  // Viewport
  panOffset: { x: number; y: number };
  zoom: number;
  setPanOffset: (offset: { x: number; y: number }) => void;
  setZoom: (zoom: number) => void;
  zoomToward: (delta: number, cursorX: number, cursorY: number) => void;

  // Point actions
  setPoints: (points: PathPoint[]) => void;
  addPoint: (point: PathPoint) => void;
  updatePoint: (id: string, updates: Partial<PathPoint>) => void;
  removePoint: (id: string) => void;
  togglePointType: (id: string) => void;
  setSelectedPointId: (id: string | null) => void;

  // History
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  pushSpecificHistory: (pts: PathPoint[]) => void;

  // Canvas
  setCanvasSettings: (settings: Partial<CanvasSettings>) => void;
  setPreviewMode: (mode: PreviewMode) => void;

  // Tool
  setActiveTool: (tool: "select" | "pen" | "hand") => void;

  // CSS
  cssFormat: "percent" | "pixel";
  setCssFormat: (format: "percent" | "pixel") => void;
  syncCssFromPoints: () => void;
  setCssOutput: (css: string) => void;

  // Normalize origin: shift all points so none are negative, adjust canvas and panOffset
  normalizeOrigin: () => void;

  // Load saved shape
  loadEditorState: (state: { points: PathPoint[]; canvasSettings: CanvasSettings }, cssOutput: string) => void;
}

const defaultCanvas: CanvasSettings = {
  width: 400,
  height: 400,
  previewMode: "solid",
  previewColor: "#6366f1",
};

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;

export const useEditorStore = create<EditorStore>((set, get) => ({
  points: [],
  history: [],
  future: [],
  canvasSettings: defaultCanvas,
  selectedPointId: null,
  activeTool: "select",
  cssOutput: "",
  cssFormat: "percent",
  panOffset: { x: 0, y: 0 },
  zoom: 1,

  setPanOffset: (offset) => set({ panOffset: offset }),

  setZoom: (zoom) => set({ zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)) }),

  zoomToward: (delta, cursorX, cursorY) => {
    const { zoom, panOffset } = get();
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * (1 - delta * 0.01)));
    const scale = newZoom / zoom;
    set({
      zoom: newZoom,
      panOffset: {
        x: cursorX - (cursorX - panOffset.x) * scale,
        y: cursorY - (cursorY - panOffset.y) * scale,
      },
    });
  },

  pushHistory: () => {
    const { points, history } = get();
    set({
      history: [...history.slice(-MAX_HISTORY + 1), [...points]],
      future: [],
    });
  },

  pushSpecificHistory: (pts) => {
    const { history } = get();
    set({ history: [...history.slice(-MAX_HISTORY + 1), [...pts]], future: [] });
  },

  setPoints: (points) => {
    set({ points });
    get().syncCssFromPoints();
  },

  addPoint: (point) => {
    get().pushHistory();
    const points = [...get().points, point];
    set({ points });
    get().syncCssFromPoints();
  },

  updatePoint: (id, updates) => {
    const points = get().points.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    );
    set({ points });
    get().syncCssFromPoints();
  },

  removePoint: (id) => {
    get().pushHistory();
    const points = get().points.filter((p) => p.id !== id);
    set({ points, selectedPointId: null });
    get().syncCssFromPoints();
  },

  togglePointType: (id) => {
    get().pushHistory();
    const points = get().points.map((p) => {
      if (p.id !== id) return p;
      if (p.type === "corner") {
        return {
          ...p,
          type: "smooth" as const,
          cp1: p.cp1 ?? { x: p.x - 40, y: p.y },
          cp2: p.cp2 ?? { x: p.x + 40, y: p.y },
        };
      }
      if (p.type === "smooth") {
        return {
          ...p,
          type: "quadratic" as const,
          cp1: { x: p.x, y: p.y - 60 },
          cp2: undefined,
        };
      }
      if (p.type === "quadratic") {
        return {
          ...p,
          type: "arc" as const,
          cp1: undefined,
          cp2: undefined,
          rx: 80,
          ry: 80,
          largeArc: false,
          sweep: true,
        };
      }
      return { ...p, type: "corner" as const, cp1: undefined, cp2: undefined, rx: undefined, ry: undefined, largeArc: undefined, sweep: undefined };
    });
    set({ points });
    get().syncCssFromPoints();
  },

  setSelectedPointId: (id) => set({ selectedPointId: id }),

  undo: () => {
    const { history, points, future } = get();
    if (!history.length) return;
    const prev = history[history.length - 1];
    set({
      points: prev,
      history: history.slice(0, -1),
      future: [points, ...future],
    });
    get().syncCssFromPoints();
  },

  redo: () => {
    const { future, points, history } = get();
    if (!future.length) return;
    const next = future[0];
    set({
      points: next,
      future: future.slice(1),
      history: [...history, points],
    });
    get().syncCssFromPoints();
  },

  setCanvasSettings: (settings) => {
    set({ canvasSettings: { ...get().canvasSettings, ...settings } });
  },

  setPreviewMode: (mode) => {
    set({ canvasSettings: { ...get().canvasSettings, previewMode: mode } });
  },

  setActiveTool: (tool) => set({ activeTool: tool }),

  syncCssFromPoints: () => {
    const { points, canvasSettings } = get();

    let { width, height } = canvasSettings;
    if (points.length > 0) {
      const bounds = computeShapeBounds(points);
      if (bounds) {
        width  = Math.max(1, Math.ceil(bounds.maxX));
        height = Math.max(1, Math.ceil(bounds.maxY));
      }
    }

    const updatedSettings =
      width !== canvasSettings.width || height !== canvasSettings.height
        ? { ...canvasSettings, width, height }
        : canvasSettings;

    const css = generateCssOutput(points, width, height, get().cssFormat);
    set({ cssOutput: css, canvasSettings: updatedSettings });
  },

  setCssOutput: (css) => set({ cssOutput: css }),

  setCssFormat: (format) => {
    set({ cssFormat: format });
    get().syncCssFromPoints();
  },

  normalizeOrigin: () => {
    const { points, canvasSettings, panOffset, zoom } = get();
    if (!points.length) return;
    const bounds = computeShapeBounds(points);
    if (!bounds) return;
    const { minX, minY, maxX, maxY } = bounds;
    if (minX >= 0 && minY >= 0) return;
    const shiftX = minX < 0 ? -minX : 0;
    const shiftY = minY < 0 ? -minY : 0;
    const shifted = points.map((p) => ({
      ...p,
      x: p.x + shiftX,
      y: p.y + shiftY,
      cp1: p.cp1 ? { x: p.cp1.x + shiftX, y: p.cp1.y + shiftY } : undefined,
      cp2: p.cp2 ? { x: p.cp2.x + shiftX, y: p.cp2.y + shiftY } : undefined,
    }));
    const newWidth = Math.max(1, Math.ceil(maxX + shiftX));
    const newHeight = Math.max(1, Math.ceil(maxY + shiftY));
    const css = generateCssOutput(shifted, newWidth, newHeight, get().cssFormat);
    set({
      points: shifted,
      canvasSettings: { ...canvasSettings, width: newWidth, height: newHeight },
      cssOutput: css,
      panOffset: {
        x: panOffset.x - shiftX * zoom,
        y: panOffset.y - shiftY * zoom,
      },
    });
  },

  loadEditorState: (state, cssOutput) => {
    set({
      points: state.points,
      canvasSettings: state.canvasSettings,
      cssOutput,
      cssFormat: "percent",
      history: [],
      future: [],
      selectedPointId: null,
    });
  },
}));
