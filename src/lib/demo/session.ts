import { cookies } from "next/headers";
import { DEMO_COOKIE, createDemoToken, isDemoEnabled, isDemoToken } from "@/lib/demo/token";

export async function isDemoSession() {
  if (!isDemoEnabled()) {
    return false;
  }

  const cookieStore = await cookies();
  return isDemoToken(cookieStore.get(DEMO_COOKIE)?.value);
}

export async function setDemoSession() {
  const token = createDemoToken();
  if (!token) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set(DEMO_COOKIE, token, {
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
