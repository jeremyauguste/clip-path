"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PRESETS } from "@/lib/presets";
import { useEditorStore } from "@/store/editorStore";
import { parseImport } from "@/lib/importParser";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function NewShapeDialog() {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(() => !searchParams.get("shape"));
  const [pasteValue, setPasteValue] = useState("");
  const [pasteError, setPasteError] = useState("");
  const { setPoints, canvasSettings, pushHistory } = useEditorStore();

  const startFromPreset = (key: string) => {
    pushHistory();
    setPoints(PRESETS[key].points());
    setOpen(false);
  };

  const startBlank = () => {
    pushHistory();
    setPoints([]);
    setOpen(false);
  };

  const startFromPaste = () => {
    const parsed = parseImport(pasteValue, canvasSettings.width, canvasSettings.height);
    if (!parsed || !parsed.length) {
      setPasteError("Could not parse input. Try a polygon(), path(), or SVG <polygon>.");
      return;
    }
    pushHistory();
    setPoints(parsed);
    setOpen(false);
    setPasteValue("");
    setPasteError("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <DialogTrigger
              render={
                <Button size="icon" variant="ghost" className="w-9 h-9">
                  <Plus className="w-4 h-4" />
                </Button>
              }
            />
          }
        />
        <TooltipContent side="right">New shape</TooltipContent>
      </Tooltip>

      <DialogContent className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 max-w-xl">
        <DialogHeader>
          <DialogTitle>New Shape</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Presets */}
          <div>
            <div className="text-xs text-neutral-700 dark:text-neutral-400 font-semibold mb-3 uppercase tracking-wider">Start from preset</div>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(PRESETS).map(([key, preset]) => {
                const pts = preset.points();
                const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
                return (
                  <button
                    key={key}
                    className="flex flex-col items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-100/40 dark:bg-neutral-800/40 hover:border-violet-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer group p-2"
                    onClick={() => startFromPreset(key)}
                  >
                    <div className="w-full aspect-square flex items-center justify-center">
                      <svg viewBox="0 0 400 400" className="w-full h-full">
                        <path
                          d={d}
                          fill="rgba(139,92,246,0.25)"
                          stroke="#a78bfa"
                          strokeWidth="10"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 pb-0.5 transition-colors">
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paste code */}
          <div>
            <div className="text-xs text-neutral-700 dark:text-neutral-400 font-semibold mb-2 uppercase tracking-wider">Paste CSS or SVG</div>
            <textarea
              className="w-full h-24 bg-neutral-100 dark:bg-neutral-800 rounded p-2 font-mono text-sm text-violet-600 dark:text-violet-300 resize-none focus:outline-none focus:ring-1 focus:ring-violet-500 placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
              placeholder={"clip-path: polygon(50% 0%, 0% 100%, 100% 100%);\nor <polygon points=\"50,0 100,100 0,100\"/>"}
              value={pasteValue}
              onChange={(e) => { setPasteValue(e.target.value); setPasteError(""); }}
              spellCheck={false}
            />
            {pasteError && <p className="text-xs text-red-400 mt-1">{pasteError}</p>}
            <Button
              size="sm"
              className="mt-2 bg-violet-600 hover:bg-violet-500 text-white border-0 px-4"
              onClick={startFromPaste}
              disabled={!pasteValue.trim()}
            >
              Import
            </Button>
          </div>

          {/* Blank canvas */}
          <div>
            <div className="text-xs text-neutral-700 dark:text-neutral-400 font-semibold mb-2 uppercase tracking-wider">Or</div>
            <button
              className="w-full flex items-center justify-center py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-100/40 dark:bg-neutral-800/40 hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-all"
              onClick={startBlank}
            >
              Start with blank canvas
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
