"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  const [promptOpen, setPromptOpen] = useState(false);
  const [draftName, setDraftName] = useState("");

  const performSave = async (nameOverride?: string) => {
    const finalName = nameOverride ?? shapeName;
    if (nameOverride) setShapeName(nameOverride);
    setSaving(true);
    try {
      const payload = {
        name: finalName || "Untitled Shape",
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

  const handleSave = () => {
    if (!session) { signIn("github"); return; }
    const isUnnamed = !shapeName.trim() || shapeName.trim() === "Untitled Shape";
    if (isUnnamed) {
      setDraftName("");
      setPromptOpen(true);
      return;
    }
    performSave();
  };

  return (
    <>
    <Dialog open={promptOpen} onOpenChange={setPromptOpen}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Name your shape</DialogTitle>
        </DialogHeader>
        <input
          type="text"
          autoFocus
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draftName.trim()) {
              setPromptOpen(false);
              performSave(draftName.trim());
            }
          }}
          placeholder="e.g. Hero banner mask"
          className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => { setPromptOpen(false); performSave("Untitled Shape"); }}
          >
            Save as Untitled
          </Button>
          <Button
            disabled={!draftName.trim()}
            onClick={() => { setPromptOpen(false); performSave(draftName.trim()); }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <header className="flex items-center justify-between h-16 px-5 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Link href="/" className="font-semibold text-lg text-neutral-900 dark:text-white tracking-tight flex-shrink-0 hover:text-violet-500 dark:hover:text-violet-400 transition-colors">Clip Path Editor</Link>
        {session && (
          <>
            <span className="text-neutral-300 dark:text-neutral-700 flex-shrink-0">/</span>
            <input
              type="text"
              value={shapeName}
              onChange={(e) => setShapeName(e.target.value)}
              placeholder="Untitled Shape"
              className="text-base text-neutral-700 dark:text-neutral-300 bg-transparent border-b border-transparent hover:border-neutral-300 dark:hover:border-neutral-600 focus:border-violet-500 focus:outline-none px-1 py-0.5 min-w-0 w-full max-w-48 truncate"
            />
          </>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {session && (
          <Link href="/dashboard">
            <Button size="sm" variant="ghost" className="text-base text-neutral-700 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white h-10 px-3">
              <LayoutDashboard className="w-7 h-7 mr-2" />
              My Shapes
            </Button>
          </Link>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="text-base text-neutral-700 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white h-10 px-3"
          onClick={handleSave}
          disabled={saving || !points.length}
        >
          <Save className="w-7 h-7 mr-2" />
          {savedMsg || (session ? (shapeId ? "Save" : "Save") : "Sign in to save")}
        </Button>
        {session ? (
          <Button
            size="sm"
            variant="ghost"
            className="text-base text-neutral-700 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white h-10 px-3"
            onClick={() => signOut()}
          >
            <LogOut className="w-7 h-7 mr-2" />
            Sign out
          </Button>
        ) : (
          <Button size="sm" variant="ghost" className="text-base h-10 px-3" onClick={() => signIn("github")}>
            <LogIn className="w-7 h-7 mr-2" />
            Sign in
          </Button>
        )}
        {session?.user?.image && (
          <img src={session.user.image} alt="" className="w-9 h-9 rounded-full" />
        )}
        <ThemeToggle />
      </div>
    </header>
    </>
  );
}
