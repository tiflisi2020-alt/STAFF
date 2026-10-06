"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { markNotificationRead, savePushSubscription } from "@/lib/actions/modules";
import { formatRelativeTime } from "@/lib/format";
import type { StoredNotification } from "@/lib/demo/store";
import { cn } from "cn";

export function NotificationList({
  notifications,
  error,
  pushKey = null,
}: {
  notifications: StoredNotification[];
  error: string | null;
  pushKey?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function enablePhoneReminders() {
    if (!pushKey) {
      return;
    }
    startTransition(async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        toast.error("ეს ტელეფონი შეტყობინებას არ იღებს.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("შეტყობინება არ დაუშვით.");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pushKey),
      });
      const json = subscription.toJSON();
      const result = await savePushSubscription({
        endpoint: subscription.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.success);
    });
  }

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
          <div className="flex flex-wrap gap-2">
            {pushKey ? (
              <Button type="button" variant="secondary" disabled={pending} onClick={enablePhoneReminders}>
                ტელეფონზე შეხსენება
              </Button>
            ) : null}
            {notifications.some((item) => !item.is_read) ? (
              <Button type="button" variant="outline" disabled={pending} onClick={() => run()}>
                ყველას წაკითხვა
              </Button>
            ) : null}
          </div>
        }
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {notifications.length === 0 ? (
        <EmptyState title="შეტყობინება არ არის" />
      ) : (
        <div className="surface divide-y divide-border/80 overflow-hidden">
          {notifications.map((item) => (
            <article
              key={item.id}
              className={cn(
                "flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between",
                item.is_read ? "bg-card" : "bg-primary/[0.04]",
              )}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {!item.is_read ? <span className="size-1.5 rounded-full bg-primary" /> : null}
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{formatRelativeTime(item.created_at)}</p>
                </div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.body}</p>
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

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }
  return output;
}
