"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/store/editorStore";
import { useState } from "react";
import { Save, LogIn, LogOut, LayoutDashboard } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";

export function EditorHeader() {
  const { data: session } = useSession();
  const router = useRouter();
  const { points, cssOutput, canvasSettings, shapeName, shapeId, setShapeName, setShapeId } = useEditorStore();
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const handleSave = async () => {
    if (!session) { signIn("github"); return; }
    setSaving(true);
    try {
      const payload = {
        name: shapeName || "Untitled Shape",
        editorState: { points, canvasSettings },
        cssOutput,
        canvasWidth: canvasSettings.width,
        canvasHeight: canvasSettings.height,
      };

      if (shapeId) {
        await fetch(`/api/shapes/${shapeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        const res = await fetch("/api/shapes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const created = await res.json();
        setShapeId(created.id);
        router.replace(`/editor?shape=${created.id}`);
      }

      setSavedMsg("Saved!");
      setTimeout(() => setSavedMsg(""), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <header className="flex items-center justify-between h-12 px-4 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-semibold text-sm text-neutral-900 dark:text-white tracking-tight flex-shrink-0">Clip Path Editor</span>
        {session && (
          <>
            <span className="text-neutral-300 dark:text-neutral-700 flex-shrink-0">/</span>
            <input
              type="text"
              value={shapeName}
              onChange={(e) => setShapeName(e.target.value)}
              placeholder="Untitled Shape"
              className="text-sm text-neutral-700 dark:text-neutral-300 bg-transparent border-b border-transparent hover:border-neutral-300 dark:hover:border-neutral-600 focus:border-violet-500 focus:outline-none px-1 py-0.5 w-40 truncate"
            />
          </>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {session && (
          <Link href="/dashboard">
            <Button size="sm" variant="ghost" className="text-neutral-700 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white h-8">
              <LayoutDashboard className="w-3.5 h-3.5 mr-1" />
              My Shapes
            </Button>
          </Link>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="text-neutral-700 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white h-8"
          onClick={handleSave}
          disabled={saving || !points.length}
        >
          <Save className="w-3.5 h-3.5 mr-1" />
          {savedMsg || (session ? (shapeId ? "Save" : "Save") : "Sign in to save")}
        </Button>
        {session ? (
          <Button
            size="sm"
            variant="ghost"
            className="text-neutral-700 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white h-8"
            onClick={() => signOut()}
          >
            <LogOut className="w-3.5 h-3.5 mr-1" />
            Sign out
          </Button>
        ) : (
          <Button size="sm" variant="ghost" className="h-8" onClick={() => signIn("github")}>
            <LogIn className="w-3.5 h-3.5 mr-1" />
            Sign in
          </Button>
        )}
        {session?.user?.image && (
          <img src={session.user.image} alt="" className="w-7 h-7 rounded-full" />
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
