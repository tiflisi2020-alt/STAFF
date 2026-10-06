import type { User } from "@supabase/supabase-js";
import { currentDemoAccount, isDemoSession } from "@/lib/demo/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  if (await isDemoSession()) {
    const account = await currentDemoAccount();
    return {
      id: account?.userId ?? "",
      email: account?.email ?? "",
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
