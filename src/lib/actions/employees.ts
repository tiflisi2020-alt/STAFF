"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/context";
import { isDemoSession } from "@/lib/demo/session";
import { demoSaveEmployee, demoSetEmployeeActive } from "@/lib/demo/store";
import { userFacingError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { employeeSchema, type EmployeeValues } from "@/lib/validation/employee";
import type { ActionResult } from "@/types/auth";

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function saveEmployee(input: EmployeeValues): Promise<ActionResult> {
  const parsed = employeeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "შეამოწმეთ შეყვანილი მონაცემები." };
  }

  const context = await requireAdmin();
  if (await isDemoSession()) {
    const result = demoSaveEmployee({
      id: parsed.data.id,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: emptyToNull(parsed.data.phone),
      email: emptyToNull(parsed.data.email),
      avatarUrl: emptyToNull(parsed.data.avatarUrl),
      departmentId: parsed.data.departmentId,
      positionId: parsed.data.positionId,
      isActive: parsed.data.isActive,
      notes: emptyToNull(parsed.data.notes),
    });
    if (!result.error) {
      revalidatePath("/employees");
      revalidatePath("/");
      if (parsed.data.id) {
        revalidatePath(`/employees/${parsed.data.id}`);
      }
    }
    return result;
  }

  const supabase = await createClient();
  const payload = {
    restaurant_id: context.profile.restaurant_id,
    first_name: parsed.data.firstName,
    last_name: parsed.data.lastName,
    phone: emptyToNull(parsed.data.phone),
    email: emptyToNull(parsed.data.email),
    avatar_url: emptyToNull(parsed.data.avatarUrl),
    department_id: parsed.data.departmentId,
    position_id: parsed.data.positionId,
    is_active: parsed.data.isActive,
    notes: emptyToNull(parsed.data.notes),
  };

  const result = parsed.data.id
    ? await supabase.from("employees").update(payload).eq("id", parsed.data.id)
    : await supabase.from("employees").insert(payload);

  if (result.error) {
    return { error: userFacingError(result.error) };
  }

  revalidatePath("/employees");
  revalidatePath("/");
  if (parsed.data.id) {
    revalidatePath(`/employees/${parsed.data.id}`);
  }
  return { success: parsed.data.id ? "თანამშრომელი განახლდა." : "თანამშრომელი დაემატა." };
}

export async function setEmployeeActive(id: string, isActive: boolean): Promise<ActionResult> {
  await requireAdmin();
  if (await isDemoSession()) {
    const result = demoSetEmployeeActive(id, isActive);
    if (!result.error) {
      revalidatePath("/employees");
      revalidatePath(`/employees/${id}`);
      revalidatePath("/");
    }
    return result;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("employees").update({ is_active: isActive }).eq("id", id);

  if (error) {
    return { error: userFacingError(error) };
  }

  revalidatePath("/employees");
  revalidatePath(`/employees/${id}`);
  revalidatePath("/");
  return { success: isActive ? "თანამშრომელი გააქტიურდა." : "თანამშრომელი გაითიშა." };
}
