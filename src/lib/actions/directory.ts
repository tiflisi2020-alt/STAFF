"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/context";
import { isDemoSession } from "@/lib/demo/session";
import {
  demoDeleteDepartment,
  demoDeletePosition,
  demoSaveDepartment,
  demoSavePosition,
  demoSaveRestaurantName,
} from "@/lib/demo/store";
import { userFacingError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import {
  departmentSchema,
  positionSchema,
  restaurantSettingsSchema,
  type DepartmentValues,
  type PositionValues,
  type RestaurantSettingsValues,
} from "@/lib/validation/directory";
import type { ActionResult } from "@/types/auth";

const colorTokens = ["kitchen", "hall", "bar", "office", "neutral"];

export async function saveDepartment(input: DepartmentValues): Promise<ActionResult> {
  const parsed = departmentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "შეამოწმეთ შეყვანილი მონაცემები." };
  }

  await requireAdmin();
  if (await isDemoSession()) {
    const result = demoSaveDepartment(parsed.data);
    if (!result.error) {
      revalidatePath("/settings");
      revalidatePath("/employees");
    }
    return result;
  }

  const context = await requireAdmin();
  const supabase = await createClient();

  if (parsed.data.id) {
    const { error } = await supabase.from("departments").update({ name: parsed.data.name }).eq("id", parsed.data.id);
    if (error) {
      return { error: userFacingError(error) };
    }
  } else {
    const { count } = await supabase.from("departments").select("id", { count: "exact", head: true });
    const { error } = await supabase.from("departments").insert({
      restaurant_id: context.profile.restaurant_id,
      name: parsed.data.name,
      color_token: colorTokens[(count ?? 0) % colorTokens.length],
      sort_order: (count ?? 0) + 1,
    });
    if (error) {
      return { error: userFacingError(error) };
    }
  }

  revalidatePath("/settings");
  revalidatePath("/employees");
  return { success: parsed.data.id ? "განყოფილება განახლდა." : "განყოფილება დაემატა." };
}

export async function deleteDepartment(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (await isDemoSession()) {
    const result = demoDeleteDepartment(id);
    if (!result.error) {
      revalidatePath("/settings");
      revalidatePath("/employees");
    }
    return result;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("departments").delete().eq("id", id);
  if (error) {
    return { error: userFacingError(error) };
  }
  revalidatePath("/settings");
  revalidatePath("/employees");
  return { success: "განყოფილება წაიშალა." };
}

export async function savePosition(input: PositionValues): Promise<ActionResult> {
  const parsed = positionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "შეამოწმეთ შეყვანილი მონაცემები." };
  }

  const context = await requireAdmin();
  if (await isDemoSession()) {
    const result = demoSavePosition(parsed.data);
    if (!result.error) {
      revalidatePath("/settings");
      revalidatePath("/employees");
    }
    return result;
  }

  const supabase = await createClient();
  const payload = {
    restaurant_id: context.profile.restaurant_id,
    department_id: parsed.data.departmentId,
    name: parsed.data.name,
  };

  const result = parsed.data.id
    ? await supabase.from("positions").update(payload).eq("id", parsed.data.id)
    : await supabase.from("positions").insert({ ...payload, sort_order: 0 });

  if (result.error) {
    return { error: userFacingError(result.error) };
  }

  revalidatePath("/settings");
  revalidatePath("/employees");
  return { success: parsed.data.id ? "პოზიცია განახლდა." : "პოზიცია დაემატა." };
}

export async function deletePosition(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (await isDemoSession()) {
    const result = demoDeletePosition(id);
    if (!result.error) {
      revalidatePath("/settings");
      revalidatePath("/employees");
    }
    return result;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("positions").delete().eq("id", id);
  if (error) {
    return { error: userFacingError(error) };
  }
  revalidatePath("/settings");
  revalidatePath("/employees");
  return { success: "პოზიცია წაიშალა." };
}

export async function saveRestaurantName(input: RestaurantSettingsValues): Promise<ActionResult> {
  const parsed = restaurantSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "შეამოწმეთ შეყვანილი მონაცემები." };
  }

  const context = await requireAdmin();
  if (await isDemoSession()) {
    const result = demoSaveRestaurantName(parsed.data.displayName);
    if (!result.error) {
      revalidatePath("/settings");
    }
    return result;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("restaurant_settings")
    .update({ display_name: parsed.data.displayName })
    .eq("restaurant_id", context.profile.restaurant_id);

  if (error) {
    return { error: userFacingError(error) };
  }

  revalidatePath("/settings");
  return { success: "სახელი განახლდა." };
}
