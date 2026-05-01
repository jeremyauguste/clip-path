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
import { PRESETS, generatePolygon, generateStar } from "@/lib/presets";
import { buildSvgPath } from "@/lib/cssGenerator";
import { useEditorStore } from "@/store/editorStore";
import { parseImport } from "@/lib/importParser";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";


function Counter({
  value, min, max, onChange,
}: {
  value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <button
        className="w-5 h-5 rounded flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-30 transition-colors text-sm font-medium"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
      >−</button>
      <span className="text-sm font-medium w-6 text-center">{value}</span>
      <button
        className="w-5 h-5 rounded flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-30 transition-colors text-sm font-medium"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
      >+</button>
    </div>
  );
}

export function NewShapeDialog() {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(() => !searchParams.get("shape"));
  const [pasteValue, setPasteValue] = useState("");
  const [pasteError, setPasteError] = useState("");
  const [polygonSides, setPolygonSides] = useState(6);
  const [starPoints, setStarPoints] = useState(5);
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
                <Button size="icon" variant="ghost" className="w-12 h-12">
                  <Plus className="w-6 h-6" />
                </Button>
              }
            />
          }
        />
        <TooltipContent side="right">New shape</TooltipContent>
      </Tooltip>

      <DialogContent className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 max-w-3xl">
        <DialogHeader>
          <DialogTitle>New Shape</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[min(800px,90vh)] space-y-4 mt-1 pr-1">
          {/* Presets — 5 columns */}
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold mb-2 uppercase tracking-wider">Presets</div>
            <div className="grid grid-cols-5 gap-1.5">
              {Object.entries(PRESETS).map(([key, preset]) => {
                const pts = preset.points();
                return (
                  <button
                    key={key}
                    className="flex flex-col items-center gap-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-100/40 dark:bg-neutral-800/40 hover:border-violet-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer group p-1.5"
                    onClick={() => startFromPreset(key)}
                  >
                    <div className="w-full aspect-square flex items-center justify-center">
                      <svg viewBox="0 0 400 400" className="w-full h-full">
                        <path
                          d={buildSvgPath(pts)}
                          fill="rgba(139,92,246,0.25)"
                          stroke="#a78bfa"
                          strokeWidth="12"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors truncate w-full text-center">
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Parametric — horizontal cards */}
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold mb-2 uppercase tracking-wider">Parametric</div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                {
                  label: "Polygon",
                  sublabel: "sides",
                  value: polygonSides,
                  min: 3,
                  max: 20,
                  onChange: setPolygonSides,
                  generate: () => generatePolygon(polygonSides),
                },
                {
                  label: "Star",
                  sublabel: "points",
                  value: starPoints,
                  min: 3,
                  max: 16,
                  onChange: setStarPoints,
                  generate: () => generateStar(starPoints),
                },
              ].map(({ label, sublabel, value, min, max, onChange, generate }) => {
                const pts = generate();
                return (
                  <div
                    key={label}
                    role="button"
                    tabIndex={0}
                    className="flex items-center gap-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-100/40 dark:bg-neutral-800/40 hover:border-violet-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer group p-2 text-left"
                    onClick={() => { pushHistory(); setPoints(pts); setOpen(false); }}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { pushHistory(); setPoints(pts); setOpen(false); } }}
                  >
                    <div className="w-14 h-14 flex-shrink-0">
                      <svg viewBox="0 0 400 400" className="w-full h-full">
                        <path
                          d={buildSvgPath(pts)}
                          fill="rgba(139,92,246,0.25)"
                          stroke="#a78bfa"
                          strokeWidth="12"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors">
                        {label}
                      </span>
                      <Counter value={value} min={min} max={max} onChange={onChange} />
                      <span className="text-xs text-neutral-400 dark:text-neutral-500">{value} {sublabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Paste + blank canvas */}
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold mb-2 uppercase tracking-wider">Paste CSS or SVG</div>
            <div className="flex gap-2 items-start">
              <textarea
                className="flex-1 h-16 bg-neutral-100 dark:bg-neutral-800 rounded p-2 font-mono text-sm text-violet-600 dark:text-violet-300 resize-none focus:outline-none focus:ring-1 focus:ring-violet-500 placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
                placeholder={"clip-path: polygon(50% 0%, 0% 100%, 100% 100%);\nor <polygon points=\"50,0 100,100 0,100\"/>"}
                value={pasteValue}
                onChange={(e) => { setPasteValue(e.target.value); setPasteError(""); }}
                spellCheck={false}
              />
              <Button
                size="sm"
                className="bg-violet-600 hover:bg-violet-500 text-white border-0 px-4 h-16"
                onClick={startFromPaste}
                disabled={!pasteValue.trim()}
              >
                Import
              </Button>
            </div>
            {pasteError && <p className="text-xs text-red-400 mt-1">{pasteError}</p>}
            <button
              className="mt-2 w-full flex items-center justify-center py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-100/40 dark:bg-neutral-800/40 hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-all"
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
