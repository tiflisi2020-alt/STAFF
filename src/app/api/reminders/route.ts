import { ensureShiftReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const sent = await ensureShiftReminders();
    return Response.json({ sent });
  } catch (error) {
    console.error("reminder cron failed", error);
    return Response.json({ error: "failed" }, { status: 500 });
  }
}
