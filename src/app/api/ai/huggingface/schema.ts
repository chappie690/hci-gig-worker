import { z } from "zod";

export const hfMarketingInputSchema = z.object({
  courseTitle: z.string({ required_error: "Course title is required." }).trim().min(2, "Course title is required."),
  name: z.string({ required_error: "Name is required." }).trim().min(2, "Name is required."),
  targetAudience: z.string({ required_error: "Target audience is required." }).trim().min(2, "Target audience is required."),
  platform: z.enum(["INSTAGRAM", "FACEBOOK", "TIKTOK", "LINKEDIN"], { required_error: "Select a platform." }),
  tone: z.string({ required_error: "Tone is required." }).trim().min(2, "Tone is required."),
  campaignGoal: z.string({ required_error: "Campaign goal is required." }).trim().min(4, "Campaign goal is required."),
  productDescription: z.string({ required_error: "Product or service description is required." }).trim().min(10, "Product or service description is required."),
  keyBenefits: z.string({ required_error: "Key benefits are required." }).trim().min(6, "Key benefits are required."),
  promotionalOffer: z.string().trim().optional()
});
