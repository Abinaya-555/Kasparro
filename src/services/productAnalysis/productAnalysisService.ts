import type {
  ProductAnalysisInput,
  ProductAnalyzeResponse,
  AnalysisIssue,
  BeforeAfterSimulation,
} from "./types";
import { buildFixedSimulations } from "./simulationTemplates";
import { env } from "../../config/env";
import { generateQueriesWithAi } from "./aiQueryGenerator";
import { analyzePerception } from "../perception.service";
import { calculateScore } from "../scoring.service";
import { getPriorityIssues } from "../priority.service";
import { generateImpactExplanations } from "../impact.service";
import { generateImprovements } from "../improvement.service";
import { buildMetaSummary, generateSummary } from "../summary.service";
import { runConsistencyChecks } from "../consistency.service";

const normalize = (s: string) => s.trim().replace(/\s+/g, " ");

function detectCategory(title: string, description: string) {
  const text = `${title} ${description}`.toLowerCase();
  const rules: Array<{ category: string; keywords: string[] }> = [
    { category: "Skincare", keywords: ["serum", "moisturizer", "cleanser", "sunscreen", "spf", "cream"] },
    { category: "Haircare", keywords: ["shampoo", "conditioner", "hair", "scalp", "curl", "keratin"] },
    { category: "Supplements", keywords: ["capsule", "supplement", "vitamin", "mg", "gummies", "collagen"] },
    { category: "Apparel", keywords: ["t-shirt", "hoodie", "pants", "jeans", "dress", "cotton"] },
    { category: "Electronics", keywords: ["charger", "wireless", "bluetooth", "usb", "battery", "headphones"] },
  ];

  for (const r of rules) {
    if (r.keywords.some((k) => text.includes(k))) return r.category;
  }
  return "General Merchandise";
}

function extractMissingAttributes(category: string, description: string): string[] {
  const d = description.toLowerCase();

  const expectCommon = ["materials", "dimensions/size", "compatibility", "care instructions", "warranty"];
  const expectSkincare = ["skin type", "ingredients", "how to use", "benefits", "safety/allergens"];
  const expect = category === "Skincare" ? expectSkincare : expectCommon;

  const signals: Record<string, string[]> = {
    "skin type": ["dry", "oily", "combination", "sensitive", "all skin types", "acne-prone"],
    ingredients: ["ingredients", "niacinamide", "hyaluronic", "retinol", "vitamin c", "fragrance-free"],
    "how to use": ["how to use", "apply", "use daily", "morning", "night", "steps"],
    benefits: ["benefit", "brighten", "hydrate", "reduce", "soothe", "repair"],
    "safety/allergens": ["patch test", "allergy", "dermatologist", "non-comedogenic", "irritation"],
    materials: ["material", "cotton", "polyester", "leather", "stainless", "silicone", "fabric"],
    "dimensions/size": ["size", "dimensions", "cm", "mm", "inches", "fit", "length", "width", "height"],
    compatibility: ["compatible", "works with", "fits", "ios", "android", "usb-c", "lightning"],
    "care instructions": ["care", "wash", "machine", "hand wash", "clean", "maintenance"],
    warranty: ["warranty", "guarantee", "returns", "return policy", "support"],
  };

  const missing: string[] = [];
  for (const attr of expect) {
    const keys = signals[attr] ?? [attr];
    const present = keys.some((k) => d.includes(k));
    if (!present) missing.push(attr);
  }

  return missing;
}

function findClarityIssues(title: string, description: string): string[] {
  const issues: string[] = [];
  if (normalize(title).length < 8) issues.push("Title is very short; may be non-descriptive.");
  if (normalize(description).length < 60) issues.push("Description is too short to infer key attributes.");
  if (!/[.!?]/.test(description)) issues.push("Description lacks sentences; readability is low.");
  if (/\b(best|amazing|premium|awesome|great)\b/i.test(description)) {
    issues.push("Uses vague marketing adjectives without specific claims or specs.");
  }
  return issues;
}

