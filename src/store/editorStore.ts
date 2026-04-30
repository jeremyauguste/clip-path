import { create } from "zustand";
import { PathPoint, CanvasSettings, PreviewMode } from "@/types/shape";
import { generateCssOutput } from "@/lib/cssGenerator";

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

  // Canvas
  setCanvasSettings: (settings: Partial<CanvasSettings>) => void;
  setPreviewMode: (mode: PreviewMode) => void;

  // Tool
  setActiveTool: (tool: "select" | "pen" | "hand") => void;

  // CSS
  syncCssFromPoints: () => void;
  setCssOutput: (css: string) => void;

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
      return { ...p, type: "corner" as const, cp1: undefined, cp2: undefined };
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
    const css = generateCssOutput(points, canvasSettings.width, canvasSettings.height);
    set({ cssOutput: css });
  },

  setCssOutput: (css) => set({ cssOutput: css }),

  loadEditorState: (state, cssOutput) => {
    set({
      points: state.points,
      canvasSettings: state.canvasSettings,
      cssOutput,
      history: [],
      future: [],
      selectedPointId: null,
    });
  },
}));
