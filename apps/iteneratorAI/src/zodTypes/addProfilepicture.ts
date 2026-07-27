import z from "zod";
export const addProfilePictureSchema = z.object({
  fileName: z.string().min(1),
  imageFormat: z.enum(["png", "jpeg", "jpg"]),
  fileSize: z.number().max(1024 * 1024 * 10),
});
