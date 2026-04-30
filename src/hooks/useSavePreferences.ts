"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useEditorStore } from "@/store/editorStore";

export function useSavePreferences() {
  const { data: session } = useSession();
  const { canvasSettings } = useEditorStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (!session || firstRender.current) {
      firstRender.current = false;
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          previewMode: canvasSettings.previewMode,
          previewColor: canvasSettings.previewColor,
          canvasWidth: canvasSettings.width,
          canvasHeight: canvasSettings.height,
        }),
      }).catch(() => {});
    }, 1000);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [canvasSettings, session]);
}
