import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(8080),
  HOST: z.string().default("0.0.0.0"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  JWT_SECRET: z.string().min(16),
  ACCESS_TTL_MIN: z.coerce.number().default(15),
  REFRESH_TTL_DAYS: z.coerce.number().default(30),
  DEMO_OTP: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((issue) => issue.path.join(".") + ": " + issue.message);
    throw new Error("Некорректные переменные окружения:\n" + lines.join("\n"));
  }
  return parsed.data;
}
