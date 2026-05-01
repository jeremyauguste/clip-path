"use client";

import { useRef, useCallback, RefObject, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useEditorStore } from "@/store/editorStore";
import { PathPoint } from "@/types/shape";
import { buildSvgPath } from "@/lib/cssGenerator";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function midpoint(ax: number, ay: number, bx: number, by: number) {
  return { x: (ax + bx) / 2, y: (ay + by) / 2 };
}

// Returns the center of the circle that produces the given SVG arc.
// sweep=true → center is to the left of the P1→P2 direction (SVG y-down convention).
function computeArcCenter(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  r: number,
  sweep: boolean,
): { x: number; y: number } | null {
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-6 || d > 2 * r) return null;
  const midX = (p1.x + p2.x) / 2, midY = (p1.y + p2.y) / 2;
  const h = Math.sqrt(Math.max(0, r * r - (d / 2) * (d / 2)));
  const px = -dy / d, py = dx / d; // perp unit vector (left of P1→P2)
  const sign = sweep ? 1 : -1;
  return { x: midX + sign * h * px, y: midY + sign * h * py };
}

// Closest point on segment AB to point P
function closestPointOnSegment(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number
) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: ax, y: ay, t: 0 };
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return { x: ax + t * dx, y: ay + t * dy, t };
}

interface Props {
  width: number;
  height: number;
  zoom: number;
  viewportRef: RefObject<HTMLDivElement | null>;
  panOffset: { x: number; y: number };
  panOffsetRef: RefObject<{ x: number; y: number }>;
  zoomRef: RefObject<number>;
}

const TYPE_LABEL: Record<string, string> = {
  corner: "Corner",
  smooth: "Smooth (Cubic)",
  quadratic: "Quadratic",
  arc: "Arc",
};

// Arc midpoint via sagitta formula (works for rx≈ry circular arcs and gives a reasonable
// visual approximation for elliptical ones).
function arcHandlePoint(p1: PathPoint, p2: PathPoint): { x: number; y: number } {
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-6) return { x: p1.x, y: p1.y };

  const rx = p2.rx ?? 50;
  const half = d / 2;
  const r = Math.max(rx, half + 0.01);
  const sagittaBase = Math.sqrt(r * r - half * half);
  const h = p2.largeArc ? r + sagittaBase : r - sagittaBase;
  const ux = dx / d, uy = dy / d;
  const sign = p2.sweep !== false ? 1 : -1;
  return {
    x: (p1.x + p2.x) / 2 + h * (-sign * uy),
    y: (p1.y + p2.y) / 2 + h * (sign * ux),
  };
}

// Convert a drag position into updated arc parameters.
function dragToArcParams(drag: { x: number; y: number }, p1: PathPoint, p2: PathPoint): Partial<PathPoint> {
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-6) return {};

  const ux = dx / d, uy = dy / d;
  const midX = (p1.x + p2.x) / 2, midY = (p1.y + p2.y) / 2;

  // Signed perpendicular distance from drag to chord.
  // Positive side = sweep=1 direction = (-uy, ux).
  const hSigned = (drag.x - midX) * (-uy) + (drag.y - midY) * ux;
  const sweep = hSigned > 0;
  const h = Math.max(Math.abs(hSigned), 2); // min 2px sagitta
  const half = d / 2;
  const r = (h * h + half * half) / (2 * h);
  const largeArc = h > half;

  return { rx: r, ry: r, sweep, largeArc };
}

