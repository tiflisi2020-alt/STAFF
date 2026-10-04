import type { User } from "@supabase/supabase-js";
import { isDemoSession } from "@/lib/demo/session";
import { demoCredentials, DEMO_USER_ID } from "@/lib/demo/token";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  if (await isDemoSession()) {
    const credentials = demoCredentials();
    return {
      id: DEMO_USER_ID,
      email: credentials?.email ?? "",
    } as User;
  }

  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return data.user;
}
