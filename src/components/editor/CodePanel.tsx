"use client";

import { useCallback, useRef, useState } from "react";
import { useEditorStore } from "@/store/editorStore";
import { parseImport } from "@/lib/importParser";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

export function CodePanel() {
  const { cssOutput, cssFormat, setCssFormat, setCssOutput, setPoints, canvasSettings, pushHistory } = useEditorStore();
  const [copied, setCopied] = useState(false);
  const parseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      // Debounce parsing so we don't thrash on every keystroke
      if (parseTimeoutRef.current) clearTimeout(parseTimeoutRef.current);
      parseTimeoutRef.current = setTimeout(() => {
        const parsed = parseImport(value, canvasSettings.width, canvasSettings.height);
        if (parsed && parsed.length > 0) {
          pushHistory();
          setPoints(parsed);
        }
      }, 400);
    },
    [setCssOutput, canvasSettings, pushHistory, setPoints]
  );

  const isPx = cssFormat === "pixel";
  const isPath = cssOutput.includes("path(");

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-200 dark:border-neutral-800">
        <span className="text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-400 uppercase tracking-wider">CSS Output</span>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-neutral-700 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white border border-neutral-200 dark:border-transparent disabled:opacity-30"
            title={isPath ? "Unit conversion not available for path() shapes" : isPx ? "Convert to percentages" : "Convert to pixels"}
            disabled={!cssOutput || isPath}
            onClick={() => setCssFormat(isPx ? "percent" : "pixel")}
          >
            <span className="text-xs font-mono">{isPx ? "px → %" : "% → px"}</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-neutral-700 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            onClick={handleCopy}
            disabled={!cssOutput}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="ml-1 text-xs">{copied ? "Copied" : "Copy"}</span>
          </Button>
        </div>
      </div>
      <textarea
        className="flex-1 resize-none bg-transparent font-mono text-sm text-violet-600 dark:text-violet-300 p-4 focus:outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
        value={cssOutput}
        onChange={handleChange}
        placeholder={`Paste CSS here to import...\n\nExamples:\nclip-path: polygon(50% 0%, 0% 100%, 100% 100%);\nclip-path: path("M 50 0 C 100 0, 100 100, 50 100 Z");\n<polygon points="50,0 100,100 0,100"/>`}
        spellCheck={false}
      />
    </div>
  );
}
