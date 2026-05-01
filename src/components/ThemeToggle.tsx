"use client";

import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-10 w-10 p-0 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
      onClick={toggle}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun className="w-7 h-7" /> : <Moon className="w-7 h-7" />}
    </Button>
  );
}
