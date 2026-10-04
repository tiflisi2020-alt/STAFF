"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, requireSession } from "@/lib/auth/context";
import { isDemoSession } from "@/lib/demo/session";
import {
  demoCopyPreviousWeek,
  demoCreateSwap,
  demoCreateTimeOff,
  demoCreateVacation,
  demoDeleteShift,
  demoMarkNotificationsRead,
  demoMoveShift,
  demoPublishWeek,
  demoRespondSwap,
  demoReviewSwap,
  demoReviewTimeOff,
  demoReviewVacation,
  demoSaveAttendance,
  demoSaveAvailability,
  demoSaveShift,
} from "@/lib/demo/operations";
import { addDays, formatGeorgianDate, weekRange } from "@/lib/dates";
import { userFacingError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { AttendanceStatus } from "@/types/database";

const timeField = z.string().regex(/^\d{2}:\d{2}$/, "დრო არასწორია.");
const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "თარიღი არასწორია.");

const shiftSchema = z
  .object({
    id: z.string().uuid().optional(),
    employeeId: z.string().uuid("აირჩიეთ თანამშრომელი."),
    departmentId: z.string().uuid("აირჩიეთ განყოფილება."),
    positionId: z.string().uuid("აირჩიეთ პოზიცია."),
    shiftDate: dateField,
    startTime: timeField,
    endTime: timeField,
    breakMinutes: z.number().int().min(0).max(720),
    notes: z.string().max(500).optional(),
  })
  .refine((value) => value.startTime !== value.endTime, {
    message: "დაწყება და დასრულება ერთი და იგივე ვერ იქნება.",
  });

export type ModuleResult = {
  error?: string;
  success?: string;
  warnings?: string[];
};

function refreshSchedule() {
  revalidatePath("/schedule");
  revalidatePath("/");
  revalidatePath("/notifications");
  revalidatePath("/employees", "layout");
}

async function notifyProfiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  restaurantId: string,
  title: string,
  body: string,
) {
  const { data } = await supabase.from("profiles").select("id").eq("restaurant_id", restaurantId);
  const rows = (data ?? []).map((profile) => ({
    restaurant_id: restaurantId,
    recipient_profile_id: profile.id,
    title,
    body,
  }));
  if (rows.length > 0) {
    await supabase.from("notifications").insert(rows);
  }
}

async function ensureWeek(supabase: Awaited<ReturnType<typeof createClient>>, restaurantId: string, weekStart: string) {
  const start = weekRange(weekStart).start;
  const existing = await supabase
    .from("schedule_weeks")
    .select("id, status")
    .eq("restaurant_id", restaurantId)
    .eq("week_start", start)
    .maybeSingle();
  if (existing.data) {
    return existing.data as { id: string; status: string };
  }
  const inserted = await supabase
    .from("schedule_weeks")
    .insert({ restaurant_id: restaurantId, week_start: start, status: "draft" })
    .select("id, status")
    .single();
  if (inserted.error || !inserted.data) {
    throw inserted.error ?? new Error("week");
  }
  return inserted.data as { id: string; status: string };
}

export async function saveShift(input: z.infer<typeof shiftSchema>): Promise<ModuleResult> {
  const parsed = shiftSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "შეამოწმეთ შეყვანილი მონაცემები." };
  }
  await requireAdmin();
  if (await isDemoSession()) {
    const result = demoSaveShift({ ...parsed.data, notes: parsed.data.notes?.trim() || null });
    if (!result.error) {
      refreshSchedule();
    }
    return result;
  }

  const context = await requireAdmin();
  try {
    const supabase = await createClient();
    const week = await ensureWeek(supabase, context.profile.restaurant_id, parsed.data.shiftDate);
    const payload = {
      restaurant_id: context.profile.restaurant_id,
      schedule_week_id: week.id,
      employee_id: parsed.data.employeeId,
      department_id: parsed.data.departmentId,
      position_id: parsed.data.positionId,
      shift_date: parsed.data.shiftDate,
      start_time: parsed.data.startTime,
      end_time: parsed.data.endTime,
      break_minutes: parsed.data.breakMinutes,
      notes: parsed.data.notes?.trim() || null,
    };
    const result = parsed.data.id
      ? await supabase.from("shifts").update(payload).eq("id", parsed.data.id)
      : await supabase.from("shifts").insert({ ...payload, status: "draft" });
    if (result.error) {
      return { error: userFacingError(result.error) };
    }
    refreshSchedule();
    return { success: parsed.data.id ? "ცვლა განახლდა." : "ცვლა დაემატა." };
  } catch (error) {
    return { error: userFacingError(error) };
  }
}

