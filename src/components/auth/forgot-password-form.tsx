"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/auth/actions";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/lib/validation/auth";

export function ForgotPasswordForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: ForgotPasswordValues) {
    setFormError(null);
    setFormSuccess(null);
    const result = await requestPasswordReset(values);

    if (result.error) {
      setFormError(result.error);
      return;
    }

    if (result.success) {
      setFormSuccess(result.success);
      form.reset();
    }
  }

  const emailError = form.formState.errors.email?.message;

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      {formSuccess ? <FormMessage tone="success">{formSuccess}</FormMessage> : null}
      {formError ? <FormMessage>{formError}</FormMessage> : null}

      <div className="space-y-2">
        <Label htmlFor="email">ელფოსტა</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(emailError)}
          {...form.register("email")}
        />
        {emailError ? <p className="text-sm leading-6 text-destructive">{emailError}</p> : null}
      </div>

      <Button
        type="submit"
        size="lg"
        className="h-11 w-full text-base"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? "მიმდინარეობს..." : "ბმულის გაგზავნა"}
      </Button>

      <p className="text-sm leading-6 text-muted-foreground">
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">
          უკან შესვლაზე
        </Link>
      </p>
    </form>
  );
}
