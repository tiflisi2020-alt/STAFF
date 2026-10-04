import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { requireSession } from "@/lib/auth/context";
import { getDashboard } from "@/lib/data/dashboard";
import { getEmployeeByProfile } from "@/lib/data/employees";
import { formatTodayLabel } from "@/lib/dates";

export const metadata = {
  title: "მთავარი",
};

export default async function HomePage() {
  const context = await requireSession();
  const linkedEmployeeId =
    context.profile.role === "employee" ? await getEmployeeByProfile(context.userId) : null;
  const data = await getDashboard(context.timezone, linkedEmployeeId ?? undefined);
  const name = context.profile.full_name || "კოლეგა";

  return (
    <DashboardHome
      role={context.profile.role}
      name={name}
      todayLabel={formatTodayLabel(context.timezone)}
      data={data}
    />
  );
}
