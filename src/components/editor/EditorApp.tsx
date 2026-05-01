"use client";

import { Suspense } from "react";
import { Toolbar } from "./Toolbar";
import { Canvas } from "./Canvas";
import { CodePanel } from "./CodePanel";
import { CanvasSettingsBar } from "./CanvasSettingsBar";
import { EditorHeader } from "./EditorHeader";
import { BoundingBox } from "./BoundingBox";
import { useEditorInit } from "@/hooks/useEditorInit";
import { useSavePreferences } from "@/hooks/useSavePreferences";

function EditorInner() {
  useEditorInit();
  useSavePreferences();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="animate-fade-up flex-shrink-0" style={{ animationDelay: "0ms" }}>
        <EditorHeader />
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="animate-fade-from-left flex-shrink-0" style={{ animationDelay: "60ms" }}>
          <Toolbar />
        </div>
        <div className="animate-fade-in flex-1 relative overflow-hidden" style={{ animationDelay: "80ms" }}>
          <Canvas />
          <CanvasSettingsBar />
        </div>
        <div className="animate-fade-from-right flex-shrink-0 w-72" style={{ animationDelay: "60ms" }}>
          <CodePanel />
        </div>
      </div>
    </div>
  );
}

export function EditorApp() {
  return (
    <Suspense>
      <EditorInner />
    </Suspense>
  );
}
