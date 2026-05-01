"use client";

import { useCallback, useRef } from "react";
import { useEditorStore } from "@/store/editorStore";
import { PreviewMode } from "@/types/shape";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Square, Grid3x3, ImageIcon } from "lucide-react";

function ImagePositionPad({
  x, y, onChange, onDragStart,
}: {
  x: number; y: number;
  onChange: (x: number, y: number) => void;
  onDragStart?: () => void;
}) {
  const padRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const update = (e: React.PointerEvent) => {
    const rect = padRef.current!.getBoundingClientRect();
    const nx = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const ny = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    onChange(nx, ny);
  };

  return (
    <Tooltip>
      <TooltipTrigger render={
        <div
          ref={padRef}
          className="relative w-10 h-10 rounded border border-neutral-300 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-800 cursor-crosshair select-none flex-shrink-0"
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); onDragStart?.(); dragging.current = true; update(e); }}
          onPointerMove={(e) => { if (dragging.current) update(e); }}
          onPointerUp={() => { dragging.current = false; }}
        >
          {/* center crosshair lines */}
          <div className="absolute top-1/2 left-1 right-1 h-px bg-neutral-300 dark:bg-neutral-600" />
          <div className="absolute left-1/2 top-1 bottom-1 w-px bg-neutral-300 dark:bg-neutral-600" />
          {/* position dot */}
          <div
            className="absolute w-2 h-2 rounded-full bg-violet-500 shadow pointer-events-none"
            style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
          />
        </div>
      } />
      <TooltipContent side="top">Image position</TooltipContent>
    </Tooltip>
  );
}

const PREVIEW_MODES: { mode: PreviewMode; icon: React.ReactNode; label: string }[] = [
  { mode: "solid",        icon: <Square className="w-3.5 h-3.5" />,   label: "Solid color" },
  { mode: "checkerboard", icon: <Grid3x3 className="w-3.5 h-3.5" />,  label: "Checkerboard" },
  { mode: "image",        icon: <ImageIcon className="w-3.5 h-3.5" />, label: "Background image" },
];

const inputClass =
  "w-16 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs text-center rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500";

const Divider = () => <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-700" />;

export function CanvasSettingsBar() {
  const { canvasSettings, setCanvasSettings, setPreviewMode, pushHistory } = useEditorStore();

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
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-4 py-2 shadow-lg">
      {/* Width */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-500">W</span>
        <input
          type="number"
          className={inputClass}
          value={canvasSettings.width}
          onChange={(e) => setCanvasSettings({ width: Number(e.target.value) })}
          min={100}
          max={1200}
        />
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-500">px</span>
      </div>

      <Divider />

      {/* Height */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-500">H</span>
        <input
          type="number"
          className={inputClass}
          value={canvasSettings.height}
          onChange={(e) => setCanvasSettings({ height: Number(e.target.value) })}
          min={100}
          max={1200}
        />
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-500">px</span>
      </div>

      <Divider />

      {/* Color */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-500">Color</span>
        <input
          type="color"
          className="w-7 h-6 rounded cursor-pointer bg-transparent border-0"
          value={canvasSettings.previewColor}
          onChange={(e) => setCanvasSettings({ previewColor: e.target.value })}
        />
      </div>

      <Divider />

      {/* Preview modes */}
      <div className="flex items-center gap-0.5">
        {PREVIEW_MODES.map(({ mode, icon, label }) => (
          <Tooltip key={mode}>
            <TooltipTrigger
              render={
                <Button
                  size="icon"
                  variant={canvasSettings.previewMode === mode ? "secondary" : "ghost"}
                  className="w-7 h-7"
                  onClick={() => {
                    if (mode === "image") {
                      document.getElementById("canvas-image-upload")?.click();
                    } else {
                      setPreviewMode(mode);
                    }
                  }}
                >
                  {icon}
                </Button>
              }
            />
            <TooltipContent side="top">{label}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      {/* Image position + size controls — only shown in image mode */}
      {canvasSettings.previewMode === "image" && canvasSettings.previewImage && (
        <>
          <Divider />
          <div className="flex items-center gap-2">
            <ImagePositionPad
              x={canvasSettings.imagePosition?.x ?? 50}
              y={canvasSettings.imagePosition?.y ?? 50}
              onChange={(x, y) => setCanvasSettings({ imagePosition: { x, y } })}
              onDragStart={pushHistory}
            />
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-500">Size</span>
              <input
                type="range"
                min={20} max={400}
                value={canvasSettings.imageSize ?? 100}
                onPointerDown={pushHistory}
                onChange={(e) => setCanvasSettings({ imageSize: Number(e.target.value) })}
                className="w-16 accent-violet-500"
                title="Image size"
              />
            </div>
          </div>
        </>
      )}

      <input
        id="canvas-image-upload"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
    </div>
  );
}
