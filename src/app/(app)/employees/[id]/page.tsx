import Link from "next/link";
import { notFound } from "next/navigation";
import { EmployeeProfile } from "@/components/employees/employee-profile";
import { requireAdmin } from "@/lib/auth/context";
import { getEmployeeSchedule } from "@/lib/data/employee-profile";
import { getEmployee } from "@/lib/data/employees";

type EmployeePageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: EmployeePageProps) {
  const { id } = await params;
  const { employee } = await getEmployee(id);
  return {
    title: employee ? `${employee.first_name} ${employee.last_name}` : "თანამშრომელი",
  };
}

export default async function EmployeePage({ params }: EmployeePageProps) {
  const context = await requireAdmin();
  const { id } = await params;
  const { employee, error } = await getEmployee(id);

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (!employee) {
    notFound();
  }

  const schedule = await getEmployeeSchedule(employee.id, context.timezone);

  return (
    <div className="space-y-4">
      <Link href="/employees" className="text-sm text-primary">
        უკან თანამშრომლებთან
      </Link>
      <EmployeeProfile employee={employee} schedule={schedule} />
    </div>
  );
}
