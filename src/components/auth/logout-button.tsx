"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";

function LogoutSubmit() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" size="lg" className="h-10" disabled={pending}>
      {pending ? "მიმდინარეობს..." : "გასვლა"}
    </Button>
  );
}

export function LogoutButton() {
  return (
    <form action={signOut}>
      <LogoutSubmit />
    </form>
  );
}
