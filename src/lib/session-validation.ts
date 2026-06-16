import { z } from "zod";
import { toYouTubeEmbedUrl } from "@/lib/youtube";

export const trainingSessionShape = z.object({
  courseId: z.string({ required_error: "Select a course." }).trim().min(1, "Select a course."),
  title: z.string({ required_error: "Session title is required." }).trim().min(2, "Session title is required."),
  startTime: z.string({ required_error: "Start time is required." }).trim().min(1, "Start time is required."),
  endTime: z.string({ required_error: "End time is required." }).trim().min(1, "End time is required."),
  meetingLink: z.string({ required_error: "Meeting link is required." }).trim().url("Enter a valid meeting link."),
  sessionVideoUrl: z.string().trim().optional().nullable()
});

export const baseTrainingSessionSchema = trainingSessionShape.superRefine(refineSessionInput);

export const trainingSessionSchema = baseTrainingSessionSchema.transform(normalizeSessionInput);

export const partialTrainingSessionSchema = trainingSessionShape.partial().superRefine(refineSessionInput).transform(normalizeSessionInput);

function refineSessionInput(data: { sessionVideoUrl?: string | null }, context: z.RefinementCtx) {
  if (data.sessionVideoUrl?.trim() && !toYouTubeEmbedUrl(data.sessionVideoUrl)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["sessionVideoUrl"],
      message: "Enter a valid YouTube session video link."
    });
  }
}

export function normalizeSessionInput<T extends { sessionVideoUrl?: string | null }>(data: T) {
  return {
    ...data,
    sessionVideoUrl: data.sessionVideoUrl === undefined ? undefined : toYouTubeEmbedUrl(data.sessionVideoUrl)
  };
}
