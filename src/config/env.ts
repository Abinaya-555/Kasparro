import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

/**
 * Load environment variables from a predictable location.
 * - Dev/hackathon: project-root `.env`
 * - Allows running from other working directories without silently missing env.
 */
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config(); // fallback (dotenv default lookup)
}

const asNumber = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const asEnum = <T extends readonly string[]>(value: string | undefined, allowed: T, fallback: T[number]) => {
  const v = (value ?? "").trim();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (allowed as any).includes(v) ? (v as T[number]) : fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: asNumber(process.env.PORT, 5000),
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  simulationQueryMode: asEnum(process.env.SIMULATION_QUERY_MODE, ["fixed", "ai", "hybrid"] as const, "fixed"),
};

