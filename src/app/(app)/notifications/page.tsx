import { NotificationList } from "@/components/notifications/notification-list";
import { requireSession } from "@/lib/auth/context";
import { getEmployeeByProfile } from "@/lib/data/employees";
import { getNotifications } from "@/lib/data/modules";
import { isDemoSession } from "@/lib/demo/session";
import { getPushPublicKey } from "@/lib/reminders";

export const metadata = { title: "შეტყობინებები" };

export default async function NotificationsPage() {
  const context = await requireSession();
  const isAdmin = context.profile.role === "admin";
  const employeeId = isAdmin ? null : await getEmployeeByProfile(context.userId);
  const { notifications, error } = await getNotifications(employeeId, isAdmin);
  const pushKey = (await isDemoSession()) ? getPushPublicKey() : null;
  return <NotificationList notifications={notifications} error={error} pushKey={pushKey} />;
}
