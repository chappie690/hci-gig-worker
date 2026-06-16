import { z } from "zod";

export const trainerProfileSchema = z.object({
  brandName: z.string({ required_error: "Brand name is required." }).trim().min(2, "Brand name is required."),
  tagline: z.string({ required_error: "Tagline is required." }).trim().min(4, "Tagline is required."),
  bio: z.string({ required_error: "Bio is required." }).trim().min(20, "Bio must be at least 20 characters."),
  skills: z.string({ required_error: "Skills are required." }).trim().min(2, "Skills are required."),
  portfolioSummary: z.string({ required_error: "Portfolio summary is required." }).trim().min(20, "Portfolio summary must be at least 20 characters."),
  logoPrompt: z.string({ required_error: "Logo prompt is required." }).trim().min(10, "Logo prompt is required."),
  socialLinks: z.string({ required_error: "Social links are required." }).trim().min(2, "Social links are required.")
});

export const brandingInputSchema = z.object({
  niche: z.string({ required_error: "Trainer niche is required." }).trim().min(2, "Trainer niche is required."),
  targetAudience: z.string({ required_error: "Target audience is required." }).trim().min(2, "Target audience is required."),
  tone: z.string({ required_error: "Tone is required." }).trim().min(2, "Tone is required."),
  skills: z.string({ required_error: "Skills are required." }).trim().min(2, "Skills are required.")
});