function buildIssues(missingAttributes: string[], clarityIssues: string[]): AnalysisIssue[] {
  const issues: AnalysisIssue[] = [];

  for (const a of missingAttributes) {
    const priority = a === "skin type" || a === "compatibility" ? "high" : a === "ingredients" ? "medium" : "low";
    issues.push({
      id: `missing_${a.replace(/[^\w]+/g, "_")}`,
      title: `Missing attribute: ${a}`,
      priority,
      whyItMatters:
        a === "skin type"
          ? "Missing skin type prevents AI from matching user queries like “best moisturizer for oily skin”, reducing discoverability."
          : "Missing attributes reduce AI interpretability and lower match quality for intent-based searches.",
      suggestion: `Add a clear ${a} section with concrete, machine-readable details.`,
    });
  }

  for (const ci of clarityIssues) {
    issues.push({
      id: `clarity_${ci.toLowerCase().replace(/[^\w]+/g, "_").slice(0, 48)}`,
      title: "Clarity issue",
      priority: "medium",
      whyItMatters: "Low clarity causes AI to misclassify products and miss key selling points, hurting retrieval and conversion.",
      suggestion: "Rewrite sentences to be specific, factual, and structured (attributes/benefits/use-cases).",
    });
  }

  const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return issues.sort((a, b) => rank[a.priority] - rank[b.priority]);
}

export async function analyzeProduct(input: ProductAnalysisInput): Promise<ProductAnalyzeResponse> {
  const title = normalize(input.title);
  const description = normalize(input.description);

  const category = detectCategory(title, description);
  const missingAttributes = extractMissingAttributes(category, description);
  const clarityIssues = findClarityIssues(title, description);
  const issues = buildIssues(missingAttributes, clarityIssues);
  const perception = analyzePerception({ title, description });
  const score = calculateScore(input, perception, { missingAttributes, clarityIssues });
  const priorities = getPriorityIssues(input, perception, {
    missingAttributes,
    clarityIssues,
    detectedCategory: category,
  });
  const { prioritiesWithImpact } = generateImpactExplanations(priorities);
  const improvements = generateImprovements(input, perception, priorities);
  const structuredImprovement = {
    detectedCategory: improvements.category,
    targetAudience: [improvements.targetAudience],
    keyAttributes: improvements.keyAttributes,
    benefits: improvements.benefits,
    useCases: [improvements.useCase],
  };

  const warnings: string[] = [];
  let simulations: BeforeAfterSimulation[] = buildFixedSimulations(category, missingAttributes);

  if (env.simulationQueryMode === "ai" || env.simulationQueryMode === "hybrid") {
    if (!env.openAiApiKey) {
      warnings.push("OPENAI_API_KEY is not set; using fixed simulation queries.");
    } else {
      try {
        const aiQueries = await generateQueriesWithAi({
          title,
          description,
          detectedCategory: category,
          missingAttributes,
        });

        const aiSims: BeforeAfterSimulation[] = aiQueries.map((q) => ({
          query: q,
          beforeMatchExplanation: `Before: missing (${missingAttributes.slice(0, 3).join(", ") || "critical attributes"}) -> weak semantic match to the query.`,
          afterMatchExplanation:
            `After: add missing (${missingAttributes.slice(0, 3).join(", ") || "critical attributes"}) + structured attributes/audience/use-cases -> strong match and higher confidence retrieval.`,
          improvementReason: `Now includes ${missingAttributes.slice(0, 3).join(", ") || "clear attributes"} that better match this query's intent and constraints.`,
          source: "ai",
        }));

        if (env.simulationQueryMode === "ai") {
          simulations = aiSims;
        } else {
          const byQuery = new Map<string, BeforeAfterSimulation>();
          for (const sim of [...aiSims, ...simulations]) byQuery.set(normalize(sim.query).toLowerCase(), sim);
          // Keep output stable across modes for downstream UI/rendering.
          simulations = Array.from(byQuery.values()).slice(0, 3);
        }
      } catch {
        warnings.push("AI query generation failed; using fixed simulation queries.");
      }
    }
  }

  warnings.push(
    ...runConsistencyChecks({
      priorities,
      improvements,
      score,
      simulations,
    }),
  );

  const meta = {
    simulationMode: env.simulationQueryMode,
    summary: buildMetaSummary(score, priorities),
    demoSummary: generateSummary(score, priorities, perception),
    warnings,
  };

  return {
    data: {
      detectedCategory: category,
      missingAttributes,
      clarityIssues,
      issues,
      perception,
      structuredImprovement,
      improvements,
      score,
      simulations,
      priorities,
      impactAnalysis: prioritiesWithImpact,
    },
    meta,
  };
}

