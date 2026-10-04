import { cache } from "react";
import { redirect } from "next/navigation";
import { isDemoSession } from "@/lib/demo/session";
import { demoUnreadCount } from "@/lib/demo/operations";
import { demoRestaurantName } from "@/lib/demo/store";
import { demoCredentials, DEMO_RESTAURANT_ID, DEMO_USER_ID } from "@/lib/demo/token";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/auth";

export type SessionContext = {
  userId: string;
  email: string;
  profile: {
    id: string;
    restaurant_id: string;
    role: AppRole;
    full_name: string;
  };
  restaurantName: string;
  timezone: string;
  unreadCount: number;
};

export const getSessionContext = cache(async (): Promise<SessionContext | null> => {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  if (await isDemoSession()) {
    const credentials = demoCredentials();
    return {
      userId: DEMO_USER_ID,
      email: credentials?.email ?? user.email ?? "",
      profile: {
        id: DEMO_USER_ID,
        restaurant_id: DEMO_RESTAURANT_ID,
        role: "admin" as const,
        full_name: credentials?.name ?? "მერაბ თამოევი",
      },
      restaurantName: demoRestaurantName(),
      timezone: "Asia/Tbilisi",
      unreadCount: demoUnreadCount(),
    };
  }

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, restaurant_id, role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("profile lookup failed", error.code);
  }

  if (error || !profile?.restaurant_id || (profile.role !== "admin" && profile.role !== "employee")) {
    return {
      userId: user.id,
      email: user.email ?? "",
      profile: {
        id: user.id,
        restaurant_id: "",
        role: profile?.role === "admin" ? "admin" : "employee",
        full_name: profile?.full_name ?? "",
      },
      restaurantName: "პერსონალი",
      timezone: "Asia/Tbilisi",
      unreadCount: 0,
    };
  }

  const [{ data: settings }, { count }] = await Promise.all([
    supabase
      .from("restaurant_settings")
      .select("display_name, timezone")
      .eq("restaurant_id", profile.restaurant_id)
      .maybeSingle(),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("is_read", false),
  ]);

  return {
    userId: user.id,
    email: user.email ?? "",
    profile: {
      id: profile.id,
      restaurant_id: profile.restaurant_id,
      role: profile.role,
      full_name: profile.full_name ?? "",
    },
    restaurantName: settings?.display_name || "პერსონალი",
    timezone: settings?.timezone || "Asia/Tbilisi",
    unreadCount: count ?? 0,
  };
});

export async function requireSession() {
  const context = await getSessionContext();
  if (!context) {
    redirect("/login");
  }
  return context;
}

export async function requireAdmin() {
  const context = await requireSession();
  if (!context.profile.restaurant_id || context.profile.role !== "admin") {
    redirect("/");
  }
  return context;
}
