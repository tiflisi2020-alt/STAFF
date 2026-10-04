import type { ReactNode } from "react";

type FormMessageProps = {
  tone?: "error" | "success";
  children: ReactNode;
};

export function FormMessage({ tone = "error", children }: FormMessageProps) {
  const isError = tone === "error";

  return (
    <p
      role={isError ? "alert" : "status"}
      className={
        isError
          ? "rounded-xl bg-destructive/10 px-3 py-2.5 text-sm leading-6 text-destructive"
          : "rounded-xl bg-primary/10 px-3 py-2.5 text-sm leading-6 text-primary"
      }
    >
      {children}
    </p>
  );
}
