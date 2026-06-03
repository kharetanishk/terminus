import { z } from "zod";

export const userMessageValidation = z.object({
  message: z.string().trim(),
});
