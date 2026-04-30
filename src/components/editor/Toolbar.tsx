"use client";

import { useEffect } from "react";
import { useEditorStore } from "@/store/editorStore";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { MousePointer2, Pen, Hand, Undo2, Redo2 } from "lucide-react";
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
  const { activeTool, setActiveTool, undo, redo, history, future } = useEditorStore();

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
        if (e.key === "y") { e.preventDefault(); redo(); }
        return;
      }
      if (e.key === "v" || e.key === "V") setActiveTool("select");
      if (e.key === "p" || e.key === "P") setActiveTool("pen");
      if (e.key === "h" || e.key === "H") setActiveTool("hand");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
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
