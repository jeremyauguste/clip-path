"use client";

import { useState, useCallback } from "react";
import { useEditorStore } from "@/store/editorStore";
import { Button } from "@/components/ui/button";
import { Lock, Unlock } from "lucide-react";

export function ScalePanel() {
  const { points, setPoints, pushHistory, canvasSettings } = useEditorStore();
  const [lockAspect, setLockAspect] = useState(true);
  const [scaleX, setScaleX] = useState(100);
  const [scaleY, setScaleY] = useState(100);

  const applyScale = useCallback(() => {
    if (!points.length) return;
    pushHistory();

    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const sx = scaleX / 100;
    const sy = scaleY / 100;

    setPoints(
      points.map((p) => ({
        ...p,
        x: cx + (p.x - cx) * sx,
        y: cy + (p.y - cy) * sy,
        cp1: p.cp1 ? { x: cx + (p.cp1.x - cx) * sx, y: cy + (p.cp1.y - cy) * sy } : undefined,
        cp2: p.cp2 ? { x: cx + (p.cp2.x - cx) * sx, y: cy + (p.cp2.y - cy) * sy } : undefined,
      }))
    );

    setScaleX(100);
    setScaleY(100);
  }, [points, scaleX, scaleY, setPoints, pushHistory]);

  const handleScaleXChange = (val: number) => {
    setScaleX(val);
    if (lockAspect) setScaleY(val);
  };

  const handleScaleYChange = (val: number) => {
    setScaleY(val);
    if (lockAspect) setScaleX(val);
  };

  if (!points.length) return null;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 shadow-lg">
      <span className="text-xs text-neutral-400">Scale</span>
      <div className="flex items-center gap-1">
        <span className="text-xs text-neutral-500">X</span>
        <input
          type="number"
          className="w-14 bg-neutral-800 text-neutral-200 text-xs text-center rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500"
          value={scaleX}
          onChange={(e) => handleScaleXChange(Number(e.target.value))}
          min={1}
          max={500}
        />
        <span className="text-xs text-neutral-500">%</span>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6"
        onClick={() => setLockAspect(!lockAspect)}
      >
        {lockAspect ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
      </Button>
      <div className="flex items-center gap-1">
        <span className="text-xs text-neutral-500">Y</span>
        <input
          type="number"
          className="w-14 bg-neutral-800 text-neutral-200 text-xs text-center rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500"
          value={scaleY}
          onChange={(e) => handleScaleYChange(Number(e.target.value))}
          min={1}
          max={500}
        />
        <span className="text-xs text-neutral-500">%</span>
      </div>
      <Button size="sm" className="h-7 text-xs" onClick={applyScale}>
        Apply
      </Button>
    </div>
  );
}
