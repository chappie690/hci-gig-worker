import { z } from "zod";

export const automationTypes = ["COURSE_PUBLISHING", "SOCIAL_POST", "EMAIL_REMINDER", "CHATBOT_REPLY", "SESSION_REMINDER"] as const;
export const automationStatuses = ["PENDING", "RUNNING", "COMPLETED", "FAILED"] as const;

export const automationTaskSchema = z.object({
  type: z.enum(automationTypes, { required_error: "Select an automation type." }),
  title: z.string({ required_error: "Task title is required." }).trim().min(2, "Task title is required."),
  description: z.string({ required_error: "Task description is required." }).trim().min(10, "Task description is required."),
  status: z.enum(automationStatuses, { required_error: "Select a status." }),
  scheduledAt: z.string({ required_error: "Choose a scheduled date and time." }).trim().min(1, "Choose a scheduled date and time.")
});

export function parseScheduledAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Choose a valid scheduled date.");
  }

  return date;
}
