"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEditorStore } from "@/store/editorStore";
import { EditorState } from "@/types/shape";

export function useEditorInit() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const shapeId = searchParams.get("shape");
  const initialized = useRef(false);

  const { loadEditorState, setCanvasSettings } = useEditorStore();

  // Load shape from URL param
  useEffect(() => {
    if (!shapeId || !session || initialized.current) return;
    initialized.current = true;

    fetch(`/api/shapes/${shapeId}`)
      .then((r) => r.json())
      .then((shape) => {
        if (shape.error) return;
        loadEditorState(shape.editorState as EditorState, shape.cssOutput as string);
      })
      .catch(() => {});
  }, [shapeId, session]);

  // Load user preferences (only when no shape is being loaded)
  useEffect(() => {
    if (!session || shapeId) return;

    fetch("/api/preferences")
      .then((r) => r.json())
      .then((prefs) => {
        if (!prefs) return;
        setCanvasSettings({
          previewMode: prefs.previewMode,
          previewColor: prefs.previewColor,
          width: prefs.canvasWidth,
          height: prefs.canvasHeight,
        });
      })
      .catch(() => {});
  }, [session]);
}
