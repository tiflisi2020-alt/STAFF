"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" forcedTheme="light" enableSystem={false}>
      <div className="flex min-h-dvh flex-col">{children}</div>
      <Toaster position="top-center" richColors closeButton />
    </ThemeProvider>
  );
}
