"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { publishWeek } from "@/lib/actions/modules";

export function PublishWeekButton({ weekStart }: { weekStart: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending || !weekStart}
      onClick={() =>
        startTransition(async () => {
          const result = await publishWeek(weekStart);
          if (result.error) {
            toast.error(result.error);
            return;
          }
          toast.success(result.success ?? "გრაფიკი გამოქვეყნდა.");
          result.warnings?.forEach((warning) => toast.warning(warning));
          router.refresh();
        })
      }
    >
      {pending ? "მიმდინარეობს..." : "გრაფიკის გამოქვეყნება"}
    </Button>
  );
}
