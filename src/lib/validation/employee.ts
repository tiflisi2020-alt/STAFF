import { z } from "zod";

const optionalText = z.string().trim().max(1000, "ტექსტი ძალიან გრძელია");

export const employeeSchema = z.object({
  id: z.string().uuid().optional(),
  firstName: z.string().trim().min(1, "სახელი სავალდებულოა").max(80, "სახელი ძალიან გრძელია"),
  lastName: z.string().trim().min(1, "გვარი სავალდებულოა").max(80, "გვარი ძალიან გრძელია"),
  phone: z.string().trim().max(30, "ტელეფონი ძალიან გრძელია"),
  email: z.string().trim().refine((value) => value === "" || z.email().safeParse(value).success, {
    message: "შეიყვანეთ სწორი ელფოსტა",
  }),
  avatarUrl: z
    .string()
    .trim()
    .refine((value) => value === "" || /^https?:\/\/\S+$/i.test(value), {
      message: "ფოტოს ბმული უნდა იწყებოდეს http-ით ან https-ით",
    }),
  departmentId: z.string().uuid("აირჩიეთ განყოფილება"),
  positionId: z.string().uuid("აირჩიეთ პოზიცია"),
  isActive: z.boolean(),
  notes: optionalText,
});

export type EmployeeValues = z.infer<typeof employeeSchema>;
