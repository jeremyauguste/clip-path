"use client";

import { useState } from "react";
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
  const [open, setOpen] = useState(false);
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

      <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-100 max-w-lg">
        <DialogHeader>
          <DialogTitle>New Shape</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Presets */}
          <div>
            <div className="text-xs text-neutral-400 mb-2 uppercase tracking-wider">Start from preset</div>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(PRESETS).map(([key, { label }]) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  className="text-xs border-neutral-700 hover:bg-neutral-800"
                  onClick={() => startFromPreset(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Paste code */}
          <div>
            <div className="text-xs text-neutral-400 mb-2 uppercase tracking-wider">Paste CSS or SVG</div>
            <textarea
              className="w-full h-24 bg-neutral-800 rounded p-2 font-mono text-sm text-violet-300 resize-none focus:outline-none focus:ring-1 focus:ring-violet-500 placeholder:text-neutral-600"
              placeholder={"clip-path: polygon(50% 0%, 0% 100%, 100% 100%);\nor <polygon points=\"50,0 100,100 0,100\"/>"}
              value={pasteValue}
              onChange={(e) => { setPasteValue(e.target.value); setPasteError(""); }}
              spellCheck={false}
            />
            {pasteError && <p className="text-xs text-red-400 mt-1">{pasteError}</p>}
            <Button
              size="sm"
              className="mt-2"
              onClick={startFromPaste}
              disabled={!pasteValue.trim()}
            >
              Import
            </Button>
          </div>

          {/* Blank canvas */}
          <div>
            <div className="text-xs text-neutral-400 mb-2 uppercase tracking-wider">Or</div>
            <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-white" onClick={startBlank}>
              Start with blank canvas
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
