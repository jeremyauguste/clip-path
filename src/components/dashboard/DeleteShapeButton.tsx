"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteShapeButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Delete this shape?")) return;
    setLoading(true);
    await fetch(`/api/shapes/${id}`, { method: "DELETE" });
    router.refresh();
    setLoading(false);
  };

  return (
    <Button
      size="icon"
      variant="destructive"
      className="h-7 w-7"
      onClick={handleDelete}
      disabled={loading}
    >
      <Trash2 className="w-3 h-3" />
    </Button>
  );
}
