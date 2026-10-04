"use server";

import { redirect } from "next/navigation";
import { clearDemoSession, setDemoSession } from "@/lib/demo/session";
import { demoCredentials, isDemoEnabled, passwordMatches } from "@/lib/demo/token";
import { mapAuthError, supabaseNotConfiguredMessage } from "@/lib/auth/errors";
import { getSiteUrl } from "@/lib/site";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/auth";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  type ForgotPasswordValues,
  type LoginValues,
  type ResetPasswordValues,
} from "@/lib/validation/auth";

export async function signIn(input: LoginValues): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "შეამოწმეთ შეყვანილი მონაცემები." };
  }

  if (!isSupabaseConfigured()) {
    const credentials = demoCredentials();
    if (
      isDemoEnabled() &&
      credentials &&
      parsed.data.email.trim().toLowerCase() === credentials.email &&
      passwordMatches(parsed.data.password, credentials.password)
    ) {
      await setDemoSession();
      redirect("/");
    }

    return { error: credentials ? "ელფოსტა ან პაროლი არასწორია." : supabaseNotConfiguredMessage };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    console.error("signIn failed", error.code);
    return { error: mapAuthError(error) };
  }

  redirect("/");
}

export async function signOut() {
  await clearDemoSession();

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("signOut failed", error.code);
    }
  }

  redirect("/login");
}

export async function requestPasswordReset(input: ForgotPasswordValues): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "შეამოწმეთ შეყვანილი მონაცემები." };
  }

  if (!isSupabaseConfigured()) {
    return { error: supabaseNotConfiguredMessage };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
  });

  if (error) {
    console.error("requestPasswordReset failed", error.code);
    return { error: mapAuthError(error) };
  }

  return {
    success: "თუ ანგარიში არსებობს, აღდგენის ბმული გაიგზავნა ელფოსტაზე.",
  };
}

export async function updatePassword(input: ResetPasswordValues): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "შეამოწმეთ შეყვანილი მონაცემები." };
  }

  if (!isSupabaseConfigured()) {
    return { error: supabaseNotConfiguredMessage };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "აღდგენის ბმული არასწორია ან ვადაგასულია." };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    console.error("updatePassword failed", error.code);
    return { error: mapAuthError(error) };
  }

  redirect("/login?reset=1");
}
