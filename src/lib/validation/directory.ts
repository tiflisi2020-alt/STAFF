import { z } from "zod";

const name = z.string().trim().min(1, "სახელი სავალდებულოა").max(80, "სახელი ძალიან გრძელია");

export const departmentSchema = z.object({
  id: z.string().uuid().optional(),
  name,
});

export const positionSchema = z.object({
  id: z.string().uuid().optional(),
  departmentId: z.string().uuid("აირჩიეთ განყოფილება"),
  name,
});

export const restaurantSettingsSchema = z.object({
  displayName: name,
});

export type DepartmentValues = z.infer<typeof departmentSchema>;
export type PositionValues = z.infer<typeof positionSchema>;
export type RestaurantSettingsValues = z.infer<typeof restaurantSettingsSchema>;
