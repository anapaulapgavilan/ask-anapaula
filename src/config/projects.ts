import { z } from "zod";
import { httpsUrl } from "./profile";

export const projectSchema = z.strictObject({
  id: z.enum(["mi-inflacion", "remesas-mx", "unit-economics-lab", "fintech-for-lawyers"]),
  label: z.string().min(1),
  url: httpsUrl.nullable(),
  description: z.string().min(1).nullable(),
});
export const projects = z.array(projectSchema).parse([
  { id: "mi-inflacion", label: "Mi Inflaci\u00f3n", url: null, description: null },
  { id: "remesas-mx", label: "Remesas MX", url: null, description: null },
  { id: "unit-economics-lab", label: "Unit Economics Lab", url: null, description: null },
  { id: "fintech-for-lawyers", label: "Fintech for Lawyers", url: null, description: null },
]);
export type PublicProject = z.infer<typeof projectSchema>;