function PointTooltip({ point, index, clientX, clientY }: { point: PathPoint; index: number; clientX: number; clientY: number }) {
  const x = Math.min(clientX + 14, window.innerWidth - 170);
  const y = Math.max(clientY - 8, 8);
  const fmt = (n: number) => n.toFixed(1);
  return (
    <div
      className="fixed z-50 pointer-events-none bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-xs shadow-xl min-w-[140px]"
      style={{ left: x, top: y }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-neutral-500 dark:text-neutral-500">#{index + 1}</span>
        <span className="text-neutral-800 dark:text-neutral-200 font-medium">{TYPE_LABEL[point.type] ?? point.type}</span>
      </div>
      <div className="flex gap-3 text-neutral-700 dark:text-neutral-300">
        <span><span className="text-neutral-500 dark:text-neutral-500">x </span>{fmt(point.x)}</span>
        <span><span className="text-neutral-500 dark:text-neutral-500">y </span>{fmt(point.y)}</span>
      </div>
      {point.cp1 && (
        <div className="mt-1 text-neutral-600 dark:text-neutral-500">
          cp1 <span className="text-neutral-700 dark:text-neutral-400">({fmt(point.cp1.x)}, {fmt(point.cp1.y)})</span>
        </div>
      )}
      {point.cp2 && (
        <div className="text-neutral-600 dark:text-neutral-500">
          cp2 <span className="text-neutral-700 dark:text-neutral-400">({fmt(point.cp2.x)}, {fmt(point.cp2.y)})</span>
        </div>
      )}
    </div>
  );
}

export function SvgOverlay({ width, height, zoom, viewportRef, panOffset, panOffsetRef, zoomRef }: Props) {
  const {
    points,
    selectedPointId,
    setSelectedPointId,
    updatePoint,
    removePoint,
    togglePointType,
    setPoints,
    pushHistory,
    normalizeOrigin,
    activeTool,
  } = useEditorStore();

  const draggingId = useRef<string | null>(null);
  const draggingHandle = useRef<"cp1" | "cp2" | null>(null);
  const draggingArcId = useRef<string | null>(null);
  const dragStartCanvasPos = useRef<{ x: number; y: number } | null>(null);
  const dragStartPoint = useRef<PathPoint | null>(null);
  const dragArcCenter = useRef<{ x: number; y: number; r: number } | null>(null);
  const shiftWasActive = useRef(false);
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number; edgeIndex: number } | null>(null);
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);
  const [pointTooltip, setPointTooltip] = useState<{ point: PathPoint; index: number; clientX: number; clientY: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if ((e.target as Element).closest("[data-point]")) return;
      setSelectedPointId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [setSelectedPointId]);

  // Convert viewport client coords → canvas coords using live refs
  const toCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const rect = viewportRef.current!.getBoundingClientRect();
      return {
        x: (clientX - rect.left - panOffsetRef.current.x) / zoomRef.current,
        y: (clientY - rect.top - panOffsetRef.current.y) / zoomRef.current,
      };
    },
    [viewportRef, panOffsetRef, zoomRef]
  );

  const startDrag = useCallback(
    (e: React.PointerEvent, id: string, handle?: "cp1" | "cp2") => {
      if (activeTool !== "select" && activeTool !== "pen") return;
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      draggingId.current = id;
      draggingHandle.current = handle ?? null;
      setPointTooltip(null);
      pushHistory();
      if (!handle) {
        const pos = toCanvas(e.clientX, e.clientY);
        dragStartCanvasPos.current = pos;
        const pt = useEditorStore.getState().points.find((p) => p.id === id) ?? null;
        dragStartPoint.current = pt;
        shiftWasActive.current = e.shiftKey;
        dragArcCenter.current = null;
        if (e.shiftKey && pt?.type === "arc") {
          const pts = useEditorStore.getState().points;
          const idx = pts.findIndex((p) => p.id === id);
          if (idx >= 0) {
            const p1 = idx > 0 ? pts[idx - 1] : pts[pts.length - 1];
            const r = pt.rx ?? 50;
            const center = computeArcCenter(p1, pos, r, pt.sweep !== false);
            if (center) dragArcCenter.current = { ...center, r };
          }
        }
      }
    },
    [activeTool, pushHistory, toCanvas]
  );

  const startArcDrag = useCallback(
    (e: React.PointerEvent, id: string) => {
      if (activeTool !== "select") return;
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      draggingArcId.current = id;
      setPointTooltip(null);
      pushHistory();
    },
    [activeTool, pushHistory]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!draggingId.current && !draggingArcId.current) return;
      e.stopPropagation();
      let { x: cx, y: cy } = toCanvas(e.clientX, e.clientY);
      const { snapToGrid, gridSize } = useEditorStore.getState();
      if (snapToGrid && !draggingArcId.current && !draggingHandle.current) {
        cx = Math.round(cx / gridSize) * gridSize;
        cy = Math.round(cy / gridSize) * gridSize;
      }

      if (draggingArcId.current) {
        const id = draggingArcId.current;
        const pts = useEditorStore.getState().points;
        const idx = pts.findIndex((p) => p.id === id);
        if (idx >= 0) {
          const p2 = pts[idx];
          const p1 = idx > 0 ? pts[idx - 1] : pts[pts.length - 1];
          updatePoint(id, dragToArcParams({ x: cx, y: cy }, p1, p2));
        }
        return;
      }

      const id = draggingId.current!;
      const handle = draggingHandle.current;

      const svgEl = e.currentTarget;

      if (handle === "cp1") {
        const el = svgEl.querySelector(`[data-handle="${id}-${handle}"]`);
        if (el) { el.setAttribute("cx", String(cx)); el.setAttribute("cy", String(cy)); }
        updatePoint(id, { cp1: { x: cx, y: cy } });
      } else if (handle === "cp2") {
        const el = svgEl.querySelector(`[data-handle="${id}-${handle}"]`);
        if (el) { el.setAttribute("cx", String(cx)); el.setAttribute("cy", String(cy)); }
        updatePoint(id, { cp2: { x: cx, y: cy } });
      } else {
        // Re-anchor reference when Shift is first pressed mid-drag
        if (e.shiftKey && !shiftWasActive.current) {
          dragStartCanvasPos.current = { x: cx, y: cy };
          const pt = useEditorStore.getState().points.find((p) => p.id === id) ?? null;
          dragStartPoint.current = pt;
          dragArcCenter.current = null;
          if (pt?.type === "arc") {
            const pts = useEditorStore.getState().points;
            const idx = pts.findIndex((p) => p.id === id);
            if (idx >= 0) {
              const p1 = idx > 0 ? pts[idx - 1] : pts[pts.length - 1];
              const r = pt.rx ?? 50;
              const center = computeArcCenter(p1, { x: cx, y: cy }, r, pt.sweep !== false);
              if (center) dragArcCenter.current = { ...center, r };
            }
          }
        }
        shiftWasActive.current = e.shiftKey;

        const start = dragStartCanvasPos.current;
        const startPt = dragStartPoint.current;

        if (e.shiftKey && start && startPt && (startPt.cp1 || startPt.cp2)) {
          // Bezier: translate handles with the anchor
          const dx = cx - start.x;
          const dy = cy - start.y;
          const newCp1 = startPt.cp1 ? { x: startPt.cp1.x + dx, y: startPt.cp1.y + dy } : undefined;
          const newCp2 = startPt.cp2 ? { x: startPt.cp2.x + dx, y: startPt.cp2.y + dy } : undefined;
          const h1 = svgEl.querySelector(`[data-handle="${id}-cp1"]`);
          if (h1 && newCp1) { h1.setAttribute("cx", String(newCp1.x)); h1.setAttribute("cy", String(newCp1.y)); }
          const h2 = svgEl.querySelector(`[data-handle="${id}-cp2"]`);
          if (h2 && newCp2) { h2.setAttribute("cx", String(newCp2.x)); h2.setAttribute("cy", String(newCp2.y)); }
          const l1 = svgEl.querySelector(`[data-handle-line="${id}-cp1"]`);
          if (l1 && newCp1) { l1.setAttribute("x1", String(cx)); l1.setAttribute("y1", String(cy)); l1.setAttribute("x2", String(newCp1.x)); l1.setAttribute("y2", String(newCp1.y)); }
          const l2 = svgEl.querySelector(`[data-handle-line="${id}-cp2"]`);
          if (l2 && newCp2) { l2.setAttribute("x1", String(cx)); l2.setAttribute("y1", String(cy)); l2.setAttribute("x2", String(newCp2.x)); l2.setAttribute("y2", String(newCp2.y)); }
          const el = svgEl.querySelector(`[data-point="${id}"]`);
          if (el) { el.setAttribute("cx", String(cx)); el.setAttribute("cy", String(cy)); }
          updatePoint(id, { x: cx, y: cy, ...(newCp1 && { cp1: newCp1 }), ...(newCp2 && { cp2: newCp2 }) });
        } else if (e.shiftKey && startPt?.type === "arc" && dragArcCenter.current) {
          // Arc: slide endpoint along the existing circle
          const { x: ox, y: oy, r } = dragArcCenter.current;
          const dx = cx - ox, dy = cy - oy;
          const dist = Math.hypot(dx, dy);
          if (dist > 1e-6) { cx = ox + (dx / dist) * r; cy = oy + (dy / dist) * r; }
          const el = svgEl.querySelector(`[data-point="${id}"]`);
          if (el) { el.setAttribute("cx", String(cx)); el.setAttribute("cy", String(cy)); }
          updatePoint(id, { x: cx, y: cy });
        } else {
          const el = svgEl.querySelector(`[data-point="${id}"]`);
          if (el) { el.setAttribute("cx", String(cx)); el.setAttribute("cy", String(cy)); }
          updatePoint(id, { x: cx, y: cy });
        }
      }
    },
    [toCanvas, updatePoint]
  );

  const onPointerUp = useCallback(() => {
    if (draggingId.current || draggingArcId.current) normalizeOrigin();
    draggingId.current = null;
    draggingHandle.current = null;
    draggingArcId.current = null;
  }, [normalizeOrigin]);

  const handlePointDoubleClick = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      togglePointType(id);
    },
    [togglePointType]
  );

  const handlePointKeyDown = useCallback(
    (e: React.KeyboardEvent, id: string) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removePoint(id);
      }
    },
    [removePoint]
  );

  const handleSvgMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (activeTool !== "pen" || points.length < 2 || draggingId.current) {
        if (hoverPoint) setHoverPoint(null);
        return;
      }
      const { x: mx, y: my } = toCanvas(e.clientX, e.clientY);
      const threshold = 12 / zoom;
      let best: { x: number; y: number; edgeIndex: number; dist: number } | null = null;

      const edgeCount = points.length >= 3 ? points.length : points.length - 1;
      for (let i = 0; i < edgeCount; i++) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        const cp = closestPointOnSegment(mx, my, a.x, a.y, b.x, b.y);
        const dist = Math.hypot(cp.x - mx, cp.y - my);
        if (dist < threshold && (!best || dist < best.dist)) {
          best = { x: cp.x, y: cp.y, edgeIndex: i, dist };
        }
      }
      setHoverPoint(best ? { x: best.x, y: best.y, edgeIndex: best.edgeIndex } : null);
    },
    [activeTool, points, zoom, toCanvas, hoverPoint]
  );

  const handleSvgMouseLeave = useCallback(() => {
    setHoverPoint(null);
  }, []);

  const handleEdgeClick = useCallback(
    (e: React.MouseEvent, afterIndex: number, mx: number, my: number) => {
      if (activeTool !== "pen") return;
      e.stopPropagation();
      const { snapToGrid, gridSize } = useEditorStore.getState();
      if (snapToGrid) {
        mx = Math.round(mx / gridSize) * gridSize;
        my = Math.round(my / gridSize) * gridSize;
      }
      const newPoint: PathPoint = { id: uid(), x: mx, y: my, type: "corner" };
      pushHistory();
      const current = useEditorStore.getState().points;
      const updated = [
        ...current.slice(0, afterIndex + 1),
        newPoint,
        ...current.slice(afterIndex + 1),
      ];
      setPoints(updated);
    },
    [activeTool, pushHistory, setPoints]
  );


  // Scale handle sizes inversely with zoom so they stay visually consistent
  const r = 7 / zoom;
  const rHandle = 5 / zoom;
  const strokeW = 2 / zoom;
  const outlineStroke = 1.5 / zoom;

  return (
  <>
    <svg
      className="absolute inset-0 overflow-visible"
      width={width}
      height={height}
      style={{ cursor: activeTool === "pen" ? "crosshair" : activeTool === "select" ? "default" : "none", pointerEvents: activeTool === "hand" ? "none" : "auto" }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onMouseMove={handleSvgMouseMove}
      onMouseLeave={handleSvgMouseLeave}
      onClick={(e) => {
        if (activeTool === "pen" && hoverPoint) {
          handleEdgeClick(e, hoverPoint.edgeIndex, hoverPoint.x, hoverPoint.y);
        } else if (activeTool === "select") {
          setSelectedPointId(null);
        }
      }}
    >
      {/* Shape outline */}
      {points.length > 1 && (
        <path
          d={buildSvgPath(points)}
          fill="none"
          stroke="#a78bfa"
          strokeWidth={outlineStroke}
          strokeDasharray={`${4 / zoom} ${2 / zoom}`}
          pointerEvents="none"
        />
      )}

      {/* Edge midpoint targets (pen tool) */}
      {activeTool === "pen" &&
        points.map((p, i) => {
          if (i === points.length - 1 && points.length < 3) return null;
          const next = points[(i + 1) % points.length];
          const mid = midpoint(p.x, p.y, next.x, next.y);
          return (
            <circle
              key={`edge-${i}`}
              cx={mid.x}
              cy={mid.y}
              r={rHandle}
              fill="#a78bfa"
              fillOpacity={0.3}
              stroke="#a78bfa"
              strokeWidth={1 / zoom}
              className="cursor-copy"
              onClick={(e) => handleEdgeClick(e, i, mid.x, mid.y)}
            />
          );
        })}

      {/* Bezier control handles */}
      {points.map((p) => {
        if (p.type === "quadratic") {
          if (!p.cp1) return null;
          return (
            <g key={`handles-${p.id}`}>
              <line data-handle-line={`${p.id}-cp1`} x1={p.x} y1={p.y} x2={p.cp1.x} y2={p.cp1.y} stroke="#34d399" strokeWidth={1 / zoom} strokeDasharray={`${3 / zoom} ${2 / zoom}`} pointerEvents="none" />
              <circle
                data-handle={`${p.id}-cp1`}
                cx={p.cp1.x} cy={p.cp1.y} r={rHandle}
                fill="#34d399"
                className="cursor-move"
                onPointerDown={(e) => startDrag(e, p.id, "cp1")}
              />
            </g>
          );
        }
        if (p.type !== "smooth") return null;
        return (
          <g key={`handles-${p.id}`}>
            {p.cp1 && (
              <>
                <line data-handle-line={`${p.id}-cp1`} x1={p.x} y1={p.y} x2={p.cp1.x} y2={p.cp1.y} stroke="#fb923c" strokeWidth={1 / zoom} strokeDasharray={`${3 / zoom} ${2 / zoom}`} pointerEvents="none" />
                <circle
                  data-handle={`${p.id}-cp1`}
                  cx={p.cp1.x} cy={p.cp1.y} r={rHandle}
                  fill="#fb923c"
                  className="cursor-move"
                  onPointerDown={(e) => startDrag(e, p.id, "cp1")}
                />
              </>
            )}
            {p.cp2 && (
              <>
                <line data-handle-line={`${p.id}-cp2`} x1={p.x} y1={p.y} x2={p.cp2.x} y2={p.cp2.y} stroke="#fb923c" strokeWidth={1 / zoom} strokeDasharray={`${3 / zoom} ${2 / zoom}`} pointerEvents="none" />
                <circle
                  data-handle={`${p.id}-cp2`}
                  cx={p.cp2.x} cy={p.cp2.y} r={rHandle}
                  fill="#fb923c"
                  className="cursor-move"
                  onPointerDown={(e) => startDrag(e, p.id, "cp2")}
                />
              </>
            )}
          </g>
        );
      })}

      {/* Arc midpoint handles (select tool) */}
      {activeTool === "select" && points.map((p, i) => {
        if (p.type !== "arc") return null;
        const prev = i > 0 ? points[i - 1] : points[points.length - 1];
        if (!prev || points.length < 2) return null;
        const hp = arcHandlePoint(prev, p);
        return (
          <circle
            key={`arc-handle-${p.id}`}
            cx={hp.x}
            cy={hp.y}
            r={rHandle}
            fill="#38bdf8"
            stroke="white"
            strokeWidth={strokeW}
            className="cursor-move"
            onPointerDown={(e) => startArcDrag(e, p.id)}
          />
        );
      })}

      {/* Edge hover ghost (pen tool) */}
      {activeTool === "pen" && hoverPoint && (
        <circle
          cx={hoverPoint.x}
          cy={hoverPoint.y}
          r={r}
          fill="#a78bfa"
          fillOpacity={0.5}
          stroke="white"
          strokeWidth={strokeW}
          pointerEvents="none"
        />
      )}

      {/* Vertex points */}
      {points.map((p, i) => {
        const isSelected = selectedPointId === p.id;
        const isHovered = hoveredPointId === p.id;
        const solid = isSelected || isHovered;
        return (
          <circle
            key={p.id}
            data-point={p.id}
            cx={p.x} cy={p.y} r={r}
            fill={solid ? (isSelected ? "#f0abfc" : "#a78bfa") : "transparent"}
            stroke={isSelected ? "#f0abfc" : "#a78bfa"}
            strokeWidth={strokeW}
            tabIndex={0}
            className="cursor-move focus:outline-none"
            onPointerDown={(e) => startDrag(e, p.id)}
            onClick={(e) => { e.stopPropagation(); setSelectedPointId(p.id); }}
            onDoubleClick={(e) => handlePointDoubleClick(e, p.id)}
            onKeyDown={(e) => handlePointKeyDown(e, p.id)}
            onMouseEnter={(e) => {
              setHoveredPointId(p.id);
              if (!draggingId.current && !draggingArcId.current) setPointTooltip({ point: p, index: i, clientX: e.clientX, clientY: e.clientY });
            }}
            onMouseMove={(e) => { if (!draggingId.current && !draggingArcId.current) setPointTooltip((prev) => prev ? { ...prev, clientX: e.clientX, clientY: e.clientY } : null); }}
            onMouseLeave={() => { setHoveredPointId(null); setPointTooltip(null); }}
          />
        );
      })}
    </svg>

    {mounted && pointTooltip && createPortal(
      <PointTooltip
        point={pointTooltip.point}
        index={pointTooltip.index}
        clientX={pointTooltip.clientX}
        clientY={pointTooltip.clientY}
      />,
      document.body
    )}
  </>
  );
}

