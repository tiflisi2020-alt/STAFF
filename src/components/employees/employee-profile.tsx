import { eachDate, formatGeorgianDate, isoWeekday, weekdayLabel } from "@/lib/dates";
import { formatShiftHours } from "@/lib/format";
import type { ProfileSchedule } from "@/lib/data/employee-profile";
import type { Employee } from "@/types/database";
import { AvailabilityEditor } from "@/components/employees/availability-editor";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";

const attendanceLabels = [
  ["present", "დასწრებული"],
  ["late", "დაგვიანებული"],
  ["absent", "არ გამოცხადდა"],
  ["day_off", "დასვენება"],
  ["vacation", "შვებულება"],
] as const;

export function EmployeeProfile({
  employee,
  schedule,
}: {
  employee: Employee;
  schedule: ProfileSchedule;
}) {
  const days = eachDate(schedule.weekStart, schedule.weekEnd);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-foreground/10">
        <p className="text-sm text-muted-foreground">{employee.position?.name ?? "პოზიცია არ არის"}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {employee.first_name} {employee.last_name}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{employee.department?.name ?? "განყოფილება არ არის"}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusBadge status={employee.is_active ? "active" : "inactive"} />
        </div>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">ტელეფონი</dt>
            <dd>{employee.phone || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">ელფოსტა</dt>
            <dd>{employee.email || "—"}</dd>
          </div>
          {employee.notes ? (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">შენიშვნა</dt>
              <dd className="leading-6">{employee.notes}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {schedule.error ? <p className="text-sm text-destructive">{schedule.error}</p> : null}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">ამ კვირის გრაფიკი</h2>
        <div className="grid gap-2">
          {days.map((date) => {
            const dayShifts = schedule.shifts.filter((shift) => shift.shift_date === date && shift.status !== "cancelled");
            return (
              <div key={date} className="flex flex-col gap-1 rounded-2xl bg-card px-4 py-3 shadow-sm ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-medium">
                  {weekdayLabel(isoWeekday(date))}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">{formatGeorgianDate(date)}</span>
                </p>
                <div className="text-sm leading-6">
                  {dayShifts.length === 0
                    ? "ცვლა არ არის"
                    : dayShifts.map((shift) => (
                        <p key={shift.id}>
                          {formatShiftHours(shift.start_time, shift.end_time)}
                          {shift.position?.name ? ` · ${shift.position.name}` : ""}
                        </p>
                      ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">სამუშაო ხელმისაწვდომობა</h2>
        <AvailabilityEditor employeeId={employee.id} rows={schedule.availability} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">მომავალი დასვენება</h2>
        {schedule.timeOff.length === 0 && schedule.vacations.length === 0 ? (
          <EmptyState title="დაგეგმილი დასვენება არ არის" />
        ) : (
          <div className="space-y-2">
            {schedule.timeOff.map((request) => (
              <div key={request.id} className="flex items-center justify-between rounded-2xl bg-card px-4 py-3 text-sm ring-1 ring-foreground/10">
                <span>დასვენების დღე · {formatGeorgianDate(request.request_date)}</span>
                <StatusBadge status={request.status} />
              </div>
            ))}
            {schedule.vacations.map((request) => (
              <div key={request.id} className="flex items-center justify-between rounded-2xl bg-card px-4 py-3 text-sm ring-1 ring-foreground/10">
                <span>
                  შვებულება · {formatGeorgianDate(request.start_date)} – {formatGeorgianDate(request.end_date)}
                </span>
                <StatusBadge status={request.status} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">დასწრება ამ თვეში</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {attendanceLabels.map(([key, label]) => (
            <article key={key} className="rounded-2xl bg-card px-4 py-3 shadow-sm ring-1 ring-foreground/10">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-semibold">{schedule.attendance[key]}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
