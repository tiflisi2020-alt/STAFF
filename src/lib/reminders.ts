import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import webpush from "web-push";
import { demoCollectDueReminders } from "@/lib/demo/operations";
import { isDemoEnabled } from "@/lib/demo/token";

type VapidKeys = { publicKey: string; privateKey: string };

function vapidKeys(): VapidKeys | null {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  }
  try {
    const file = path.join(process.cwd(), ".data", "vapid.json");
    if (existsSync(file)) {
      return JSON.parse(readFileSync(file, "utf8")) as VapidKeys;
    }
    const keys = webpush.generateVAPIDKeys();
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(keys));
    return keys;
  } catch (error) {
    console.error("vapid keys unavailable", error);
    return null;
  }
}

export function getPushPublicKey() {
  return vapidKeys()?.publicKey ?? null;
}

export async function ensureShiftReminders() {
  if (!isDemoEnabled()) {
    return 0;
  }
  const due = demoCollectDueReminders("Asia/Tbilisi");
  const keys = vapidKeys();
  if (!keys) {
    return due.length;
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:staff@localhost", keys.publicKey, keys.privateKey);
  for (const item of due) {
    if (!item.endpoint) {
      continue;
    }
    try {
      await webpush.sendNotification(
        {
          endpoint: item.endpoint.endpoint,
          keys: { p256dh: item.endpoint.p256dh, auth: item.endpoint.auth },
        },
        JSON.stringify({ title: item.title, body: item.body }),
      );
    } catch (error) {
      console.error("push reminder failed", error);
    }
  }
  return due.length;
}
