import dotenv from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const envFilePath = resolveEnvFilePath();
if (envFilePath) {
  dotenv.config({ path: envFilePath });
} else {
  dotenv.config();
}

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL=postgresql://mhos_user:mhos_password@localhost:5432/mhos_dev?schema=public"),
  JWT_SECRET: z.string().min(1, "a200ac2cf9b4454f49a6216bb0a5ad69ae6ac47697edb576bb8919dee72821e"),
  ADMIN_EMAIL: z.string().email().default("root@mhos.local"),
  ADMIN_PASSWORD: z.string().min(8, "ADMIN_PASSWORD must be at least 8 characters").default("MhOs!2025"),
  ALLOWED_ORIGINS: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function loadEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid environment configuration", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export const env = loadEnv();

function resolveEnvFilePath(): string | undefined {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const backendRoot = path.resolve(moduleDir, "../../..");
  const candidates = [".env", ".env.local", ".env.docker"];
  for (const candidate of candidates) {
    const candidatePath = path.join(backendRoot, candidate);
    if (existsSync(candidatePath)) {
      return candidatePath;
    }
  }
  return undefined;
}
