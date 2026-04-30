"use client";

import { useRef, useCallback, useEffect, useLayoutEffect } from "react";
import { useEditorStore } from "@/store/editorStore";
import { PathPoint } from "@/types/shape";
import { SvgOverlay } from "./SvgOverlay";
import { BoundingBox } from "./BoundingBox";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

export function Canvas() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const didInitCenter = useRef(false);

  const {
    canvasSettings,
    activeTool,
    cssOutput,
    panOffset,
    zoom,
    setPanOffset,
    setZoom,
  } = useEditorStore();

  const { width, height, previewMode, previewColor, previewImage } = canvasSettings;

  // Refs for values the hot-path handlers read without re-registering
  const panOffsetRef = useRef(panOffset);
  const zoomRef = useRef(zoom);
  const activeToolRef = useRef(activeTool);
  panOffsetRef.current = panOffset;
  zoomRef.current = zoom;
  activeToolRef.current = activeTool;

  // Apply transform directly to DOM — no React re-render needed
  const applyTransform = useCallback(() => {
    const { x, y } = panOffsetRef.current;
    const z = zoomRef.current;

    if (worldRef.current) {
      worldRef.current.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
    }

    if (gridRef.current) {
      const baseSize = 40;
      const cellSize = baseSize * z;
      const ox = x % cellSize;
      const oy = y % cellSize;
      gridRef.current.style.backgroundSize = `${cellSize}px ${cellSize}px`;
      gridRef.current.style.backgroundPosition = `${ox}px ${oy}px`;
    }
  }, []);

  // Flush current ref values into Zustand (batched per frame)
  const scheduleSync = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      useEditorStore.getState().setPanOffset({ ...panOffsetRef.current });
      useEditorStore.getState().setZoom(zoomRef.current);
    });
  }, []);

  // Keep DOM transform in sync when Zustand panOffset changes (e.g., after normalizeOrigin)
  useLayoutEffect(() => {
    applyTransform();
  }, [panOffset.x, panOffset.y, applyTransform]);

  // Center on mount and when canvas size changes
  useEffect(() => {
    if (!viewportRef.current || didInitCenter.current) return;
    didInitCenter.current = true;
    const rect = viewportRef.current.getBoundingClientRect();
    const x = (rect.width - width) / 2;
    const y = (rect.height - height) / 2;
    panOffsetRef.current = { x, y };
    zoomRef.current = 1;
    applyTransform(); // also initializes grid
    setPanOffset({ x, y });
    setZoom(1);
  }, [width, height, applyTransform]);

  // Non-passive wheel — handles two-finger pan and pinch-to-zoom
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();

      if (e.ctrlKey) {
        // Pinch-to-zoom toward cursor
        const oldZoom = zoomRef.current;
        const newZoom = clamp(oldZoom * (1 - e.deltaY * 0.01), MIN_ZOOM, MAX_ZOOM);
        const scale = newZoom / oldZoom;
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        panOffsetRef.current = {
          x: cx - (cx - panOffsetRef.current.x) * scale,
          y: cy - (cy - panOffsetRef.current.y) * scale,
        };
        zoomRef.current = newZoom;
      } else {
        // Two-finger pan
        panOffsetRef.current = {
          x: panOffsetRef.current.x - e.deltaX,
          y: panOffsetRef.current.y - e.deltaY,
        };
      }

      applyTransform();
      scheduleSync();
    };

    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [applyTransform, scheduleSync]);

  // Hand tool: pointer drag to pan
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (activeToolRef.current !== "hand") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    isPanning.current = true;
    lastPan.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning.current) return;
    panOffsetRef.current = {
      x: panOffsetRef.current.x + (e.clientX - lastPan.current.x),
      y: panOffsetRef.current.y + (e.clientY - lastPan.current.y),
    };
    lastPan.current = { x: e.clientX, y: e.clientY };
    applyTransform();
    scheduleSync();
  }, [applyTransform, scheduleSync]);

  const handlePointerUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  // Pen tool: click to add point
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (activeToolRef.current !== "pen") return;
    const rect = viewportRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left - panOffsetRef.current.x) / zoomRef.current;
    const y = (e.clientY - rect.top - panOffsetRef.current.y) / zoomRef.current;
    const newPoint: PathPoint = { id: uid(), x, y, type: "corner" };
    useEditorStore.getState().addPoint(newPoint);
    useEditorStore.getState().normalizeOrigin();
  }, []);

  const clipValue = cssOutput
    ? cssOutput.replace(/^clip-path:\s*/, "").replace(/;$/, "")
    : undefined;

  let background: React.CSSProperties = {};
  if (previewMode === "solid") {
    background = { backgroundColor: previewColor };
  } else if (previewMode === "checkerboard") {
    background = {
      backgroundImage:
        "linear-gradient(45deg, #444 25%, transparent 25%), linear-gradient(-45deg, #444 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #444 75%), linear-gradient(-45deg, transparent 75%, #444 75%)",
      backgroundSize: "20px 20px",
      backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
      backgroundColor: "#888",
    };
  } else if (previewMode === "image" && previewImage) {
    background = {
      backgroundImage: `url(${previewImage})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  } else {
    background = { backgroundColor: previewColor };
  }

  const cursorStyle =
    activeTool === "hand"
      ? isPanning.current ? "grabbing" : "grab"
      : activeTool === "pen"
      ? "crosshair"
      : "default";

  return (
    <div
      ref={viewportRef}
      className="w-full h-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 relative"
      style={{ cursor: cursorStyle }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleCanvasClick}
    >
      {/* Infinite grid background */}
      <div
        ref={gridRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(var(--grid-line-color) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line-color) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div
        ref={worldRef}
        style={{
          position: "absolute",
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          width,
          height,
        }}
      >
        {/* The element itself — clip-path applied directly so the shape IS the element */}
        <div
          ref={canvasRef}
          style={{
            position: "absolute",
            width,
            height,
            pointerEvents: "none",
            ...(clipValue ? { clipPath: clipValue, ...background } : {}),
          }}
        />
        {/* Editing overlays — siblings of the element, not clipped */}
        <SvgOverlay
          width={width}
          height={height}
          zoom={zoom}
          viewportRef={viewportRef}
          panOffset={panOffset}
          panOffsetRef={panOffsetRef}
          zoomRef={zoomRef}
        />
        <BoundingBox zoom={zoom} />
      </div>

      <div className="absolute bottom-4 right-4 text-xs text-neutral-400 dark:text-neutral-500 select-none pointer-events-none">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}
