import { cookies } from "next/headers";
import { DEMO_COOKIE, accountFromDemoToken, createDemoToken, demoCredentials, isDemoEnabled, isDemoToken } from "@/lib/demo/token";

export async function isDemoSession() {
  if (!isDemoEnabled()) {
    return false;
  }

  const cookieStore = await cookies();
  return isDemoToken(cookieStore.get(DEMO_COOKIE)?.value);
}

export async function currentDemoAccount() {
  if (!isDemoEnabled()) {
    return null;
  }
  const cookieStore = await cookies();
  return accountFromDemoToken(cookieStore.get(DEMO_COOKIE)?.value);
}

export async function setDemoSession(email?: string) {
  const token = createDemoToken(email ?? demoCredentials()?.email);
  if (!token) {
    return;
  }
  const accountEmail = email ?? demoCredentials()?.email ?? "";

  const cookieStore = await cookies();
  cookieStore.set(DEMO_COOKIE, `${accountEmail}|${token}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearDemoSession() {
  const cookieStore = await cookies();
  cookieStore.set(DEMO_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
