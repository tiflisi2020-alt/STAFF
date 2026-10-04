import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "ელფოსტა სავალდებულოა")
    .pipe(z.email("შეიყვანეთ სწორი ელფოსტა")),
  password: z.string().min(1, "პაროლი სავალდებულოა"),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "ელფოსტა სავალდებულოა")
    .pipe(z.email("შეიყვანეთ სწორი ელფოსტა")),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "პაროლი უნდა შეიცავდეს მინიმუმ 8 სიმბოლოს"),
    confirmPassword: z.string().min(1, "გაიმეორეთ პაროლი"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "პაროლები არ ემთხვევა",
    path: ["confirmPassword"],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
