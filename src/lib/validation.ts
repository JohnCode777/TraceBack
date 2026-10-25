import { z } from "zod";

export const severity = z.enum(["Critical", "High", "Medium", "Low"]);
export const reproducibility = z.enum(["Always", "Sometimes", "Rarely", "Once"]);
export const envType = z.enum(["Production", "Staging", "Development"]);
export const rootCause = z.enum([
  "Logic error", "Configuration", "Data", "Race condition", "Third party", "Environment", "Unknown",
]);
export const reproducedByDev = z.enum(["Yes", "Partially", "No"]);
export const noteType = z.enum([
  "Observation", "Hypothesis", "Ruled out", "Root cause", "Workaround", "Question",
]);
const optionalText = z.string().trim().max(10000).nullable().optional();
export const bugFields = z.object({
  title: z.string().trim().min(1).max(200),
  severity: severity.nullable().optional(),
  reproducibility: reproducibility.nullable().optional(),
  areaId: z.string().nullable().optional(),
  osName: optionalText,
  osVersion: optionalText,
  browserOrDevice: optionalText,
  appVersion: optionalText,
  envType: envType.nullable().optional(),
  expectedBehaviour: optionalText,
  actualBehaviour: optionalText,
  extraContext: optionalText,
  steps: z.array(z.string().trim().min(1).max(2000)).max(50),
});
export const createBugSchema = bugFields;
export const editBugSchema = bugFields.partial().extend({
  resolutionSummary: optionalText,
  rootCauseCategory: rootCause.nullable().optional(),
  reproducedByDev: reproducedByDev.nullable().optional(),
  fixReference: optionalText,
  assigneeId: z.string().nullable().optional(),
});
export const transitionSchema = z.object({
  to: z.enum(["Submitted", "Investigating", "Fixed", "Verified"]),
  comment: z.string().trim().max(10000).optional(),
  resolutionSummary: z.string().trim().max(10000).optional(),
  rootCauseCategory: rootCause.optional(),
  reproducedByDev: reproducedByDev.optional(),
  fixReference: optionalText,
});
export const noteSchema = z.object({
  type: noteType,
  body: z.string().trim().min(1).max(10000),
});
export const assignSchema = z.object({ assigneeId: z.string().nullable() });
export const listSchema = z.object({
  status: z.enum(["Submitted", "Investigating", "Fixed", "Verified"]).optional(),
  severity: severity.optional(),
  area: z.string().optional(),
  reporter: z.string().optional(),
  assignee: z.string().optional(),
  q: z.string().max(200).optional(),
  sort: z.enum(["newest", "oldest", "severity", "title"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
});
