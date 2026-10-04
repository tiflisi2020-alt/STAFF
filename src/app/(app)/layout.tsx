import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { AppShell } from "@/components/layout/app-shell";
import { isDemoSession } from "@/lib/demo/session";
import { getSessionContext } from "@/lib/auth/context";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const context = await getSessionContext();

  if (!context) {
    redirect("/login");
  }

  if (!context.profile.restaurant_id) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="max-w-md space-y-4 rounded-3xl bg-card p-6 shadow-sm ring-1 ring-foreground/10">
          <h1 className="text-2xl font-semibold">ანგარიში არ არის მიბმული</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            მენეჯერმა ანგარიში რესტორნს უნდა დაუკავშიროს. სანამ ეს არ მოხდება, სამუშაო მონაცემები არ გამოჩნდება.
          </p>
          <LogoutButton />
        </div>
      </div>
    );
  }

  const personName = context.profile.full_name || context.email;

  return (
    <AppShell
      role={context.profile.role}
      restaurantName={context.restaurantName}
      personName={personName}
      unreadCount={context.unreadCount}
      demoMode={await isDemoSession()}
    >
      {children}
    </AppShell>
  );
}
