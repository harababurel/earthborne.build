// Stub — ER has no taboo system. Type kept for call-site compatibility.
import { z } from "zod";

const TabooSchema = z.object({
  code: z.string(),
  text: z.string().optional(),
});

export type Taboo = z.infer<typeof TabooSchema>;
