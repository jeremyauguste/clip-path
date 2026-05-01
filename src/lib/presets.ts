import { PathPoint } from "@/types/shape";

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function pts(coords: [number, number][]): PathPoint[] {
  return coords.map(([x, y]) => ({ id: uid(), x, y, type: "corner" }));
}

export function generatePolygon(sides: number): PathPoint[] {
  const cx = 200, cy = 200, r = 160;
  return pts(
    Array.from({ length: sides }, (_, i) => {
      const angle = (i * (360 / sides) - 90) * (Math.PI / 180);
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as [number, number];
    })
  );
}

export function generateStar(numPoints: number): PathPoint[] {
  const cx = 200, cy = 200, outer = 160, inner = 65;
  return pts(
    Array.from({ length: numPoints * 2 }, (_, i) => {
      const r = i % 2 === 0 ? outer : inner;
      const angle = (i * (180 / numPoints) - 90) * (Math.PI / 180);
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as [number, number];
    })
  );
}

// All presets assume a 400x400 canvas
export const PRESETS: Record<string, { label: string; points: () => PathPoint[] }> = {
  triangle: {
    label: "Triangle",
    points: () => pts([[200, 50], [350, 350], [50, 350]]),
  },
  rectangle: {
    label: "Rectangle",
    points: () => pts([[50, 50], [350, 50], [350, 350], [50, 350]]),
  },
  pentagon: {
    label: "Pentagon",
    points: () => {
      const cx = 200, cy = 200, r = 160;
      return pts(
        Array.from({ length: 5 }, (_, i) => {
          const angle = (i * 72 - 90) * (Math.PI / 180);
          return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as [number, number];
        })
      );
    },
  },
  hexagon: {
    label: "Hexagon",
    points: () => {
      const cx = 200, cy = 200, r = 160;
      return pts(
        Array.from({ length: 6 }, (_, i) => {
          const angle = (i * 60 - 90) * (Math.PI / 180);
          return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as [number, number];
        })
      );
    },
  },
  arrow: {
    label: "Arrow",
    points: () =>
      pts([[50, 150], [220, 150], [220, 80], [370, 200], [220, 320], [220, 250], [50, 250]]),
  },
  chevron: {
    label: "Chevron",
    points: () => pts([[50, 50], [250, 200], [50, 350], [100, 350], [300, 200], [100, 50]]),
  },
  parallelogram: {
    label: "Parallelogram",
    points: () => pts([[100, 50], [370, 50], [300, 350], [30, 350]]),
  },
  star: {
    label: "Star",
    points: () => {
      const cx = 200, cy = 200, outer = 160, inner = 65;
      return pts(
        Array.from({ length: 10 }, (_, i) => {
          const r = i % 2 === 0 ? outer : inner;
          const angle = (i * 36 - 90) * (Math.PI / 180);
          return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as [number, number];
        })
      );
    },
  },
  circle: {
    label: "Circle",
    points: () => {
      const cx = 200, cy = 200, r = 160;
      return [
        { id: uid(), x: cx + r, y: cy,     type: "arc" as const, rx: r, ry: r, largeArc: false, sweep: true },
        { id: uid(), x: cx,     y: cy + r, type: "arc" as const, rx: r, ry: r, largeArc: false, sweep: true },
        { id: uid(), x: cx - r, y: cy,     type: "arc" as const, rx: r, ry: r, largeArc: false, sweep: true },
        { id: uid(), x: cx,     y: cy - r, type: "arc" as const, rx: r, ry: r, largeArc: false, sweep: true },
      ];
    },
  },
  semicircle: {
    label: "Semicircle",
    points: () => {
      const cx = 200, cy = 220, r = 160;
      return [
        { id: uid(), x: cx - r, y: cy, type: "corner" as const },
        { id: uid(), x: cx + r, y: cy, type: "arc"    as const, rx: r, ry: r, largeArc: false, sweep: false },
      ];
    },
  },
};
