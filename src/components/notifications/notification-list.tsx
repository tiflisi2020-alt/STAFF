"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { markNotificationRead } from "@/lib/actions/modules";
import type { StoredNotification } from "@/lib/demo/store";

export function NotificationList({
  notifications,
  error,
}: {
  notifications: StoredNotification[];
  error: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(id?: string) {
    startTransition(async () => {
      const result = await markNotificationRead(id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.success);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="შეტყობინებები"
        action={
          notifications.some((item) => !item.is_read) ? (
            <Button type="button" variant="outline" disabled={pending} onClick={() => run()}>
              ყველას წაკითხვა
            </Button>
          ) : null
        }
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {notifications.length === 0 ? (
        <EmptyState title="შეტყობინება არ არის" />
      ) : (
        <div className="space-y-2">
          {notifications.map((item) => (
            <article
              key={item.id}
              className={`flex flex-col gap-3 rounded-2xl px-4 py-3 shadow-sm ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:justify-between ${item.is_read ? "bg-card" : "bg-primary/5"}`}
            >
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm leading-6 text-muted-foreground">{item.body}</p>
              </div>
              {item.is_read ? (
                <span className="text-sm text-muted-foreground">წაკითხული</span>
              ) : (
                <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(item.id)}>
                  წაკითხულად მონიშვნა
                </Button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
