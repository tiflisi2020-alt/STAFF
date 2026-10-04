import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ახალი პაროლი",
};

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();

  return (
    <AuthShell
      title="ახალი პაროლი"
      description="აირჩიეთ ახალი პაროლი თქვენი ანგარიშისთვის."
    >
      {user ? (
        <ResetPasswordForm />
      ) : (
        <div className="space-y-4">
          <p className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm leading-6 text-destructive" role="alert">
            აღდგენის ბმული არასწორია ან ვადაგასულია.
          </p>
          <Link href="/forgot-password" className="text-sm text-primary underline-offset-4 hover:underline">
            ახალი ბმულის მოთხოვნა
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
