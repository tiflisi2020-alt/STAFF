import { demoGetEmployee, demoListEmployees } from "@/lib/demo/store";
import { isDemoSession } from "@/lib/demo/session";
import { one, searchTerm } from "@/lib/data/relations";
import { userFacingError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { Employee } from "@/types/database";

const employeeSelect = `
  id, profile_id, first_name, last_name, phone, email, avatar_url,
  department_id, position_id, is_active, notes,
  department:departments(id, name, color_token),
  position:positions(id, name)
`;

type EmployeeQuery = {
  q?: string;
  departmentId?: string;
  positionId?: string;
  status?: string;
};

function mapEmployee(row: Record<string, unknown>): Employee {
  return {
    id: String(row.id),
    profile_id: (row.profile_id as string | null) ?? null,
    first_name: String(row.first_name),
    last_name: String(row.last_name),
    phone: (row.phone as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    avatar_url: (row.avatar_url as string | null) ?? null,
    department_id: (row.department_id as string | null) ?? null,
    position_id: (row.position_id as string | null) ?? null,
    is_active: Boolean(row.is_active),
    notes: (row.notes as string | null) ?? null,
    department: one(row.department as Employee["department"] | Employee["department"][]),
    position: one(row.position as Employee["position"] | Employee["position"][]),
  };
}

export async function listEmployees(filters: EmployeeQuery) {
  if (await isDemoSession()) {
    return demoListEmployees(filters);
  }

  const supabase = await createClient();
  let query = supabase.from("employees").select(employeeSelect).order("first_name").order("last_name");

  if (filters.departmentId) {
    query = query.eq("department_id", filters.departmentId);
  }
  if (filters.positionId) {
    query = query.eq("position_id", filters.positionId);
  }
  if (filters.status === "active") {
    query = query.eq("is_active", true);
  }
  if (filters.status === "inactive") {
    query = query.eq("is_active", false);
  }

  const term = searchTerm(filters.q ?? "");
  if (term) {
    query = query.or(
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`,
    );
  }

  const { data, error } = await query;
  if (error) {
    return { employees: [] as Employee[], error: userFacingError(error) };
  }

  return {
    employees: ((data ?? []) as Record<string, unknown>[]).map(mapEmployee),
    error: null,
  };
}

export async function getEmployee(id: string) {
  if (await isDemoSession()) {
    return demoGetEmployee(id);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("employees").select(employeeSelect).eq("id", id).maybeSingle();

  if (error) {
    return { employee: null, error: userFacingError(error) };
  }

  return {
    employee: data ? mapEmployee(data as Record<string, unknown>) : null,
    error: null,
  };
}

export async function getEmployeeByProfile(profileId: string) {
  if (await isDemoSession()) {
    return null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    console.error("employee profile lookup failed", error.code);
    return null;
  }

  return data?.id ?? null;
}
