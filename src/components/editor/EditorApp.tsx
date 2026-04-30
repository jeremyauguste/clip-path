"use client";

import { Suspense } from "react";
import { Toolbar } from "./Toolbar";
import { Canvas } from "./Canvas";
import { CodePanel } from "./CodePanel";
import { ScalePanel } from "./ScalePanel";
import { EditorHeader } from "./EditorHeader";
import { BoundingBox } from "./BoundingBox";
import { useEditorInit } from "@/hooks/useEditorInit";
import { useSavePreferences } from "@/hooks/useSavePreferences";

function EditorInner() {
  useEditorInit();
  useSavePreferences();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <EditorHeader />
      <div className="flex flex-1 overflow-hidden">
        <Toolbar />
        <div className="flex-1 relative overflow-hidden">
          <Canvas />
          <ScalePanel />
        </div>
        <div className="w-72 flex-shrink-0">
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
