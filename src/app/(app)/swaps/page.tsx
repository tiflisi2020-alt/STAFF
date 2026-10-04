import { SwapBoard } from "@/components/requests/request-boards";
import { requireAdmin } from "@/lib/auth/context";
import { listEmployees } from "@/lib/data/employees";
import { getSwapRequests, getUpcomingShifts } from "@/lib/data/modules";

export const metadata = { title: "ცვლის გაცვლა" };

export default async function SwapsPage() {
  await requireAdmin();
  const [requests, shifts, people] = await Promise.all([getSwapRequests(), getUpcomingShifts(), listEmployees({})]);
  return (
    <SwapBoard
      requests={requests.requests}
      shifts={shifts.shifts}
      employees={people.employees.filter((employee) => employee.is_active)}
      isAdmin
      error={requests.error || shifts.error || people.error}
    />
  );
}
