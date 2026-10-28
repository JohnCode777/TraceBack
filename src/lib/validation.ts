import { z } from "zod";

export const severity = z.enum(["Critical", "High", "Medium", "Low"]);
export const reproducibility = z.enum([
  "Always",
  "Sometimes",
  "Rarely",
  "Once",
]);
export const envType = z.enum(["Production", "Staging", "Development"]);
export const rootCause = z.enum([
  "Logic error",
  "Configuration",
  "Data",
  "Race condition",
  "Third party",
  "Environment",
  "Unknown",
]);
export const reproducedByDev = z.enum(["Yes", "Partially", "No"]);
export const noteType = z.enum([
  "Observation",
  "Hypothesis",
  "Ruled out",
  "Root cause",
  "Workaround",
  "Question",
]);
const optionalText = z.string().trim().max(10000).nullable().optional();
export const bugFields = z.object({
  title: z.string().trim().min(1).max(200),
  severity: severity.nullable().optional(),
  reproducibility: reproducibility.nullable().optional(),
  areaId: z.string().min(1).max(128).nullable().optional(),
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
  assigneeId: z.string().min(1).max(128).nullable().optional(),
});
export const transitionSchema = z.object({
  to: z.enum(["Submitted", "Investigating", "Fixed", "Verified"]),
  comment: z.string().trim().max(10000).optional(),
  resolutionSummary: z.string().trim().max(10000).optional(),
  rootCauseCategory: rootCause.optional(),
  reproducedByDev: reproducedByDev.optional(),
  fixReference: optionalText,
  verification: z
    .object({
      steps: z
        .array(
          z.object({
            stepId: z.string().min(1).max(128),
            result: z.enum(["Pass", "Fail"]),
            comment: z.string().trim().max(10000).optional(),
          }),
        )
        .max(50),
      problemOccurs: z.enum(["Yes", "No"]).optional(),
      finalComment: z.string().trim().max(10000).optional(),
    })
    .optional(),
});
export const noteSchema = z.object({
  type: noteType,
  body: z.string().trim().min(1).max(10000),
});
export const assignSchema = z.object({
  assigneeId: z.string().min(1).max(128).nullable(),
});
export const projectParams = z.object({
  projectId: z.string().min(1).max(128),
});
export const bugParams = projectParams.extend({
  bugId: z.string().min(1).max(128),
});
export const noteParams = bugParams.extend({
  noteId: z.string().min(1).max(128),
});
const blankAsMissing = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    schema.optional(),
  );
export const listSchema = z.object({
  status: blankAsMissing(
    z.enum(["Submitted", "Investigating", "Fixed", "Verified"]),
  ),
  severity: blankAsMissing(severity),
  area: blankAsMissing(z.string().max(128)),
  reporter: blankAsMissing(z.string().max(128)),
  assignee: blankAsMissing(z.string().max(128)),
  q: blankAsMissing(z.string().max(200)),
  incomplete: blankAsMissing(z.enum(["1"])),
  unresolved: blankAsMissing(z.enum(["1"])),
  window: blankAsMissing(z.enum(["30", "90"])),
  from: blankAsMissing(z.iso.date()),
  to: blankAsMissing(z.iso.date()),
  sort: z.enum(["newest", "oldest", "severity", "title"]).default("newest"),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
});
