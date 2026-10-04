export const appRoles = ["admin", "employee"] as const;

export type AppRole = (typeof appRoles)[number];

export type ActionResult = {
  error?: string;
  success?: string;
};
