"use client";

import dynamic from "next/dynamic";

const EditorApp = dynamic(
  () => import("./EditorApp").then((m) => m.EditorApp),
  { ssr: false, loading: () => null }
);

export function EditorLoader() {
  return <EditorApp />;
}
