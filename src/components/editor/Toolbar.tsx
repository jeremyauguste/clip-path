"use client";

import { useEffect, useRef } from "react";
import { useEditorStore } from "@/store/editorStore";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { MousePointer2, Pen, Hand, Undo2, Redo2, Grid2X2, FlipHorizontal, FlipVertical, RotateCw, RotateCcw, Donut, Circle, Maximize2 } from "lucide-react";
import { NewShapeDialog } from "./NewShapeDialog";

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
  side = "right",
  className,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  side?: "right" | "left" | "top" | "bottom";
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size="icon"
            variant={active ? "secondary" : "ghost"}
            className={cn("w-12 h-12", className)}
            disabled={disabled}
            onClick={onClick}
          >
            {children}
          </Button>
        }
      />
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}

export function Toolbar() {
  const {
    activeTool, setActiveTool,
    undo, redo, history, future,
    snapToGrid, gridSize, setSnapToGrid, setGridSize,
    points,
    flipHorizontal, flipVertical, rotate90CW, rotate90CCW,
    makeHollow, removeHollow,
    setFitViewRequested,
  } = useEditorStore();
  const nudgeHistoryPushed = useRef(false);

  // Keyboard shortcuts
  useEffect(() => {
    const ARROW_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
        if (e.key === "y") { e.preventDefault(); redo(); }
        return;
      }

      if (ARROW_KEYS.includes(e.key)) {
        const { selectedPointId, points, updatePoint, pushHistory, snapToGrid: snap, gridSize: gs } = useEditorStore.getState();
        if (!selectedPointId) return;
        const pt = points.find((p) => p.id === selectedPointId);
        if (!pt) return;
        e.preventDefault();
        if (!nudgeHistoryPushed.current) {
          pushHistory();
          nudgeHistoryPushed.current = true;
        }
        const base = snap ? gs : 1;
        const amount = e.shiftKey ? base * 10 : base;
        const dx = e.key === "ArrowLeft" ? -amount : e.key === "ArrowRight" ? amount : 0;
        const dy = e.key === "ArrowUp" ? -amount : e.key === "ArrowDown" ? amount : 0;
        updatePoint(selectedPointId, { x: pt.x + dx, y: pt.y + dy });
        return;
      }

      if (e.key === "v" || e.key === "V") setActiveTool("select");
      if (e.key === "p" || e.key === "P") setActiveTool("pen");
      if (e.key === "h" || e.key === "H") setActiveTool("hand");
      if (e.key === "g" || e.key === "G") useEditorStore.getState().setSnapToGrid(!useEditorStore.getState().snapToGrid);
      if (e.key === "f" || e.key === "F") useEditorStore.getState().setFitViewRequested(true);
    };

    const upHandler = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        nudgeHistoryPushed.current = false;
      }
    };

    window.addEventListener("keydown", handler);
    window.addEventListener("keyup", upHandler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("keyup", upHandler);
    };
  }, [undo, redo, setActiveTool]);

  const isHollow = points.some((p) => p.subpathStart);

  return (
    <div className="flex flex-col items-center gap-2 py-4 px-2 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 w-[4.5rem] h-full overflow-y-auto overscroll-contain">
      <NewShapeDialog />

      <Separator className="bg-neutral-200 dark:bg-neutral-800 w-12" />

      <ToolbarButton
        label="Select (V) — drag points to edit"
        active={activeTool === "select"}
        onClick={() => setActiveTool("select")}
      >
        <MousePointer2 className="w-6 h-6" />
      </ToolbarButton>

      <ToolbarButton
        label="Pen — click canvas to add points, click edge to insert (P)"
        active={activeTool === "pen"}
        onClick={() => setActiveTool("pen")}
      >
        <Pen className="w-6 h-6" />
      </ToolbarButton>

      <ToolbarButton
        label="Hand — drag to pan, or use two-finger scroll (H)"
        active={activeTool === "hand"}
        onClick={() => setActiveTool("hand")}
      >
        <Hand className="w-6 h-6" />
      </ToolbarButton>

      <Separator className="bg-neutral-200 dark:bg-neutral-800 w-12" />

      <ToolbarButton
        label={`Snap to grid (G) — ${snapToGrid ? "on" : "off"}`}
        active={snapToGrid}
        onClick={() => setSnapToGrid(!snapToGrid)}
      >
        <Grid2X2 className="w-6 h-6" />
      </ToolbarButton>

      {snapToGrid && (
        <div className="flex flex-col items-center gap-0.5">
          <input
            type="number"
            min={1}
            max={200}
            value={gridSize}
            onChange={(e) => setGridSize(Number(e.target.value))}
            className="w-14 text-center text-sm rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <span className="text-sm text-neutral-400 dark:text-neutral-500 leading-none">px</span>
        </div>
      )}

      <Separator className="bg-neutral-200 dark:bg-neutral-800 w-12" />

      {/* Transform: 2×2 grid to save vertical space */}
      <div className="grid grid-cols-2 gap-1">
        <ToolbarButton
          label="Flip horizontal"
          disabled={points.length < 2}
          onClick={flipHorizontal}
          className="w-[26px] h-[26px]"
        >
          <FlipHorizontal className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          label="Flip vertical"
          disabled={points.length < 2}
          onClick={flipVertical}
          className="w-[26px] h-[26px]"
        >
          <FlipVertical className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          label="Rotate 90° clockwise"
          disabled={points.length < 2}
          onClick={rotate90CW}
          className="w-[26px] h-[26px]"
        >
          <RotateCw className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          label="Rotate 90° counter-clockwise"
          disabled={points.length < 2}
          onClick={rotate90CCW}
          className="w-[26px] h-[26px]"
        >
          <RotateCcw className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {isHollow ? (
        <ToolbarButton label="Remove inner ring" onClick={removeHollow}>
          <Circle className="w-6 h-6" />
        </ToolbarButton>
      ) : (
        <ToolbarButton
          label="Make hollow — adds an editable inner ring"
          disabled={points.length < 3}
          onClick={makeHollow}
        >
          <Donut className="w-6 h-6" />
        </ToolbarButton>
      )}

      <Separator className="bg-neutral-200 dark:bg-neutral-800 w-12" />

      <ToolbarButton label="Zoom to fit (F)" onClick={() => setFitViewRequested(true)}>
        <Maximize2 className="w-6 h-6" />
      </ToolbarButton>

      <Separator className="bg-neutral-200 dark:bg-neutral-800 w-12" />

      <ToolbarButton label="Undo (⌘Z)" disabled={!history.length} onClick={undo}>
        <Undo2 className="w-6 h-6" />
      </ToolbarButton>

      <ToolbarButton label="Redo (⌘⇧Z / Ctrl+Y)" disabled={!future.length} onClick={redo}>
        <Redo2 className="w-6 h-6" />
      </ToolbarButton>
    </div>
  );
}
