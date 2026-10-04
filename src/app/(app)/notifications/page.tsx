import { NotificationList } from "@/components/notifications/notification-list";
import { requireSession } from "@/lib/auth/context";
import { getNotifications } from "@/lib/data/modules";

export const metadata = { title: "შეტყობინებები" };

export default async function NotificationsPage() {
  await requireSession();
  const { notifications, error } = await getNotifications();
  return <NotificationList notifications={notifications} error={error} />;
}
