import { z } from "zod";
import { toYouTubeEmbedUrl } from "@/lib/youtube";

const courseShape = z.object({
  title: z.string({ required_error: "Title is required." }).trim().min(3, "Title must be at least 3 characters."),
  description: z.string({ required_error: "Description is required." }).trim().min(12, "Description must be at least 12 characters."),
  category: z.string({ required_error: "Category is required." }).trim().min(2, "Category is required."),
  level: z.string({ required_error: "Level is required." }).trim().min(2, "Level is required."),
  price: z.coerce.number({ invalid_type_error: "Price must be a number." }).min(0, "Price cannot be negative."),
  duration: z.string({ required_error: "Duration is required." }).trim().min(2, "Duration is required."),
  thumbnailUrl: z.string({ required_error: "Thumbnail URL is required." }).trim().min(1, "Thumbnail URL is required."),
  courseVideoUrl: z.string().trim().optional().nullable(),
  discountActive: z.coerce.boolean().optional().default(false),
  discountPercent: z.coerce.number().min(0, "Discount cannot be negative.").max(100, "Discount cannot exceed 100%.").optional().nullable(),
  discountLabel: z.string().trim().max(40, "Discount label must be 40 characters or less.").optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED"], {
    required_error: "Status is required."
  })
});

const baseCourseSchema = courseShape.superRefine(refineCourseInput);

export const courseSchema = baseCourseSchema.transform(normalizeCourseInput);

export const courseUpdateSchema = courseShape.partial().superRefine(refineCourseInput).refine((data) => Object.keys(data).length > 0, {
  message: "Provide at least one field to update."
}).transform(normalizeCourseInput);

function refineCourseInput(data: { courseVideoUrl?: string | null }, context: z.RefinementCtx) {
  if (data.courseVideoUrl?.trim() && !toYouTubeEmbedUrl(data.courseVideoUrl)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["courseVideoUrl"],
      message: "Enter a valid YouTube link."
    });
  }
}

function normalizeCourseInput<T extends {
  courseVideoUrl?: string | null;
  discountActive?: boolean;
  discountPercent?: number | null;
  discountLabel?: string | null;
}>(data: T) {
  return {
    ...data,
    courseVideoUrl: data.courseVideoUrl === undefined ? undefined : toYouTubeEmbedUrl(data.courseVideoUrl),
    discountPercent: data.discountActive ? data.discountPercent ?? 0 : data.discountActive === false ? null : data.discountPercent,
    discountLabel: data.discountActive ? data.discountLabel?.trim() || "Limited Offer" : data.discountActive === false ? null : data.discountLabel
  };
}
