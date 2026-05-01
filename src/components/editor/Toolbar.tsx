"use client";

import { useEffect, useRef } from "react";
import { useEditorStore } from "@/store/editorStore";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { MousePointer2, Pen, Hand, Undo2, Redo2, Grid2X2 } from "lucide-react";
import { NewShapeDialog } from "./NewShapeDialog";

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
  side = "right",
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  side?: "right" | "left" | "top" | "bottom";
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size="icon"
            variant={active ? "secondary" : "ghost"}
            className="w-9 h-9"
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
  const { activeTool, setActiveTool, undo, redo, history, future, snapToGrid, gridSize, setSnapToGrid, setGridSize } = useEditorStore();
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

  return (
    <div className="flex flex-col items-center gap-2 py-4 px-2 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 w-14">
      {/* New shape */}
      <NewShapeDialog />

      <Separator className="bg-neutral-200 dark:bg-neutral-800 w-8" />

      {/* Tools */}
      <ToolbarButton
        label="Select (V) — drag points to edit"
        active={activeTool === "select"}
        onClick={() => setActiveTool("select")}
      >
        <MousePointer2 className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarButton
        label="Pen — click canvas to add points, click edge to insert (P)"
        active={activeTool === "pen"}
        onClick={() => setActiveTool("pen")}
      >
        <Pen className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarButton
        label="Hand — drag to pan, or use two-finger scroll (H)"
        active={activeTool === "hand"}
        onClick={() => setActiveTool("hand")}
      >
        <Hand className="w-4 h-4" />
      </ToolbarButton>

      <Separator className="bg-neutral-200 dark:bg-neutral-800 w-8" />

      {/* Snap to grid */}
      <ToolbarButton
        label={`Snap to grid (G) — ${snapToGrid ? "on" : "off"}`}
        active={snapToGrid}
        onClick={() => setSnapToGrid(!snapToGrid)}
      >
        <Grid2X2 className="w-4 h-4" />
      </ToolbarButton>

      {snapToGrid && (
        <div className="flex flex-col items-center gap-0.5">
          <input
            type="number"
            min={1}
            max={200}
            value={gridSize}
            onChange={(e) => setGridSize(Number(e.target.value))}
            className="w-10 text-center text-xs rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 leading-none">px</span>
        </div>
      )}

      <Separator className="bg-neutral-200 dark:bg-neutral-800 w-8" />

      {/* Undo / redo */}
      <ToolbarButton label="Undo (⌘Z)" disabled={!history.length} onClick={undo}>
        <Undo2 className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarButton label="Redo (⌘⇧Z / Ctrl+Y)" disabled={!future.length} onClick={redo}>
        <Redo2 className="w-4 h-4" />
      </ToolbarButton>

    </div>
  );
}
