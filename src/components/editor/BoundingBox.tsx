"use client";

import { useRef, useCallback, useState } from "react";
import { useEditorStore } from "@/store/editorStore";
import { PathPoint } from "@/types/shape";

interface HandleDef {
  id: string;
  cx: number;
  cy: number;
  anchorX: number;
  anchorY: number;
  cursor: string;
}

interface RotDrag {
  cx: number;
  cy: number;
  startOffsetX: number;
  startOffsetY: number;
  startAngle: number;
  startClientX: number;
  startClientY: number;
  origPoints: PathPoint[];
}

function rotatePoints(pts: PathPoint[], cx: number, cy: number, rad: number): PathPoint[] {
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const rot = (x: number, y: number) => ({
    x: cx + (x - cx) * cos - (y - cy) * sin,
    y: cy + (x - cx) * sin + (y - cy) * cos,
  });
  return pts.map((p) => ({
    ...p,
    ...rot(p.x, p.y),
    cp1: p.cp1 ? rot(p.cp1.x, p.cp1.y) : undefined,
    cp2: p.cp2 ? rot(p.cp2.x, p.cp2.y) : undefined,
  }));
}

export function BoundingBox({ zoom }: { zoom: number }) {
  const { points, setPoints, pushHistory, normalizeOrigin, activeTool } = useEditorStore();

  const dragging = useRef<{
    handleId: string;
    startX: number;
    startY: number;
    anchorX: number;
    anchorY: number;
    origPoints: typeof points;
  } | null>(null);

  const rotDragging = useRef<RotDrag | null>(null);
  const [rotAngle, setRotAngle] = useState<number | null>(null);

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

  const onRotPointerDown = useCallback(
    (e: React.PointerEvent<SVGCircleElement>, cx: number, cy: number, hx: number, hy: number) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      pushHistory();
      const offsetX = hx - cx;
      const offsetY = hy - cy;
      rotDragging.current = {
        cx,
        cy,
        startOffsetX: offsetX,
        startOffsetY: offsetY,
        startAngle: Math.atan2(offsetY, offsetX),
        startClientX: e.clientX,
        startClientY: e.clientY,
        origPoints: useEditorStore.getState().points.map((p) => ({ ...p })),
      };
    },
    [pushHistory]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (rotDragging.current) {
        const { cx, cy, startOffsetX, startOffsetY, startAngle, startClientX, startClientY, origPoints } = rotDragging.current;
        const dx = (e.clientX - startClientX) / zoom;
        const dy = (e.clientY - startClientY) / zoom;
        const currentAngle = Math.atan2(startOffsetY + dy, startOffsetX + dx);
        let delta = currentAngle - startAngle;
        if (e.shiftKey) {
          const snap = Math.PI / 12; // 15°
          delta = Math.round(delta / snap) * snap;
        }
        const rotated = rotatePoints(origPoints, cx, cy, delta);
        setPoints(rotated);
        setRotAngle(Math.round((delta * 180) / Math.PI));
        return;
      }

      if (!dragging.current) return;
      const { handleId, startX, startY, anchorX, anchorY, origPoints } = dragging.current;

      const rawDx = (e.clientX - startX) / zoom;
      const rawDy = (e.clientY - startY) / zoom;

      const origXs = origPoints.map((p) => p.x);
      const origYs = origPoints.map((p) => p.y);
      const origMinX = Math.min(...origXs), origMaxX = Math.max(...origXs);
      const origMinY = Math.min(...origYs), origMaxY = Math.max(...origYs);
      const origW = origMaxX - origMinX || 1;
      const origH = origMaxY - origMinY || 1;

      // Alt/Option: resize from center — double delta, anchor at bounding-box center
      const dx = e.altKey ? rawDx * 2 : rawDx;
      const dy = e.altKey ? rawDy * 2 : rawDy;
      const ax = e.altKey ? (origMinX + origMaxX) / 2 : anchorX;
      const ay = e.altKey ? (origMinY + origMaxY) / 2 : anchorY;

      const isEdge = ["n", "s", "e", "w"].includes(handleId);
      const isCorner = ["nw", "ne", "se", "sw"].includes(handleId);

      let sx = 1, sy = 1;

      if (handleId === "e" || handleId === "ne" || handleId === "se") sx = (origW + dx) / origW;
      if (handleId === "w" || handleId === "nw" || handleId === "sw") sx = (origW - dx) / origW;
      if (handleId === "s" || handleId === "se" || handleId === "sw") sy = (origH + dy) / origH;
      if (handleId === "n" || handleId === "ne" || handleId === "nw") sy = (origH - dy) / origH;

      if (isEdge) {
        if (["n", "s"].includes(handleId)) sx = 1;
        if (["e", "w"].includes(handleId)) sy = 1;
      }

      // Shift: lock aspect ratio for corner handles — use whichever axis moved more
      if (e.shiftKey && isCorner) {
        const uniform = Math.abs(sx - 1) >= Math.abs(sy - 1) ? sx : sy;
        sx = sy = uniform;
      }

      const scaled = scalePoints(origPoints, ax, ay, sx, sy);
      setPoints(scaled);
    },
    [zoom, scalePoints, setPoints]
  );

  const onPointerUp = useCallback(() => {
    if (rotDragging.current) {
      rotDragging.current = null;
      setRotAngle(null);
      normalizeOrigin();
      return;
    }
    if (dragging.current) normalizeOrigin();
    dragging.current = null;
  }, [normalizeOrigin]);

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
  const shapeCx = (minX + maxX) / 2;
  const shapeCy = (minY + maxY) / 2;

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

  const rotOffset = 18 / zoom;
  const rotHandles = [
    { id: "rot-nw", hx: x0 - rotOffset, hy: y0 - rotOffset },
    { id: "rot-ne", hx: x1 + rotOffset, hy: y0 - rotOffset },
    { id: "rot-se", hx: x1 + rotOffset, hy: y1 + rotOffset },
    { id: "rot-sw", hx: x0 - rotOffset, hy: y1 + rotOffset },
  ];

  const r = 5 / zoom;
  const rotR = 9 / zoom;
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

      {rotHandles.map(({ id, hx, hy }) => (
        <g key={id}>
          <circle
            cx={hx} cy={hy} r={rotR}
            fill="rgba(167,139,250,0.15)"
            stroke="#a78bfa"
            strokeWidth={strokeW}
            style={{ cursor: "alias", pointerEvents: "all" }}
            onPointerDown={(e) => onRotPointerDown(e, shapeCx, shapeCy, hx, hy)}
          />
          <text
            x={hx} y={hy}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={10 / zoom}
            fill="#a78bfa"
            pointerEvents="none"
            style={{ userSelect: "none" }}
          >
            ↻
          </text>
        </g>
      ))}

      {rotAngle !== null && (
        <text
          x={shapeCx}
          y={y0 - (rotOffset + rotR + 6) / zoom}
          textAnchor="middle"
          fontSize={12 / zoom}
          fill="#a78bfa"
          pointerEvents="none"
        >
          {rotAngle}°
        </text>
      )}
    </svg>
  );
}
