"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/store/editorStore";
import { useState } from "react";
import { Save, LogIn, LogOut, LayoutDashboard } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";

export function EditorHeader() {
  const { data: session } = useSession();
  const { points, cssOutput, canvasSettings } = useEditorStore();
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const handleSave = async () => {
    if (!session) { signIn("github"); return; }
    setSaving(true);
    try {
      await fetch("/api/shapes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          editorState: { points, canvasSettings },
          cssOutput,
          canvasWidth: canvasSettings.width,
          canvasHeight: canvasSettings.height,
        }),
      });
      setSavedMsg("Saved!");
      setTimeout(() => setSavedMsg(""), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <header className="flex items-center justify-between h-12 px-4 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0">
      <div className="flex items-center gap-3">
        <span className="font-semibold text-sm text-neutral-900 dark:text-white tracking-tight">Clip Path Editor</span>
      </div>
      <div className="flex items-center gap-2">
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
          {savedMsg || (session ? "Save" : "Sign in to save")}
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
