"use client";

import { useCallback, useEffect } from "react";
import { useEditorStore } from "@/store/editorStore";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  MousePointer2,
  Pen,
  Hand,
  Undo2,
  Redo2,
  Square,
  Grid3x3,
  ImageIcon,
} from "lucide-react";
import { NewShapeDialog } from "./NewShapeDialog";
import { PreviewMode } from "@/types/shape";

const PREVIEW_MODES: { mode: PreviewMode; icon: React.ReactNode; label: string }[] = [
  { mode: "solid", icon: <Square className="w-4 h-4" />, label: "Solid color" },
  { mode: "checkerboard", icon: <Grid3x3 className="w-4 h-4" />, label: "Checkerboard" },
  { mode: "image", icon: <ImageIcon className="w-4 h-4" />, label: "Background image" },
];

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
  const {
    activeTool,
    setActiveTool,
    undo,
    redo,
    history,
    future,
    canvasSettings,
    setCanvasSettings,
    setPreviewMode,
  } = useEditorStore();

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
        return;
      }
      if (e.key === "v" || e.key === "V") setActiveTool("select");
      if (e.key === "p" || e.key === "P") setActiveTool("pen");
      if (e.key === "h" || e.key === "H") setActiveTool("hand");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, setActiveTool]);

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCanvasSettings({ previewImage: ev.target?.result as string, previewMode: "image" });
      };
      reader.readAsDataURL(file);
    },
    [setCanvasSettings]
  );

  return (
    <div className="flex flex-col items-center gap-2 py-4 px-2 bg-neutral-900 border-r border-neutral-800 w-14">
      {/* New shape */}
      <NewShapeDialog />

      <Separator className="bg-neutral-800 w-8" />

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

      <Separator className="bg-neutral-800 w-8" />

      {/* Undo / redo */}
      <ToolbarButton label="Undo (⌘Z)" disabled={!history.length} onClick={undo}>
        <Undo2 className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarButton label="Redo (⌘⇧Z)" disabled={!future.length} onClick={redo}>
        <Redo2 className="w-4 h-4" />
      </ToolbarButton>

      <Separator className="bg-neutral-800 w-8" />

      {/* Preview mode toggles */}
      {PREVIEW_MODES.map(({ mode, icon, label }) => (
        <ToolbarButton
          key={mode}
          label={label}
          active={canvasSettings.previewMode === mode}
          onClick={() => {
            if (mode === "image") {
              document.getElementById("image-upload")?.click();
            } else {
              setPreviewMode(mode);
            }
          }}
        >
          {icon}
        </ToolbarButton>
      ))}

      <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

      <Separator className="bg-neutral-800 w-8" />

      {/* Canvas size */}
      <Tooltip>
        <TooltipTrigger render={<div className="text-center cursor-default" />}>
          <div className="text-[9px] text-neutral-500 leading-tight">W</div>
          <input
            type="number"
            className="w-10 bg-neutral-800 text-neutral-300 text-xs text-center rounded px-0.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
            value={canvasSettings.width}
            onChange={(e) => setCanvasSettings({ width: Number(e.target.value) })}
            min={100}
            max={1200}
          />
        </TooltipTrigger>
        <TooltipContent side="right">Canvas width (px)</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger render={<div className="text-center cursor-default" />}>
          <div className="text-[9px] text-neutral-500 leading-tight">H</div>
          <input
            type="number"
            className="w-10 bg-neutral-800 text-neutral-300 text-xs text-center rounded px-0.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
            value={canvasSettings.height}
            onChange={(e) => setCanvasSettings({ height: Number(e.target.value) })}
            min={100}
            max={1200}
          />
        </TooltipTrigger>
        <TooltipContent side="right">Canvas height (px)</TooltipContent>
      </Tooltip>

      {/* Preview color */}
      <Tooltip>
        <TooltipTrigger render={<div className="cursor-default" />}>
          <div className="text-[9px] text-neutral-500 leading-tight text-center">Color</div>
          <input
            type="color"
            className="w-9 h-7 rounded cursor-pointer bg-transparent border-0"
            value={canvasSettings.previewColor}
            onChange={(e) => setCanvasSettings({ previewColor: e.target.value })}
          />
        </TooltipTrigger>
        <TooltipContent side="right">Preview color</TooltipContent>
      </Tooltip>
    </div>
  );
}
