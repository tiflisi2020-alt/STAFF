import { TimeOffBoard } from "@/components/requests/request-boards";
import { requireAdmin } from "@/lib/auth/context";
import { listEmployees } from "@/lib/data/employees";
import { getTimeOffRequests } from "@/lib/data/modules";

export const metadata = { title: "დასვენების მოთხოვნები" };

export default async function TimeOffPage() {
  await requireAdmin();
  const [requests, people] = await Promise.all([getTimeOffRequests(), listEmployees({})]);
  return (
    <TimeOffBoard
      requests={requests.requests}
      employees={people.employees.filter((employee) => employee.is_active)}
      error={requests.error || people.error}
    />
  );
}
