import { z } from "zod";

export const marketingGeneratorSchema = z.object({
  courseId: z.string().trim().optional().nullable(),
  courseTitle: z.string({ required_error: "Course title is required." }).trim().min(2, "Course title is required."),
  courseTopic: z.string({ required_error: "Course topic is required." }).trim().min(2, "Course topic is required."),
  courseDescription: z.string({ required_error: "Course description is required." }).trim().min(10, "Course description is required."),
  platform: z.enum(["INSTAGRAM", "LINKEDIN", "FACEBOOK", "EMAIL"], {
    required_error: "Select a platform."
  }),
  targetAudience: z.string({ required_error: "Target audience is required." }).trim().min(2, "Target audience is required."),
  campaignGoal: z.string({ required_error: "Campaign goal is required." }).trim().min(4, "Campaign goal is required."),
  toneOfVoice: z.string({ required_error: "Tone of voice is required." }).trim().min(2, "Tone of voice is required."),
  callToActionStyle: z.string({ required_error: "Call-to-action style is required." }).trim().min(2, "Call-to-action style is required."),
  contentType: z.enum(["CAPTION", "AD", "PROMO_MESSAGE"]).optional().default("AD")
});

export const marketingSaveSchema = z.object({
  generatedText: z.string({ required_error: "Marketing text is required." }).trim().min(10, "Marketing text is required."),
  hashtags: z.string().trim().optional().default(""),
  seoKeywords: z.string().trim().optional().default(""),
  callToAction: z.string({ required_error: "Call to action is required." }).trim().min(2, "Call to action is required."),
  status: z.enum(["DRAFT", "SCHEDULED"]),
  scheduledAt: z.string().trim().optional().nullable(),
  structuredCampaign: z.record(z.unknown()).optional()
});
