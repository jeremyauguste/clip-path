"use client";

import { useRef, useCallback, RefObject, useState } from "react";
import { useEditorStore } from "@/store/editorStore";
import { PathPoint } from "@/types/shape";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function midpoint(ax: number, ay: number, bx: number, by: number) {
  return { x: (ax + bx) / 2, y: (ay + by) / 2 };
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
    activeTool,
  } = useEditorStore();

  const draggingId = useRef<string | null>(null);
  const draggingHandle = useRef<"cp1" | "cp2" | null>(null);
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number; edgeIndex: number } | null>(null);

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
      if (activeTool !== "select") return;
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      draggingId.current = id;
      draggingHandle.current = handle ?? null;
      pushHistory();
    },
    [activeTool, pushHistory]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!draggingId.current) return;
      e.stopPropagation();
      const { x, y } = toCanvas(e.clientX, e.clientY);
      const cx = Math.max(0, Math.min(width, x));
      const cy = Math.max(0, Math.min(height, y));

      const id = draggingId.current;
      const handle = draggingHandle.current;

      // Direct DOM update for smooth drag
      const svgEl = e.currentTarget;
      if (handle) {
        const el = svgEl.querySelector(`[data-handle="${id}-${handle}"]`);
        if (el) { el.setAttribute("cx", String(cx)); el.setAttribute("cy", String(cy)); }
      } else {
        const el = svgEl.querySelector(`[data-point="${id}"]`);
        if (el) { el.setAttribute("cx", String(cx)); el.setAttribute("cy", String(cy)); }
      }

      if (handle === "cp1") {
        updatePoint(id, { cp1: { x: cx, y: cy } });
      } else if (handle === "cp2") {
        updatePoint(id, { cp2: { x: cx, y: cy } });
      } else {
        updatePoint(id, { x: cx, y: cy });
      }
    },
    [toCanvas, width, height, updatePoint]
  );

  const onPointerUp = useCallback(() => {
    draggingId.current = null;
    draggingHandle.current = null;
  }, []);

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

  const buildPath = (): string => {
    if (!points.length) return "";
    const [first, ...rest] = points;
    let d = `M ${first.x} ${first.y}`;
    for (let i = 0; i < rest.length; i++) {
      const p = rest[i];
      const prev = points[i];
      if (p.type === "smooth" || prev.type === "smooth") {
        const cp1 = prev.cp2 ?? { x: prev.x, y: prev.y };
        const cp2 = p.cp1 ?? { x: p.x, y: p.y };
        d += ` C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p.x} ${p.y}`;
      } else {
        d += ` L ${p.x} ${p.y}`;
      }
    }
    if (points.length > 2) {
      const last = points[points.length - 1];
      if (last.type === "smooth" || first.type === "smooth") {
        const cp1 = last.cp2 ?? { x: last.x, y: last.y };
        const cp2 = first.cp1 ?? { x: first.x, y: first.y };
        d += ` C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${first.x} ${first.y}`;
      } else {
        d += " Z";
      }
    }
    return d;
  };

  // Scale handle sizes inversely with zoom so they stay visually consistent
  const r = 7 / zoom;
  const rHandle = 5 / zoom;
  const strokeW = 2 / zoom;
  const outlineStroke = 1.5 / zoom;

  return (
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
        }
      }}
    >
      {/* Shape outline */}
      {points.length > 1 && (
        <path
          d={buildPath()}
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
        if (p.type !== "smooth") return null;
        return (
          <g key={`handles-${p.id}`}>
            {p.cp1 && (
              <>
                <line x1={p.x} y1={p.y} x2={p.cp1.x} y2={p.cp1.y} stroke="#fb923c" strokeWidth={1 / zoom} strokeDasharray={`${3 / zoom} ${2 / zoom}`} pointerEvents="none" />
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
                <line x1={p.x} y1={p.y} x2={p.cp2.x} y2={p.cp2.y} stroke="#fb923c" strokeWidth={1 / zoom} strokeDasharray={`${3 / zoom} ${2 / zoom}`} pointerEvents="none" />
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
      {points.map((p) => (
        <circle
          key={p.id}
          data-point={p.id}
          cx={p.x} cy={p.y} r={r}
          fill={selectedPointId === p.id ? "#f0abfc" : "#a78bfa"}
          stroke="white"
          strokeWidth={strokeW}
          tabIndex={0}
          className="cursor-move focus:outline-none"
          onPointerDown={(e) => startDrag(e, p.id)}
          onClick={(e) => { e.stopPropagation(); setSelectedPointId(p.id); }}
          onDoubleClick={(e) => handlePointDoubleClick(e, p.id)}
          onKeyDown={(e) => handlePointKeyDown(e, p.id)}
        />
      ))}
    </svg>
  );
}
