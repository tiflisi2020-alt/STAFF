import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = {
  title: "პაროლის აღდგენა",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="პაროლის აღდგენა"
      description="მიუთითეთ ელფოსტა და გამოგიგზავნით ბმულს ახალი პაროლის დასაყენებლად."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
