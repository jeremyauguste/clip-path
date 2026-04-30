import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Pen, Code2, Download } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center flex-1 px-6 py-20 text-center">
      <h1 className="text-4xl font-bold tracking-tight mb-4">
        CSS Clip-Path Editor
      </h1>
      <p className="text-neutral-600 dark:text-neutral-400 text-lg max-w-md mb-8">
        Build, edit, and export CSS clip-path shapes visually. Works with polygons, curves, and SVG imports.
      </p>
      <Link href="/editor">
        <Button size="lg" className="text-base px-8">
          Open Editor
        </Button>
      </Link>

      <div className="grid grid-cols-3 gap-8 mt-16 max-w-lg text-left">
        <div>
          <Pen className="w-5 h-5 text-violet-600 dark:text-violet-400 mb-2" />
          <h3 className="font-medium text-sm mb-1">Visual editor</h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-500">Drag points, add curves, and see your shape update in real time.</p>
        </div>
        <div>
          <Code2 className="w-5 h-5 text-violet-600 dark:text-violet-400 mb-2" />
          <h3 className="font-medium text-sm mb-1">Live CSS sync</h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-500">Edit code directly or paste polygon/SVG and the canvas updates instantly.</p>
        </div>
        <div>
          <Download className="w-5 h-5 text-violet-600 dark:text-violet-400 mb-2" />
          <h3 className="font-medium text-sm mb-1">One-click export</h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-500">Copy your clip-path CSS string and drop it straight into your stylesheet.</p>
        </div>
      </div>
    </main>
  );
}
