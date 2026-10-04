export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");

  if (configured) {
    return configured;
  }

  const vercelHost = process.env.VERCEL_URL?.trim();

  if (vercelHost) {
    return `https://${vercelHost}`;
  }

  return "http://localhost:3000";
}