export async function deleteShift(id: string): Promise<ModuleResult> {
  await requireAdmin();
  if (await isDemoSession()) {
    const result = demoDeleteShift(id);
    if (!result.error) refreshSchedule();
    return result;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("shifts").delete().eq("id", id);
  if (error) return { error: userFacingError(error) };
  refreshSchedule();
  return { success: "ცვლა წაიშალა." };
}

export async function moveShift(id: string, employeeId: string, shiftDate: string): Promise<ModuleResult> {
  await requireAdmin();
  if (await isDemoSession()) {
    const result = demoMoveShift(id, employeeId, shiftDate);
    if (!result.error) refreshSchedule();
    return result;
  }
  const context = await requireAdmin();
  try {
    const supabase = await createClient();
    const week = await ensureWeek(supabase, context.profile.restaurant_id, shiftDate);
    const employee = await supabase.from("employees").select("department_id, position_id").eq("id", employeeId).maybeSingle();
    if (!employee.data?.department_id || !employee.data.position_id) {
      return { error: "ცვლის გადატანა ვერ მოხერხდა." };
    }
    const { error } = await supabase
      .from("shifts")
      .update({
        employee_id: employeeId,
        department_id: employee.data.department_id,
        position_id: employee.data.position_id,
        shift_date: shiftDate,
        schedule_week_id: week.id,
      })
      .eq("id", id);
    if (error) return { error: userFacingError(error) };
    refreshSchedule();
    return { success: "ცვლა გადავიდა." };
  } catch (error) {
    return { error: userFacingError(error) };
  }
}

export async function publishWeek(weekStart: string): Promise<ModuleResult> {
  const context = await requireAdmin();
  if (await isDemoSession()) {
    const result = demoPublishWeek(weekStart);
    if (!result.error) refreshSchedule();
    return result;
  }
  try {
    const supabase = await createClient();
    const week = await ensureWeek(supabase, context.profile.restaurant_id, weekStart);
    const published = await supabase
      .from("schedule_weeks")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", week.id);
    if (published.error) return { error: userFacingError(published.error) };
    await supabase.from("shifts").update({ status: "published" }).eq("schedule_week_id", week.id).eq("status", "draft");
    const range = weekRange(weekStart);
    await notifyProfiles(
      supabase,
      context.profile.restaurant_id,
      "გრაფიკი გამოქვეყნდა",
      `${formatGeorgianDate(range.start)}-დან კვირის გრაფიკი გამოქვეყნდა.`,
    );
    refreshSchedule();
    return { success: "კვირა გამოქვეყნდა." };
  } catch (error) {
    return { error: userFacingError(error) };
  }
}

export async function copyPreviousWeek(weekStart: string, mode: "merge" | "replace"): Promise<ModuleResult> {
  const context = await requireAdmin();
  if (await isDemoSession()) {
    const result = demoCopyPreviousWeek(weekStart, mode);
    if (!result.error) refreshSchedule();
    return result;
  }
  try {
    const supabase = await createClient();
    const range = weekRange(weekStart);
    const previousStart = addDays(range.start, -7);
    const previousEnd = addDays(previousStart, 6);
    const source = await supabase
      .from("shifts")
      .select("employee_id, department_id, position_id, shift_date, start_time, end_time, break_minutes, notes")
      .gte("shift_date", previousStart)
      .lte("shift_date", previousEnd)
      .neq("status", "cancelled");
    if (source.error) return { error: userFacingError(source.error) };
    if (!source.data?.length) return { error: "წინა კვირაში ცვლები არ არის." };
    const week = await ensureWeek(supabase, context.profile.restaurant_id, range.start);
    if (mode === "replace") {
      await supabase.from("shifts").delete().eq("schedule_week_id", week.id);
    }
    const rows = (source.data as Record<string, string | number | null>[]).map((shift) => ({
      restaurant_id: context.profile.restaurant_id,
      schedule_week_id: week.id,
      employee_id: shift.employee_id,
      department_id: shift.department_id,
      position_id: shift.position_id,
      shift_date: addDays(String(shift.shift_date), 7),
      start_time: shift.start_time,
      end_time: shift.end_time,
      break_minutes: shift.break_minutes,
      notes: shift.notes,
      status: "draft",
    }));
    const inserted = await supabase.from("shifts").insert(rows);
    if (inserted.error) return { error: userFacingError(inserted.error) };
    refreshSchedule();
    return { success: `დაკოპირდა ${rows.length} ცვლა.` };
  } catch (error) {
    return { error: userFacingError(error) };
  }
}

export async function createTimeOff(input: { employeeId: string; date: string; reason?: string }): Promise<ModuleResult> {
  const context = await requireSession();
  const parsed = z.object({ employeeId: z.string().uuid(), date: dateField, reason: z.string().max(300).optional() }).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "შეამოწმეთ შეყვანილი მონაცემები." };
  if (await isDemoSession()) {
    const result = demoCreateTimeOff({ ...parsed.data, reason: parsed.data.reason?.trim() || null });
    if (!result.error) {
      revalidatePath("/time-off");
      revalidatePath("/requests");
      revalidatePath("/");
    }
    return result;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("time_off_requests").insert({
    restaurant_id: context.profile.restaurant_id,
    employee_id: parsed.data.employeeId,
    request_date: parsed.data.date,
    reason: parsed.data.reason?.trim() || null,
    status: "pending",
  });
  if (error) return { error: userFacingError(error) };
  revalidatePath("/time-off");
  revalidatePath("/");
  return { success: "მოთხოვნა გაიგზავნა." };
}

export async function reviewTimeOff(id: string, status: "approved" | "rejected"): Promise<ModuleResult> {
  const context = await requireAdmin();
  if (await isDemoSession()) {
    const result = demoReviewTimeOff(id, status);
    if (!result.error) {
      revalidatePath("/time-off");
      revalidatePath("/");
      revalidatePath("/schedule");
    }
    return result;
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("time_off_requests")
    .update({ status, reviewed_by: context.userId, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending");
  if (error) return { error: userFacingError(error) };
  revalidatePath("/time-off");
  revalidatePath("/");
  return { success: status === "approved" ? "მოთხოვნა დადასტურდა." : "მოთხოვნა უარყოფილია." };
}

export async function createVacation(input: {
  employeeId: string;
  startDate: string;
  endDate: string;
  note?: string;
}): Promise<ModuleResult> {
  const context = await requireSession();
  const parsed = z
    .object({
      employeeId: z.string().uuid(),
      startDate: dateField,
      endDate: dateField,
      note: z.string().max(300).optional(),
    })
    .refine((value) => value.endDate >= value.startDate, { message: "დასრულება დაწყებაზე ადრე ვერ იქნება." })
    .safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "შეამოწმეთ შეყვანილი მონაცემები." };
  if (await isDemoSession()) {
    const result = demoCreateVacation({ ...parsed.data, note: parsed.data.note?.trim() || null });
    if (!result.error) {
      revalidatePath("/vacations");
      revalidatePath("/requests");
      revalidatePath("/");
    }
    return result;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("vacation_requests").insert({
    restaurant_id: context.profile.restaurant_id,
    employee_id: parsed.data.employeeId,
    start_date: parsed.data.startDate,
    end_date: parsed.data.endDate,
    note: parsed.data.note?.trim() || null,
    status: "pending",
  });
  if (error) return { error: userFacingError(error) };
  revalidatePath("/vacations");
  revalidatePath("/");
  return { success: "მოთხოვნა გაიგზავნა." };
}

export async function reviewVacation(id: string, status: "approved" | "rejected"): Promise<ModuleResult> {
  const context = await requireAdmin();
  if (await isDemoSession()) {
    const result = demoReviewVacation(id, status);
    if (!result.error) {
      revalidatePath("/vacations");
      revalidatePath("/");
      revalidatePath("/schedule");
    }
    return result;
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("vacation_requests")
    .update({ status, reviewed_by: context.userId, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending");
  if (error) return { error: userFacingError(error) };
  revalidatePath("/vacations");
  revalidatePath("/");
  return { success: status === "approved" ? "მოთხოვნა დადასტურდა." : "მოთხოვნა უარყოფილია." };
}

export async function createSwap(input: { shiftId: string; targetEmployeeId: string }): Promise<ModuleResult> {
  await requireSession();
  const parsed = z.object({ shiftId: z.string().uuid(), targetEmployeeId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { error: "აირჩიეთ ცვლა და მიმღები თანამშრომელი." };
  if (await isDemoSession()) {
    const result = demoCreateSwap(parsed.data);
    if (!result.error) {
      revalidatePath("/swaps");
      revalidatePath("/");
    }
    return result;
  }
  const context = await requireSession();
  const supabase = await createClient();
  const shift = await supabase.from("shifts").select("employee_id").eq("id", parsed.data.shiftId).maybeSingle();
  if (!shift.data || shift.data.employee_id === parsed.data.targetEmployeeId) {
    return { error: "ცვლა საკუთარ თავზე ვერ გადაეცემა." };
  }
  const { error } = await supabase.from("shift_swap_requests").insert({
    restaurant_id: context.profile.restaurant_id,
    shift_id: parsed.data.shiftId,
    requester_employee_id: shift.data.employee_id,
    target_employee_id: parsed.data.targetEmployeeId,
    status: "pending_peer",
  });
  if (error) return { error: userFacingError(error) };
  revalidatePath("/swaps");
  revalidatePath("/");
  return { success: "გაცვლის მოთხოვნა გაიგზავნა." };
}

export async function respondSwap(id: string, accept: boolean): Promise<ModuleResult> {
  await requireSession();
  if (await isDemoSession()) {
    const result = demoRespondSwap(id, accept);
    if (!result.error) revalidatePath("/swaps");
    return result;
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("shift_swap_requests")
    .update({ status: accept ? "pending_manager" : "peer_rejected", peer_responded_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending_peer");
  if (error) return { error: userFacingError(error) };
  revalidatePath("/swaps");
  return { success: accept ? "მიმღებმა დაადასტურა. ელოდება მენეჯერს." : "მიმღებმა უარი თქვა." };
}

export async function reviewSwap(id: string, approve: boolean): Promise<ModuleResult> {
  await requireAdmin();
  if (await isDemoSession()) {
    const result = demoReviewSwap(id, approve);
    if (!result.error) {
      revalidatePath("/swaps");
      revalidatePath("/schedule");
      revalidatePath("/");
    }
    return result;
  }
  const context = await requireAdmin();
  const supabase = await createClient();
  const swap = await supabase
    .from("shift_swap_requests")
    .select("id, shift_id, target_employee_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!swap.data || swap.data.status !== "pending_manager") {
    return { error: "მოთხოვნა ამ ეტაპზე აღარ არის." };
  }
  if (approve) {
    const target = await supabase.from("employees").select("department_id, position_id").eq("id", swap.data.target_employee_id).maybeSingle();
    if (!target.data?.department_id || !target.data.position_id) {
      return { error: "მიმღებს განყოფილება ან პოზიცია აკლია." };
    }
    const moved = await supabase
      .from("shifts")
      .update({
        employee_id: swap.data.target_employee_id,
        department_id: target.data.department_id,
        position_id: target.data.position_id,
      })
      .eq("id", swap.data.shift_id);
    if (moved.error) return { error: userFacingError(moved.error) };
  }
  const { error } = await supabase
    .from("shift_swap_requests")
    .update({
      status: approve ? "approved" : "rejected",
      reviewed_by: context.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: userFacingError(error) };
  revalidatePath("/swaps");
  revalidatePath("/schedule");
  return { success: approve ? "გაცვლა დადასტურდა და ცვლა გადავიდა." : "გაცვლა უარყოფილია." };
}

export async function saveAttendance(input: {
  employeeId: string;
  date: string;
  actualStart: string;
  actualEnd: string;
  status: AttendanceStatus;
  notes: string;
}): Promise<ModuleResult> {
  const context = await requireAdmin();
  const parsed = z
    .object({
      employeeId: z.string().uuid(),
      date: dateField,
      actualStart: z.string(),
      actualEnd: z.string(),
      status: z.enum(["present", "late", "absent", "day_off", "vacation"]),
      notes: z.string().max(300),
    })
    .safeParse(input);
  if (!parsed.success) return { error: "შეამოწმეთ დასწრების ველები." };
  const actualStart = parsed.data.actualStart || null;
  const actualEnd = parsed.data.actualEnd || null;
  if (await isDemoSession()) {
    const result = demoSaveAttendance({
      ...parsed.data,
      actualStart,
      actualEnd,
      notes: parsed.data.notes.trim() || null,
    });
    if (!result.error) revalidatePath("/attendance");
    return result;
  }
  const supabase = await createClient();
  const shift = await supabase
    .from("shifts")
    .select("id, start_time, end_time")
    .eq("employee_id", parsed.data.employeeId)
    .eq("shift_date", parsed.data.date)
    .neq("status", "cancelled")
    .maybeSingle();
  const existing = await supabase
    .from("attendance")
    .select("id")
    .eq("employee_id", parsed.data.employeeId)
    .eq("attendance_date", parsed.data.date)
    .maybeSingle();
  const payload = {
    restaurant_id: context.profile.restaurant_id,
    employee_id: parsed.data.employeeId,
    shift_id: shift.data?.id ?? null,
    attendance_date: parsed.data.date,
    scheduled_start: shift.data?.start_time ?? null,
    scheduled_end: shift.data?.end_time ?? null,
    actual_start: actualStart,
    actual_end: actualEnd,
    status: parsed.data.status,
    notes: parsed.data.notes.trim() || null,
  };
  const result = existing.data?.id
    ? await supabase.from("attendance").update(payload).eq("id", existing.data.id)
    : await supabase.from("attendance").insert(payload);
  if (result.error) return { error: userFacingError(result.error) };
  revalidatePath("/attendance");
  return { success: "დასწრება შეინახა." };
}

export async function markNotificationRead(id?: string): Promise<ModuleResult> {
  const context = await requireSession();
  if (await isDemoSession()) {
    const result = demoMarkNotificationsRead(id);
    revalidatePath("/notifications");
    revalidatePath("/", "layout");
    return result;
  }
  const supabase = await createClient();
  let query = supabase.from("notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("recipient_profile_id", context.userId);
  if (id) {
    query = query.eq("id", id);
  }
  const { error } = await query;
  if (error) return { error: userFacingError(error) };
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
  return { success: "შეტყობინება წაკითხულად მოინიშნა." };
}

const availabilitySchema = z.object({
  employeeId: z.string().uuid(),
  rows: z.array(
    z.object({
      day: z.number().int().min(1).max(7),
      unavailable: z.boolean(),
      start: timeField,
      end: timeField,
    }),
  ),
});

export async function saveAvailability(input: z.infer<typeof availabilitySchema>): Promise<ModuleResult> {
  const parsed = availabilitySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "შეამოწმეთ ხელმისაწვდომობა." };
  await requireSession();
  if (await isDemoSession()) {
    const result = demoSaveAvailability(parsed.data.employeeId, parsed.data.rows);
    if (!result.error) {
      revalidatePath(`/employees/${parsed.data.employeeId}`);
      revalidatePath("/profile");
      revalidatePath("/schedule");
    }
    return result;
  }
  const context = await requireSession();
  const supabase = await createClient();
  const removed = await supabase.from("employee_availability").delete().eq("employee_id", parsed.data.employeeId);
  if (removed.error) return { error: userFacingError(removed.error) };
  const rows = parsed.data.rows.map((row) => ({
    restaurant_id: context.profile.restaurant_id,
    employee_id: parsed.data.employeeId,
    day_of_week: row.day,
    is_unavailable: row.unavailable,
    start_time: row.unavailable ? null : row.start,
    end_time: row.unavailable ? null : row.end,
  }));
  if (rows.length > 0) {
    const inserted = await supabase.from("employee_availability").insert(rows);
    if (inserted.error) return { error: userFacingError(inserted.error) };
  }
  revalidatePath(`/employees/${parsed.data.employeeId}`);
  revalidatePath("/profile");
  return { success: "ხელმისაწვდომობა შეინახა." };
}
