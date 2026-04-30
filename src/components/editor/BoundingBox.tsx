"use client";

import { useRef, useCallback } from "react";
import { useEditorStore } from "@/store/editorStore";

interface HandleDef {
  id: string;
  cx: number;
  cy: number;
  anchorX: number;
  anchorY: number;
  cursor: string;
}

export function BoundingBox({ zoom }: { zoom: number }) {
  const { points, setPoints, pushHistory, activeTool } = useEditorStore();

  const dragging = useRef<{
    handleId: string;
    startX: number;
    startY: number;
    anchorX: number;
    anchorY: number;
    origPoints: typeof points;
  } | null>(null);

  const scalePoints = useCallback(
    (pts: typeof points, ax: number, ay: number, sx: number, sy: number) =>
      pts.map((p) => ({
        ...p,
        x: ax + (p.x - ax) * sx,
        y: ay + (p.y - ay) * sy,
        cp1: p.cp1 ? { x: ax + (p.cp1.x - ax) * sx, y: ay + (p.cp1.y - ay) * sy } : undefined,
        cp2: p.cp2 ? { x: ax + (p.cp2.x - ax) * sx, y: ay + (p.cp2.y - ay) * sy } : undefined,
      })),
    []
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGCircleElement>, handle: HandleDef) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      pushHistory();
      dragging.current = {
        handleId: handle.id,
        startX: e.clientX,
        startY: e.clientY,
        anchorX: handle.anchorX,
        anchorY: handle.anchorY,
        origPoints: useEditorStore.getState().points.map((p) => ({ ...p })),
      };
    },
    [pushHistory]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragging.current) return;
      const { handleId, startX, startY, anchorX, anchorY, origPoints } = dragging.current;

      const dx = (e.clientX - startX) / zoom;
      const dy = (e.clientY - startY) / zoom;

      const origXs = origPoints.map((p) => p.x);
      const origYs = origPoints.map((p) => p.y);
      const origMinX = Math.min(...origXs), origMaxX = Math.max(...origXs);
      const origMinY = Math.min(...origYs), origMaxY = Math.max(...origYs);
      const origW = origMaxX - origMinX || 1;
      const origH = origMaxY - origMinY || 1;

      let sx = 1, sy = 1;
      const isEdge = ["n", "s", "e", "w"].includes(handleId);

      if (handleId === "e" || handleId === "ne" || handleId === "se") sx = (origW + dx) / origW;
      if (handleId === "w" || handleId === "nw" || handleId === "sw") sx = (origW - dx) / origW;
      if (handleId === "s" || handleId === "se" || handleId === "sw") sy = (origH + dy) / origH;
      if (handleId === "n" || handleId === "ne" || handleId === "nw") sy = (origH - dy) / origH;

      if (isEdge) {
        if (["n", "s"].includes(handleId)) sx = 1;
        if (["e", "w"].includes(handleId)) sy = 1;
      }

      const scaled = scalePoints(origPoints, anchorX, anchorY, sx, sy);
      setPoints(scaled);
    },
    [zoom, scalePoints, setPoints]
  );

  const onPointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  // All hooks above this line — safe to return early now
  if (activeTool !== "select" || points.length < 2) return null;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = maxX - minX;
  const h = maxY - minY;

  if (w === 0 && h === 0) return null;

  const pad = 12 / zoom;
  const x0 = minX - pad, y0 = minY - pad;
  const x1 = maxX + pad, y1 = maxY + pad;
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;

  const handles: HandleDef[] = [
    { id: "nw", cx: x0, cy: y0, anchorX: x1, anchorY: y1, cursor: "nwse-resize" },
    { id: "ne", cx: x1, cy: y0, anchorX: x0, anchorY: y1, cursor: "nesw-resize" },
    { id: "se", cx: x1, cy: y1, anchorX: x0, anchorY: y0, cursor: "nwse-resize" },
    { id: "sw", cx: x0, cy: y1, anchorX: x1, anchorY: y0, cursor: "nesw-resize" },
    { id: "n",  cx: mx, cy: y0, anchorX: mx, anchorY: y1, cursor: "ns-resize" },
    { id: "s",  cx: mx, cy: y1, anchorX: mx, anchorY: y0, cursor: "ns-resize" },
    { id: "e",  cx: x1, cy: my, anchorX: x0, anchorY: my, cursor: "ew-resize" },
    { id: "w",  cx: x0, cy: my, anchorX: x1, anchorY: my, cursor: "ew-resize" },
  ];

  const r = 5 / zoom;
  const strokeW = 1 / zoom;

  return (
    <svg
      className="absolute inset-0 overflow-visible pointer-events-none"
      width="100%"
      height="100%"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{ pointerEvents: "none" }}
    >
      <rect
        x={x0} y={y0}
        width={x1 - x0} height={y1 - y0}
        fill="none"
        stroke="rgba(167,139,250,0.4)"
        strokeWidth={strokeW}
        strokeDasharray={`${6 / zoom} ${3 / zoom}`}
        pointerEvents="none"
      />

      {handles.map((h) => (
        <circle
          key={h.id}
          cx={h.cx} cy={h.cy} r={r}
          fill="white"
          stroke="#a78bfa"
          strokeWidth={strokeW * 1.5}
          style={{ cursor: h.cursor, pointerEvents: "all" }}
          onPointerDown={(e) => onPointerDown(e, h)}
        />
      ))}
    </svg>
  );
}
