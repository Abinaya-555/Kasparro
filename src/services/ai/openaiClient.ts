import OpenAI from "openai";
import { env } from "../../config/env";

let client: OpenAI | null = null;

export function getOpenAiClient() {
  if (!client) {
    client = new OpenAI({ apiKey: env.openAiApiKey });
  }
  return client;
}

