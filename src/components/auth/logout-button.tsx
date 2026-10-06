"use client";

import { LogOut } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";

function LogoutSubmit({ compact }: { compact: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={compact ? "ghost" : "outline"}
      className={compact ? "h-9 w-full justify-start px-2.5 text-muted-foreground" : "h-10"}
      disabled={pending}
    >
      {compact ? <LogOut /> : null}
      {pending ? "მიმდინარეობს..." : "გასვლა"}
    </Button>
  );
}

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action={signOut} className={compact ? "w-full" : undefined}>
      <LogoutSubmit compact={compact} />
    </form>
  );
}
