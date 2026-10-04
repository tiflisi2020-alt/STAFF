import { EmployeeProfile } from "@/components/employees/employee-profile";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireSession } from "@/lib/auth/context";
import { getEmployeeSchedule } from "@/lib/data/employee-profile";
import { getEmployee, getEmployeeByProfile } from "@/lib/data/employees";

export const metadata = {
  title: "ჩემი პროფილი",
};

export default async function ProfilePage() {
  const context = await requireSession();
  const employeeId = await getEmployeeByProfile(context.userId);

  if (!employeeId) {
    return (
      <div className="space-y-6">
        <PageHeader title="ჩემი პროფილი" description={context.email} />
        <EmptyState
          title="თანამშრომლის ბარათი არ არის მიბმული"
          description="ანგარიში არსებობს, მაგრამ ის ჯერ არ უკავშირდება თანამშრომლის ჩანაწერს."
        />
      </div>
    );
  }

  const { employee, error } = await getEmployee(employeeId);
  if (error || !employee) {
    return <p className="text-sm text-destructive">{error ?? "პროფილი ვერ ჩაიტვირთა."}</p>;
  }

  const schedule = await getEmployeeSchedule(employee.id, context.timezone);
  return <EmployeeProfile employee={employee} schedule={schedule} />;
}
