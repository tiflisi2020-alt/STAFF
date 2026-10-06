import { createHmac, timingSafeEqual } from "node:crypto";

export const DEMO_COOKIE = "staff_demo";
export const DEMO_USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
export const DEMO_RESTAURANT_ID = "11111111-1111-4111-8111-111111111111";

export type DemoAccount = {
  email: string;
  password: string;
  name: string;
  role: "admin" | "employee";
  userId: string;
  employeeId: string | null;
};

const STAFF_ACCOUNTS: DemoAccount[] = [
  {
    email: "nino@example.com",
    password: "NinoShift1",
    name: "ნინო გიორგაძე",
    role: "employee",
    userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
    employeeId: "44444444-4444-4444-8444-444444444401",
  },
  {
    email: "giorgi@example.com",
    password: "GiorgiShift1",
    name: "გიორგი ბერიძე",
    role: "employee",
    userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
    employeeId: "44444444-4444-4444-8444-444444444402",
  },
];

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

export function demoAccounts(): DemoAccount[] {
  const admin = demoCredentials();
  if (!admin) {
    return [];
  }
  return [
    {
      email: admin.email,
      password: admin.password,
      name: admin.name,
      role: "admin",
      userId: DEMO_USER_ID,
      employeeId: null,
    },
    ...STAFF_ACCOUNTS,
  ];
}

export function demoStaffLogins() {
  return STAFF_ACCOUNTS.map(({ name, email, password }) => ({ name, email, password }));
}

export function findDemoAccount(email: string) {
  return demoAccounts().find((account) => account.email === email.trim().toLowerCase()) ?? null;
}

export function createDemoToken(email?: string) {
  const credentials = demoCredentials();
  const account = findDemoAccount(email ?? credentials?.email ?? "");
  if (!credentials || !account) {
    return null;
  }
  return createHmac("sha256", credentials.password).update(account.email).digest("hex");
}

export function accountFromDemoToken(value: string | undefined): DemoAccount | null {
  const credentials = demoCredentials();
  if (!credentials || !value) {
    return null;
  }

  if (!value.includes("|")) {
    const admin = findDemoAccount(credentials.email);
    const expected = createDemoToken(credentials.email);
    if (!admin || !expected || expected.length !== value.length) {
      return null;
    }
    return timingSafeEqual(Buffer.from(expected), Buffer.from(value)) ? admin : null;
  }

  const separator = value.lastIndexOf("|");
  const email = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  const account = findDemoAccount(email);
  const expected = createDemoToken(email);
  if (!account || !expected || expected.length !== signature.length) {
    return null;
  }
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature)) ? account : null;
}

export function isDemoToken(value: string | undefined) {
  return accountFromDemoToken(value) !== null;
}

export function passwordMatches(input: string, expected: string) {
  if (input.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(input), Buffer.from(expected));
}
