"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PenLine, Copy } from "lucide-react";
import { DeleteShapeButton } from "./DeleteShapeButton";
import { buildSvgPath } from "@/lib/cssGenerator";
import { PathPoint } from "@/types/shape";
import { Button } from "@/components/ui/button";

interface ShapeCardProps {
  id: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  points: PathPoint[];
  updatedAt: string;
  editorState: unknown;
  cssOutput: string;
}

export function ShapeCard({ id, name, canvasWidth, canvasHeight, points, updatedAt, editorState, cssOutput }: ShapeCardProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(name);
  const [editName, setEditName] = useState(name);
  const [isEditing, setIsEditing] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const svgPath = buildSvgPath(points);
  const strokeWidth = Math.max(canvasWidth, canvasHeight) / 40;

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.preventDefault();
    setDuplicating(true);
    try {
      const res = await fetch("/api/shapes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${displayName} (copy)`,
          editorState,
          cssOutput,
          canvasWidth,
          canvasHeight,
        }),
      });
      if (res.ok) router.refresh();
    } finally {
      setDuplicating(false);
    }
  };

  const startEdit = () => {
    setEditName(displayName);
    setIsEditing(true);
  };

  const commitRename = async () => {
    const trimmed = editName.trim() || "Untitled Shape";
    setIsEditing(false);
    if (trimmed === displayName) return;
    const prev = displayName;
    setDisplayName(trimmed);
    try {
      const res = await fetch(`/api/shapes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) setDisplayName(prev);
    } catch {
      setDisplayName(prev);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditName(displayName);
  };

  return (
    <div className="group relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden hover:border-violet-500 transition-colors">
      {/* Shape preview */}
      <Link href={`/editor?shape=${id}`} className="block h-36 flex items-center justify-center bg-neutral-100 dark:bg-neutral-950 p-3 cursor-pointer">
        {svgPath ? (
          <svg
            viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            <path
              d={svgPath}
              fill="rgba(139, 92, 246, 0.3)"
              stroke="#a78bfa"
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <div className="w-full h-full bg-violet-500/20 rounded" />
        )}
      </Link>

      <div className="p-3">
        {isEditing ? (
          <input
            autoFocus
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") cancelEdit();
            }}
            onBlur={commitRename}
            className="text-base font-medium bg-transparent border-b border-violet-500 focus:outline-none w-full"
          />
        ) : (
          <div className="flex items-center gap-1 group/name">
            <button
              onClick={startEdit}
              className="text-base font-medium truncate flex-1 text-left hover:text-violet-500 transition-colors"
              title="Rename"
            >
              {displayName}
            </button>
            <PenLine className="w-3 h-3 opacity-0 group-hover/name:opacity-100 transition-opacity text-neutral-400 flex-shrink-0 pointer-events-none" />
          </div>
        )}
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
          {new Date(updatedAt).toLocaleDateString()}
        </p>
      </div>

      {/* Hover actions */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Button
          size="icon"
          variant="secondary"
          className="h-7 w-7"
          onClick={handleDuplicate}
          disabled={duplicating}
          title="Duplicate shape"
        >
          <Copy className="w-3 h-3" />
        </Button>
        <DeleteShapeButton id={id} />
      </div>
    </div>
  );
}
