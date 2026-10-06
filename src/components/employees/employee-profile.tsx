import { eachDate, formatGeorgianDate, isoWeekday, weekdayLabel } from "@/lib/dates";
import { formatShiftHours, initials } from "@/lib/format";
import type { ProfileSchedule } from "@/lib/data/employee-profile";
import type { Employee } from "@/types/database";
import { AvailabilityEditor } from "@/components/employees/availability-editor";
import { ProfileTabs } from "@/components/employees/profile-tabs";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
      <section className="surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar className="size-16" size="lg">
            {employee.avatar_url ? <AvatarImage src={employee.avatar_url} alt="" /> : null}
            <AvatarFallback className="text-lg">{initials(employee.first_name, employee.last_name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight">
              {employee.first_name} {employee.last_name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {employee.position?.name ?? "პოზიცია არ არის"} · {employee.department?.name ?? "განყოფილება არ არის"}
            </p>
            <div className="mt-3">
              <StatusBadge status={employee.is_active ? "active" : "inactive"} />
            </div>
          </div>
        </div>
      </section>

      {schedule.error ? <p className="text-sm text-destructive">{schedule.error}</p> : null}

      <ProfileTabs
        overview={
          <dl className="surface grid gap-4 p-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">ტელეფონი</dt>
              <dd className="mt-1 font-medium">{employee.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">ელფოსტა</dt>
              <dd className="mt-1 font-medium">{employee.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">პოზიცია</dt>
              <dd className="mt-1 font-medium">{employee.position?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">განყოფილება</dt>
              <dd className="mt-1 font-medium">{employee.department?.name ?? "—"}</dd>
            </div>
            {employee.notes ? (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">შენიშვნა</dt>
                <dd className="mt-1 leading-6">{employee.notes}</dd>
              </div>
            ) : null}
          </dl>
        }
        schedule={
          <div className="surface divide-y divide-border/80 overflow-hidden">
            {days.map((date) => {
              const dayShifts = schedule.shifts.filter((shift) => shift.shift_date === date && shift.status !== "cancelled");
              return (
                <div key={date} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
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
        }
        availability={<AvailabilityEditor employeeId={employee.id} rows={schedule.availability} />}
        attendance={
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {attendanceLabels.map(([key, label]) => (
              <article key={key} className="surface px-4 py-3">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-semibold">{schedule.attendance[key]}</p>
              </article>
            ))}
          </div>
        }
        requests={
          schedule.timeOff.length === 0 && schedule.vacations.length === 0 ? (
            <EmptyState title="დაგეგმილი დასვენება არ არის" description="დასვენების დღე და შვებულება აქ გამოჩნდება." />
          ) : (
            <div className="surface divide-y divide-border/80 overflow-hidden">
              {schedule.timeOff.map((request) => (
                <div key={request.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span>დასვენების დღე · {formatGeorgianDate(request.request_date)}</span>
                  <StatusBadge status={request.status} />
                </div>
              ))}
              {schedule.vacations.map((request) => (
                <div key={request.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span>
                    შვებულება · {formatGeorgianDate(request.start_date)} – {formatGeorgianDate(request.end_date)}
                  </span>
                  <StatusBadge status={request.status} />
                </div>
              ))}
            </div>
          )
        }
      />
    </div>
  );
}
