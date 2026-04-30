"use client";

import { useCallback } from "react";
import { useEditorStore } from "@/store/editorStore";
import { PreviewMode } from "@/types/shape";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Square, Grid3x3, ImageIcon } from "lucide-react";

const PREVIEW_MODES: { mode: PreviewMode; icon: React.ReactNode; label: string }[] = [
  { mode: "solid",        icon: <Square className="w-3.5 h-3.5" />,   label: "Solid color" },
  { mode: "checkerboard", icon: <Grid3x3 className="w-3.5 h-3.5" />,  label: "Checkerboard" },
  { mode: "image",        icon: <ImageIcon className="w-3.5 h-3.5" />, label: "Background image" },
];

const inputClass =
  "w-16 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs text-center rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500";

const Divider = () => <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-700" />;

export function CanvasSettingsBar() {
  const { canvasSettings, setCanvasSettings, setPreviewMode } = useEditorStore();

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
