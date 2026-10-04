import { VacationBoard } from "@/components/requests/request-boards";
import { requireAdmin } from "@/lib/auth/context";
import { listEmployees } from "@/lib/data/employees";
import { getVacationRequests } from "@/lib/data/modules";

export const metadata = { title: "შვებულებები" };

export default async function VacationsPage() {
  await requireAdmin();
  const [requests, people] = await Promise.all([getVacationRequests(), listEmployees({})]);
  return (
    <VacationBoard
      requests={requests.requests}
      employees={people.employees.filter((employee) => employee.is_active)}
      error={requests.error || people.error}
    />
  );
}
