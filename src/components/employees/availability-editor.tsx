"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveAvailability } from "@/lib/actions/modules";
import { weekdayLabel } from "@/lib/dates";
import type { AvailabilityRow } from "@/types/database";

type DayState = {
  day: number;
  unavailable: boolean;
  start: string;
  end: string;
};

function initialDays(rows: AvailabilityRow[]): DayState[] {
  return [1, 2, 3, 4, 5, 6, 7].map((day) => {
    const row = rows.find((item) => item.day_of_week === day);
    return {
      day,
      unavailable: row?.is_unavailable ?? false,
      start: row?.start_time?.slice(0, 5) ?? "10:00",
      end: row?.end_time?.slice(0, 5) ?? "18:00",
    };
  });
}

export function AvailabilityEditor({ employeeId, rows }: { employeeId: string; rows: AvailabilityRow[] }) {
  const router = useRouter();
  const [days, setDays] = useState(() => initialDays(rows));
  const [pending, startTransition] = useTransition();

  function update(day: number, patch: Partial<DayState>) {
    setDays((current) => current.map((item) => (item.day === day ? { ...item, ...patch } : item)));
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await saveAvailability({ employeeId, rows: days });
          if (result.error) {
            toast.error(result.error);
            return;
          }
          toast.success(result.success);
          router.refresh();
        });
      }}
    >
      {days.map((day) => (
        <div key={day.day} className="grid gap-2 rounded-2xl bg-card px-4 py-3 shadow-sm ring-1 ring-foreground/10 sm:grid-cols-[8rem_auto_1fr_1fr] sm:items-center">
          <p className="text-sm font-medium">{weekdayLabel(day.day)}</p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={day.unavailable}
              onChange={(event) => update(day.day, { unavailable: event.target.checked })}
            />
            მიუწვდომელია
          </label>
          <Input type="time" value={day.start} disabled={day.unavailable} onChange={(event) => update(day.day, { start: event.target.value })} />
          <Input type="time" value={day.end} disabled={day.unavailable} onChange={(event) => update(day.day, { end: event.target.value })} />
        </div>
      ))}
      <Button type="submit" disabled={pending}>
        ხელმისაწვდომობის შენახვა
      </Button>
    </form>
  );
}
