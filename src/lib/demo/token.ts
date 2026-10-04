import { createHmac, timingSafeEqual } from "node:crypto";

export const DEMO_COOKIE = "staff_demo";
export const DEMO_USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
export const DEMO_RESTAURANT_ID = "11111111-1111-4111-8111-111111111111";

export function demoCredentials() {
  const email = process.env.DEMO_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.DEMO_ADMIN_PASSWORD;
  const name = process.env.DEMO_ADMIN_NAME?.trim() || "მერაბ თამოევი";

  if (!email || !password) {
    return null;
  }

  return { email, password, name };
}

export function isDemoEnabled() {
  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
  return !hasSupabase && demoCredentials() !== null;
}

export function createDemoToken() {
  const credentials = demoCredentials();
  if (!credentials) {
    return null;
  }

  return createHmac("sha256", credentials.password).update(credentials.email).digest("hex");
}

export function isDemoToken(value: string | undefined) {
  const expected = createDemoToken();
  if (!expected || !value || expected.length !== value.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expected), Buffer.from(value));
}

export function passwordMatches(input: string, expected: string) {
  if (input.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(input), Buffer.from(expected));
}
