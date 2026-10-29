import { z } from "zod";

export const APPROVED_CONTACT_EMAIL = "anapaulapgavilan@gmail.com";
export const httpsUrl = z.string().url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password;
}, "Use a credential-free HTTPS URL.");
export const profileSchema = z.strictObject({
  contactEmail: z.literal(APPROVED_CONTACT_EMAIL),
  displayName: z.string().min(1).nullable().default(null),
  biography: z.string().min(1).nullable().default(null),
  oneLiner: z.string().min(1).nullable().default(null),
  linkedinUrl: httpsUrl.nullable().default(null),
  githubUrl: httpsUrl.nullable().default(null),
  photo: z.literal("/photo.jpg").nullable().default(null),
  cv: z.literal("/cv.pdf").nullable().default(null),
  illustration: z.literal("/avatar/ana-paula.png").nullable().default(null),
});
export const profile = profileSchema.parse({
  contactEmail: APPROVED_CONTACT_EMAIL,
  illustration: "/avatar/ana-paula.png",
});
export type PublicProfile = z.infer<typeof profileSchema>;
