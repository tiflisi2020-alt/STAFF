"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">დაფიქსირდა შეცდომა</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          გვერდის ჩატვირთვა ვერ მოხერხდა. სცადეთ ხელახლა.
        </p>
        <Button type="button" size="lg" className="h-11" onClick={() => reset()}>
          ხელახლა ცდა
        </Button>
      </div>
    </div>
  );
}
