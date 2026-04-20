import { z } from "zod";
import { getOpenAiClient } from "../ai/openaiClient";

const AiQueryResponseSchema = z.object({
  queries: z.array(z.string().min(5)).min(3).max(6),
});

export async function generateQueriesWithAi(args: {
  title: string;
  description: string;
  detectedCategory: string;
  missingAttributes: string[];
}): Promise<string[]> {
  const client = getOpenAiClient();

  const prompt = [
    "You generate e-commerce search queries for product matching.",
    "Return ONLY JSON in the shape: {\"queries\": [\"...\", \"...\", \"...\"]}.",
    "Constraints:",
    "- Exactly 3 queries.",
    "- Queries must look like real shopper searches (lowercase is OK).",
    "- Each query should test a different intent type: (1) 'best for me', (2) 'constraints/specs/compatibility', (3) 'use/how-to/results'.",
    "- Do not mention 'Shopify' or 'AI'.",
    "- Keep each query under 90 characters.",
    "",
    `Detected category: ${args.detectedCategory}`,
    `Product title: ${args.title}`,
    `Product description: ${args.description}`,
    `Missing attributes (so queries should expose gaps): ${args.missingAttributes.join(", ") || "none"}`,
  ].join("\n");

  // Model choice: keep cost low; can be upgraded later.
  const resp = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const content = resp.choices[0]?.message?.content ?? "";
  const parsed = AiQueryResponseSchema.parse(JSON.parse(content));
  return parsed.queries.slice(0, 3);
}

