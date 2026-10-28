import { z } from "zod";

export const roleSchema = z.enum(["Tester", "Developer", "Admin"]);
export type Role = z.infer<typeof roleSchema>;
export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().trim().toLowerCase(),
  password: z.string().min(12).max(128),
});
export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
});
export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(100),
  key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,5}$/),
  description: z.string().trim().max(2000).default(""),
});
export const editProjectSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000),
});
export const addMemberSchema = z.object({
  email: z.email().trim().toLowerCase(),
  role: roleSchema,
});

export const projectIdSchema = z.string().min(1).max(100);
export const deleteProjectSchema = z.object({
  confirmationKey: z.string().regex(/^[A-Z]{2,5}$/),
});
export const areaIdSchema = z.string().min(1).max(100);
export const createAreaSchema = z.object({
  name: z.string().trim().min(1, "Enter an area name.").max(100),
});
