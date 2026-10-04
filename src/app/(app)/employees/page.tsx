import { EmployeesManager } from "@/components/employees/employees-manager";
import { requireAdmin } from "@/lib/auth/context";
import { listDepartments, listPositions } from "@/lib/data/directory";
import { listEmployees } from "@/lib/data/employees";

export const metadata = {
  title: "თანამშრომლები",
};

type EmployeesPageProps = {
  searchParams: Promise<{ q?: string; department?: string; position?: string; status?: string }>;
};

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  await requireAdmin();
  const params = await searchParams;
  const filters = {
    q: params.q ?? "",
    departmentId: params.department ?? "",
    positionId: params.position ?? "",
    status: params.status ?? "",
  };

  const [employeesResult, departmentsResult, positionsResult] = await Promise.all([
    listEmployees(filters),
    listDepartments(),
    listPositions(),
  ]);

  return (
    <EmployeesManager
      employees={employeesResult.employees}
      departments={departmentsResult.departments}
      positions={positionsResult.positions}
      filters={filters}
      error={employeesResult.error || departmentsResult.error || positionsResult.error}
    />
  );
}
