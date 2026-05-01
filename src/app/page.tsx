import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Pen, Code2, Download, ChevronDown, ChevronUp } from "lucide-react";
import { RevealGroup, RevealItem } from "@/components/ScrollReveal";

export default function HomePage() {
  return (
    <main className="flex flex-col">

      {/* Hero — fills the viewport, content vertically centered */}
      <section className="relative flex flex-col items-center justify-center min-h-screen text-center px-6 py-16">
        <h1
          className="animate-fade-up text-4xl font-bold tracking-tight mb-4"
          style={{ animationDelay: "0ms" }}
        >
          CSS Clip-Path Editor
        </h1>
        <p
          className="animate-fade-up text-neutral-600 dark:text-neutral-400 text-lg max-w-md mb-8"
          style={{ animationDelay: "80ms" }}
        >
          Build, edit, and export CSS clip-path shapes visually. Works with polygons, curves, and SVG imports.
        </p>
        <div className="animate-fade-up" style={{ animationDelay: "160ms" }}>
          <Link href="/editor">
            <Button size="lg" className="text-base px-8 hover:scale-[1.04] hover:brightness-110 transition-all duration-150">
              Open Editor
            </Button>
          </Link>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-3 gap-8 mt-16 max-w-lg text-left">
          <div className="animate-fade-up" style={{ animationDelay: "260ms" }}>
            <Pen className="w-5 h-5 text-violet-600 dark:text-violet-400 mb-2" />
            <h3 className="font-medium text-lg mb-1">Visual editor</h3>
            <p className="text-base text-neutral-600 dark:text-neutral-500">Drag points, add curves, and see your shape update in real time.</p>
          </div>
          <div className="animate-fade-up" style={{ animationDelay: "340ms" }}>
            <Code2 className="w-5 h-5 text-violet-600 dark:text-violet-400 mb-2" />
            <h3 className="font-medium text-lg mb-1">Live CSS sync</h3>
            <p className="text-base text-neutral-600 dark:text-neutral-500">Edit code directly or paste polygon/SVG and the canvas updates instantly.</p>
          </div>
          <div className="animate-fade-up" style={{ animationDelay: "420ms" }}>
            <Download className="w-5 h-5 text-violet-600 dark:text-violet-400 mb-2" />
            <h3 className="font-medium text-lg mb-1">One-click export</h3>
            <p className="text-base text-neutral-600 dark:text-neutral-500">Copy your clip-path CSS string and drop it straight into your stylesheet.</p>
          </div>
        </div>

        {/* About link — pinned to bottom of hero */}
        <a
          href="#about"
          className="animate-fade-up absolute bottom-8 flex flex-col items-center gap-1.5 text-base font-semibold text-neutral-500 dark:text-neutral-400 hover:text-violet-500 dark:hover:text-violet-400 transition-colors"
          style={{ animationDelay: "500ms" }}
        >
          About
          <ChevronDown className="w-5 h-5 animate-bounce" />
        </a>
      </section>

      {/* Scroll target */}
      <div id="about" />

      {/* About — staggered reveal on scroll */}
      <RevealGroup className="w-full">
        <section className="flex flex-col items-center px-6 pb-24">
          <div className="w-full max-w-2xl">

            <RevealItem delay={0}>
              <div className="border-t border-neutral-200 dark:border-neutral-800 mb-16" />
            </RevealItem>

            <RevealItem delay={80}>
              <h2 className="text-2xl font-bold tracking-tight mb-10 text-center">About</h2>
            </RevealItem>

            <div className="grid sm:grid-cols-2 gap-10">
              <RevealItem delay={160}>
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-neutral-900 dark:text-neutral-100">Why it was built</h3>
                  <p className="text-base text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    When I made custom <code className="font-mono text-violet-600 dark:text-violet-400">clip-path</code> shapes for my portfolio site, I thought there should be a tool out there that could help make the process easier. However, the ones I found didn't do what I wanted exactly how I wanted. After I made some mistakes creating shapes by hand and realizing that I couldn't scale them down properly, I had to find a better way. This want for an easy-to-use tool and a need to submit an AI-powered project for my Low and No-Code course at UCF led me to make this site.
                  </p>
                </div>
              </RevealItem>

              <RevealItem delay={240}>
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-neutral-900 dark:text-neutral-100">How it was built</h3>
                  <p className="text-base text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    Built with <span className="text-neutral-700 dark:text-neutral-300 font-medium">Next.js</span> and <span className="text-neutral-700 dark:text-neutral-300 font-medium">TypeScript</span>, with <span className="text-neutral-700 dark:text-neutral-300 font-medium">Zustand</span> for editor state and undo/redo history. The canvas is rendered with raw SVG. Styling uses <span className="text-neutral-700 dark:text-neutral-300 font-medium">Tailwind CSS</span> and shadcn/ui. User accounts and shape persistence are powered by <span className="text-neutral-700 dark:text-neutral-300 font-medium">NextAuth</span>, <span className="text-neutral-700 dark:text-neutral-300 font-medium">Prisma</span>, and <span className="text-neutral-700 dark:text-neutral-300 font-medium">Supabase</span>. Developed with the help of <span className="text-neutral-700 dark:text-neutral-300 font-medium">Claude</span> by Anthropic.
                  </p>
                </div>
              </RevealItem>

              <RevealItem delay={320} className="sm:col-span-2">
                <div>
                  <h3 className="font-semibold text-lg mb-4 text-neutral-900 dark:text-neutral-100">How it works</h3>
                  <p className="text-base text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6">
                    Place and drag anchor points on an interactive canvas to define your shape. Double-click any point to cycle its curve type, drag control handles to sculpt Bézier curves and arcs, and copy the live CSS output straight into your stylesheet. You can also paste in existing <code className="font-mono text-sm text-violet-600 dark:text-violet-400">polygon()</code> or <code className="font-mono text-sm text-violet-600 dark:text-violet-400">path()</code> CSS to import and keep editing.
                  </p>

                  <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden grid sm:grid-cols-2">

                    <div className="p-5 border-b border-r border-neutral-200 dark:border-neutral-800">
                      <p className="font-semibold text-base text-neutral-700 dark:text-neutral-300 mb-3">Tools</p>
                      <dl className="space-y-2">
                        {[
                          ["V", "Select — drag points or control handles"],
                          ["P", "Pen — click canvas to add points; click an edge to insert between two"],
                          ["H", "Hand — drag to pan; two-finger scroll or Ctrl+scroll to zoom"],
                        ].map(([key, desc]) => (
                          <div key={key} className="flex gap-3">
                            <kbd className="shrink-0 font-mono text-xs bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded px-1.5 py-0.5 text-neutral-700 dark:text-neutral-300">{key}</kbd>
                            <span className="text-sm text-neutral-500 dark:text-neutral-400">{desc}</span>
                          </div>
                        ))}
                      </dl>
                    </div>

                    <div className="p-5 border-b border-neutral-200 dark:border-neutral-800">
                      <p className="font-semibold text-base text-neutral-700 dark:text-neutral-300 mb-3">Keyboard shortcuts</p>
                      <dl className="space-y-2">
                        {[
                          ["G", "Toggle snap to grid"],
                          ["F", "Zoom to fit canvas"],
                          ["⌘Z / Ctrl Z", "Undo"],
                          ["⌘⇧Z / Ctrl Y", "Redo"],
                          ["↑ ↓ ← →", "Nudge selected point 1 px"],
                          ["⇧ + arrows", "Nudge 10 px"],
                          ["Del / ⌫", "Delete selected point"],
                        ].map(([key, desc]) => (
                          <div key={key} className="flex gap-3">
                            <kbd className="shrink-0 font-mono text-xs bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded px-1.5 py-0.5 text-neutral-700 dark:text-neutral-300 whitespace-nowrap">{key}</kbd>
                            <span className="text-sm text-neutral-500 dark:text-neutral-400">{desc}</span>
                          </div>
                        ))}
                      </dl>
                    </div>

                    <div className="p-5 border-r border-neutral-200 dark:border-neutral-800">
                      <p className="font-semibold text-base text-neutral-700 dark:text-neutral-300 mb-1">Curve types</p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">Double-click any anchor point to cycle through types:</p>
                      <dl className="space-y-2">
                        {[
                          ["Corner", "Sharp vertex, no handles"],
                          ["Smooth", "Cubic Bézier — two independent handles (orange)"],
                          ["Quadratic", "Single control point (green)"],
                          ["Arc", "SVG elliptical arc — drag the midpoint handle (blue) to adjust curvature"],
                        ].map(([type, desc]) => (
                          <div key={type} className="flex gap-3">
                            <span className="shrink-0 font-medium text-sm text-neutral-700 dark:text-neutral-300 w-24">{type}</span>
                            <span className="text-sm text-neutral-500 dark:text-neutral-400">{desc}</span>
                          </div>
                        ))}
                      </dl>
                    </div>

                    <div className="p-5">
                      <p className="font-semibold text-base text-neutral-700 dark:text-neutral-300 mb-3">Shift-drag</p>
                      <dl className="space-y-2">
                        {[
                          ["Smooth / Quadratic", "Handles translate with the anchor — curve shape is preserved"],
                          ["Arc point", "Endpoint slides along the existing circle — radius and center stay fixed"],
                        ].map(([type, desc]) => (
                          <div key={type} className="flex gap-3">
                            <span className="shrink-0 font-medium text-sm text-neutral-700 dark:text-neutral-300 w-36">{type}</span>
                            <span className="text-sm text-neutral-500 dark:text-neutral-400">{desc}</span>
                          </div>
                        ))}
                      </dl>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-3">Press Shift mid-drag to activate either behavior from the current position.</p>
                    </div>

                  </div>
                </div>
              </RevealItem>

              <RevealItem delay={420} className="sm:col-span-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2 text-neutral-900 dark:text-neutral-100">Open source</h3>
                    <p className="text-base text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      The full source code is available on GitHub. Contributions, bug reports, and feature suggestions are welcome.
                    </p>
                  </div>
                </div>
                  <a
                    href="https://github.com/jeremyauguste/clip-path"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-base font-medium text-neutral-700 dark:text-neutral-300 hover:text-violet-600 dark:hover:text-violet-400 transition-colors shrink-0"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.461-1.11-1.461-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                    </svg>
                    jeremyauguste/clip-path
                  </a>
              </RevealItem>
            </div>

            {/* Back to top */}
            <RevealItem delay={500} className="flex justify-center mt-16">
              <a
                href="#"
                className="flex flex-col items-center gap-1.5 text-base font-semibold text-neutral-500 dark:text-neutral-400 hover:text-violet-500 dark:hover:text-violet-400 transition-colors"
              >
                <ChevronUp className="w-5 h-5" />
                Back to top
              </a>
            </RevealItem>

          </div>
        </section>
      </RevealGroup>

    </main>
  );
}
