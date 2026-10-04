import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "შესვლა",
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string; reset?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const passwordUpdated = params.reset === "1";
  const authFailed = params.error === "auth";

  return (
    <AuthShell
      title="შესვლა"
      description="შედით ანგარიშით, რომ ნახოთ გრაფიკი და მოთხოვნები."
    >
      <LoginForm
        initialMessage={
          passwordUpdated
            ? "პაროლი განახლდა. შედით სისტემაში."
            : authFailed
              ? "შესვლა ვერ დასრულდა. სცადეთ ხელახლა."
              : undefined
        }
        initialTone={passwordUpdated ? "success" : "error"}
      />
    </AuthShell>
  );
}
