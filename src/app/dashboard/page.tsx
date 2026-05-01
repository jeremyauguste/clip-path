import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ShapeCard } from "@/components/dashboard/ShapeCard";
import { PathPoint, CanvasSettings } from "@/types/shape";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const shapes = await prisma.shape.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <header className="animate-fade-up flex items-center justify-between h-16 px-5 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <Link href="/" className="font-semibold text-lg tracking-tight hover:text-violet-500 dark:hover:text-violet-400 transition-colors">
          Clip Path Editor
        </Link>
        <Link href="/editor">
          <Button size="sm" className="h-8">
            <Plus className="w-3.5 h-3.5 mr-1" />
            New shape
          </Button>
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="animate-fade-up text-xl font-semibold mb-6" style={{ animationDelay: "60ms" }}>My Shapes</h1>

        {shapes.length === 0 ? (
          <div className="animate-fade-up text-center py-20 text-neutral-500 dark:text-neutral-400" style={{ animationDelay: "120ms" }}>
            <p className="mb-4">No saved shapes yet.</p>
            <Link href="/editor">
              <Button variant="outline" className="border-neutral-300 dark:border-neutral-700">
                Create your first shape
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {shapes.map((shape, index) => {
              const editorState = shape.editorState as { points: PathPoint[]; canvasSettings: CanvasSettings } | null;
              const points = editorState?.points ?? [];
              return (
                <div key={shape.id} className="animate-fade-up" style={{ animationDelay: `${120 + index * 50}ms` }}>
                  <ShapeCard
                    id={shape.id}
                    name={shape.name}
                    canvasWidth={shape.canvasWidth}
                    canvasHeight={shape.canvasHeight}
                    points={points}
                    updatedAt={shape.updatedAt.toISOString()}
                    editorState={shape.editorState}
                    cssOutput={shape.cssOutput ?? ""}
                  />
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
