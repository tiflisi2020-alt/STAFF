"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword } from "@/lib/auth/actions";
import { resetPasswordSchema, type ResetPasswordValues } from "@/lib/validation/auth";

export function ResetPasswordForm() {
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: ResetPasswordValues) {
    setFormError(null);
    const result = await updatePassword(values);

    if (result?.error) {
      setFormError(result.error);
    }
  }

  const passwordError = form.formState.errors.password?.message;
  const confirmError = form.formState.errors.confirmPassword?.message;

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      {formError ? <FormMessage>{formError}</FormMessage> : null}

      <div className="space-y-2">
        <Label htmlFor="password">ახალი პაროლი</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(passwordError)}
          {...form.register("password")}
        />
        {passwordError ? <p className="text-sm leading-6 text-destructive">{passwordError}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">გაიმეორეთ პაროლი</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(confirmError)}
          {...form.register("confirmPassword")}
        />
        {confirmError ? <p className="text-sm leading-6 text-destructive">{confirmError}</p> : null}
      </div>

      <Button
        type="submit"
        size="lg"
        className="h-11 w-full text-base"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? "მიმდინარეობს..." : "პაროლის შენახვა"}
      </Button>
    </form>
  );
}
