import { isDemoSession } from "@/lib/demo/session";
import { demoListDepartments, demoListPositions } from "@/lib/demo/store";
import { userFacingError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { Department, Position } from "@/types/database";

export async function listDepartments() {
  if (await isDemoSession()) {
    return demoListDepartments();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("departments")
    .select("id, name, color_token, sort_order")
    .order("sort_order")
    .order("name");

  if (error) {
    return { departments: [] as Department[], error: userFacingError(error) };
  }

  return { departments: (data ?? []) as Department[], error: null };
}

export async function listPositions() {
  if (await isDemoSession()) {
    return demoListPositions();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("positions")
    .select("id, department_id, name, sort_order")
    .order("sort_order")
    .order("name");

  if (error) {
    return { positions: [] as Position[], error: userFacingError(error) };
  }

  return { positions: (data ?? []) as Position[], error: null };
}
