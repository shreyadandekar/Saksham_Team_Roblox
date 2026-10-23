/**
 * src/config/env.ts
 * Validates and exports typed environment variables at startup.
 * The app will fail fast with a clear message if required vars are missing.
 */

import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
  // DATABASE_URL is validated here so we catch missing config early,
  // even though Prisma reads it independently.
  DATABASE_URL: z.string().min(1, "DATABASE_URL must be set"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌  Invalid environment variables:\n", parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
