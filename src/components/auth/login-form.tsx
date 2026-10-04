"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/auth/actions";
import { loginSchema, type LoginValues } from "@/lib/validation/auth";

type LoginFormProps = {
  initialMessage?: string;
  initialTone?: "error" | "success";
};

export function LoginForm({ initialMessage, initialTone = "error" }: LoginFormProps) {
  const [formError, setFormError] = useState<string | null>(
    initialTone === "error" ? (initialMessage ?? null) : null,
  );
  const [formSuccess] = useState<string | null>(initialTone === "success" ? (initialMessage ?? null) : null);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    const result = await signIn(values);

    if (result?.error) {
      setFormError(result.error);
    }
  }

  const emailError = form.formState.errors.email?.message;
  const passwordError = form.formState.errors.password?.message;

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

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="password">პაროლი</Label>
          <Link href="/forgot-password" className="text-sm text-primary underline-offset-4 hover:underline">
            დაგავიწყდათ პაროლი?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(passwordError)}
          {...form.register("password")}
        />
        {passwordError ? <p className="text-sm leading-6 text-destructive">{passwordError}</p> : null}
      </div>

      <Button
        type="submit"
        size="lg"
        className="h-11 w-full text-base"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? "მიმდინარეობს..." : "შესვლა"}
      </Button>
    </form>
  );
}
