import { EmptyState } from "@/components/empty-state";
import { SwapBoard, TimeOffBoard, VacationBoard } from "@/components/requests/request-boards";
import { requireSession } from "@/lib/auth/context";
import { getEmployeeByProfile, listEmployees } from "@/lib/data/employees";
import { getSwapRequests, getTimeOffRequests, getUpcomingShifts, getVacationRequests } from "@/lib/data/modules";
import { redirect } from "next/navigation";

export const metadata = { title: "ჩემი მოთხოვნები" };

export default async function RequestsPage() {
  const context = await requireSession();
  if (context.profile.role === "admin") {
    redirect("/time-off");
  }

  const employeeId = await getEmployeeByProfile(context.userId);
  if (!employeeId) {
    return <EmptyState title="თანამშრომლის ბარათი არ არის მიბმული" description="მოთხოვნის გასაგზავნად ანგარიში თანამშრომელს უნდა დაუკავშირდეს." />;
  }

  const [timeOff, vacations, swaps, shifts, people] = await Promise.all([
    getTimeOffRequests(),
    getVacationRequests(),
    getSwapRequests(),
    getUpcomingShifts(),
    listEmployees({ status: "active" }),
  ]);

  return (
    <div className="space-y-10">
      <TimeOffBoard
        requests={timeOff.requests.filter((item) => item.employee_id === employeeId)}
        employees={[]}
        lockedEmployeeId={employeeId}
        error={timeOff.error}
      />
      <VacationBoard
        requests={vacations.requests.filter((item) => item.employee_id === employeeId)}
        employees={[]}
        lockedEmployeeId={employeeId}
        error={vacations.error}
      />
      <SwapBoard
        requests={swaps.requests.filter(
          (item) => item.requester_employee_id === employeeId || item.target_employee_id === employeeId,
        )}
        shifts={shifts.shifts.filter((shift) => shift.employee_id === employeeId)}
        employees={people.employees.filter((employee) => employee.id !== employeeId)}
        isAdmin={false}
        error={swaps.error}
      />
    </div>
  );
}
