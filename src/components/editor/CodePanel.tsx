"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { useEditorStore } from "@/store/editorStore";
import { parseImport } from "@/lib/importParser";
import { buildSvgPath } from "@/lib/cssGenerator";
import { Button } from "@/components/ui/button";
import { Copy, Check, FileDown } from "lucide-react";

export function CodePanel() {
  const {
    cssOutput, cssFormat, setCssFormat, setCssOutput, setPoints, canvasSettings, pushHistory,
    selectedPointId, points, updatePoint,
    shapeName,
  } = useEditorStore();

  const [copied, setCopied] = useState(false);
  const parseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coordHistPushed = useRef(false);

  // Local input state for coordinates — updated from store when the selected point changes
  const [inputX, setInputX] = useState("");
  const [inputY, setInputY] = useState("");
  const xFocused = useRef(false);
  const yFocused = useRef(false);

  const selectedPoint = points.find((p) => p.id === selectedPointId) ?? null;

  // Sync coordinate inputs when selected point moves (drag, nudge) but not while typing
  useEffect(() => {
    if (!selectedPoint) return;
    if (!xFocused.current) setInputX(String(Math.round(selectedPoint.x * 10) / 10));
    if (!yFocused.current) setInputY(String(Math.round(selectedPoint.y * 10) / 10));
  }, [selectedPoint?.id, selectedPoint?.x, selectedPoint?.y]);

  const handleCoordChange = useCallback(
    (axis: "x" | "y", raw: string) => {
      const val = parseFloat(raw);
      if (isNaN(val)) return;
      if (!coordHistPushed.current) { pushHistory(); coordHistPushed.current = true; }
      if (axis === "x") { setInputX(raw); updatePoint(selectedPoint!.id, { x: val }); }
      else              { setInputY(raw); updatePoint(selectedPoint!.id, { y: val }); }
    },
    [selectedPoint, pushHistory, updatePoint]
  );

  const handleCopy = useCallback(async () => {
    if (!cssOutput) return;
    await navigator.clipboard.writeText(cssOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [cssOutput]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setCssOutput(value);
      if (parseTimeoutRef.current) clearTimeout(parseTimeoutRef.current);
      parseTimeoutRef.current = setTimeout(() => {
        const parsed = parseImport(value, canvasSettings.width, canvasSettings.height);
        if (parsed && parsed.length > 0) { pushHistory(); setPoints(parsed); }
      }, 400);
    },
    [setCssOutput, canvasSettings, pushHistory, setPoints]
  );

  const handleExportSvg = useCallback(() => {
    const { points: pts, canvasSettings: cs, shapeName: name } = useEditorStore.getState();
    const { width, height, previewColor } = cs;
    const pathData = buildSvgPath(pts);
    if (!pathData) return;
    const isHollow = pts.some((p) => p.subpathStart);
    const fillRule = isHollow ? ' fill-rule="evenodd"' : "";
    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
      `  <defs>`,
      `    <clipPath id="clip">`,
      `      <path d="${pathData}"${fillRule}/>`,
      `    </clipPath>`,
      `  </defs>`,
      `  <rect width="${width}" height="${height}" fill="${previewColor}" clip-path="url(#clip)"/>`,
      `</svg>`,
    ].join("\n");
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(name || "shape").toLowerCase().replace(/\s+/g, "-")}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const isPx = cssFormat === "pixel";
  const isForcedPath = cssFormat === "path";
  const isPath = cssOutput.includes("path(");
  const hasCurves = isPath && !isForcedPath;

  const inputClass =
    "w-20 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-sm text-center rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800">

      {/* Header: label + format buttons + copy + export */}
      <div className="flex flex-col px-4 py-2 gap-2 border-b border-neutral-200 dark:border-neutral-800">
        <span className="text-sm font-mono font-semibold text-neutral-700 dark:text-neutral-400 uppercase tracking-wider">CSS Output</span>
        <div className="flex items-center gap-1 flex-wrap">
          {!hasCurves && (
            <Button
              size="sm" variant="ghost"
              className="h-8 px-2 text-neutral-700 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white border border-neutral-200 dark:border-transparent disabled:opacity-30"
              title={isForcedPath ? "Convert back to polygon()" : "Convert to path()"}
              disabled={!cssOutput}
              onClick={() => setCssFormat(isForcedPath ? "percent" : "path")}
            >
              <span className="text-sm font-mono">{isForcedPath ? "→ polygon()" : "→ path()"}</span>
            </Button>
          )}
          <Button
            size="sm" variant="ghost"
            className="h-8 px-2 text-neutral-700 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white border border-neutral-200 dark:border-transparent disabled:opacity-30"
            title={isPath ? "Unit conversion not available for path() shapes" : isPx ? "Convert to percentages" : "Convert to pixels"}
            disabled={!cssOutput || isPath}
            onClick={() => setCssFormat(isPx ? "percent" : "pixel")}
          >
            <span className="text-sm font-mono">{isPx ? "px → %" : "% → px"}</span>
          </Button>
          <Button
            size="sm" variant="ghost"
            className="h-8 px-2 text-neutral-700 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            onClick={handleCopy} disabled={!cssOutput}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span className="ml-1 text-sm">{copied ? "Copied" : "Copy"}</span>
          </Button>
          <Button
            size="sm" variant="ghost"
            className="h-8 px-2 text-neutral-700 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            title="Export as SVG file"
            onClick={handleExportSvg} disabled={!cssOutput}
          >
            <FileDown className="w-4 h-4" />
            <span className="ml-1 text-sm">SVG</span>
          </Button>
        </div>
      </div>

      {/* Selected point coordinates */}
      {selectedPoint && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60">
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-mono shrink-0">Point</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-neutral-500 dark:text-neutral-500 font-mono">X</span>
            <input
              type="number"
              step="any"
              className={inputClass}
              value={inputX}
              onFocus={() => { xFocused.current = true; coordHistPushed.current = false; }}
              onBlur={() => { xFocused.current = false; coordHistPushed.current = false; }}
              onChange={(e) => handleCoordChange("x", e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-neutral-500 dark:text-neutral-500 font-mono">Y</span>
            <input
              type="number"
              step="any"
              className={inputClass}
              value={inputY}
              onFocus={() => { yFocused.current = true; coordHistPushed.current = false; }}
              onBlur={() => { yFocused.current = false; coordHistPushed.current = false; }}
              onChange={(e) => handleCoordChange("y", e.target.value)}
            />
          </div>
          <span className="text-xs text-neutral-400 dark:text-neutral-600 capitalize shrink-0">{selectedPoint.type}</span>
        </div>
      )}

      <textarea
        className="flex-1 resize-none bg-transparent font-mono text-base text-violet-600 dark:text-violet-300 p-4 focus:outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
        value={cssOutput}
        onChange={handleChange}
        placeholder={`Paste CSS here to import...\n\nExamples:\nclip-path: polygon(50% 0%, 0% 100%, 100% 100%);\nclip-path: path("M 50 0 C 100 0, 100 100, 50 100 Z");\n<polygon points="50,0 100,100 0,100"/>`}
        spellCheck={false}
      />
    </div>
  );
}
