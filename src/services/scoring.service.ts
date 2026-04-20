import type { PerceptionResult } from "./perception.service";
import type { ProductAnalysisInput } from "./productAnalysis/types";

type ScoreBreakdown = {
  clarity: number; // 0-25
  completeness: number; // 0-25
  structure: number; // 0-25
  matchability: number; // 0-25
};

export type ScoreResult = {
  value: number; // 0-100
  grade: "Critical" | "Poor" | "Fair" | "Good" | "Excellent";
  breakdown: ScoreBreakdown;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

function gradeFromValue(value: number): ScoreResult["grade"] {
  if (value >= 85) return "Excellent";
  if (value >= 70) return "Good";
  if (value >= 50) return "Fair";
  if (value >= 30) return "Poor";
  return "Critical";
}

function sentenceCount(description: string) {
  return (description.match(/[.!?]/g) || []).length;
}

function hasVagueMessaging(description: string) {
  const d = description.toLowerCase();
  return ["best", "amazing", "premium", "awesome", "great", "effective", "works"].some((w) => d.includes(w));
}

function inferCategory(product: ProductAnalysisInput) {
  const text = `${product.title} ${product.description}`.toLowerCase();
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

function missingKeyAttributesApprox(product: ProductAnalysisInput, category: string): string[] {
  const d = product.description.toLowerCase();

  if (category === "Skincare") {
    const missing: string[] = [];
    if (!["oily", "dry", "sensitive", "combination", "acne"].some((k) => d.includes(k))) missing.push("skin type");
    if (!["ingredients", "niacinamide", "hyaluronic", "retinol", "vitamin c"].some((k) => d.includes(k)))
      missing.push("ingredients");
    if (!["how to use", "apply", "morning", "night", "steps"].some((k) => d.includes(k))) missing.push("how to use");
    if (!["brighten", "hydrate", "soothe", "repair", "dark spots", "benefit"].some((k) => d.includes(k)))
      missing.push("benefits");
    if (!["patch test", "allergy", "non-comedogenic", "irritation"].some((k) => d.includes(k)))
      missing.push("safety/allergens");
    return missing;
  }

  if (category === "Electronics") {
    const missing: string[] = [];
    if (!["compatible", "usb", "usb-c", "lightning", "works with"].some((k) => d.includes(k))) missing.push("compatibility");
    if (!["battery", "hours", "watt", "mah", "charging"].some((k) => d.includes(k))) missing.push("key specs");
    return missing;
  }

  // Generic fallback: use a few “schema-like” fields.
  const missing: string[] = [];
  for (const token of ["materials", "size", "compatibility", "care", "warranty"]) {
    if (!d.includes(token)) missing.push(token);
  }
  return missing;
}

export function calculateScore(
  product: ProductAnalysisInput,
  perception: PerceptionResult,
  context?: { missingAttributes?: string[]; clarityIssues?: string[] }
): ScoreResult {
  const category = inferCategory(product);
  const desc = product.description.trim();
  const sentences = sentenceCount(desc);
  const vague = hasVagueMessaging(desc);

  const missingAttributes = context?.missingAttributes ?? missingKeyAttributesApprox(product, category);
  const clarityIssues = context?.clarityIssues ?? [];

  // Clarity: penalize vague messaging and low detail; clarity issues also come from earlier engine.
  let clarity = 25;
  clarity -= clarityIssues.length * 6;
  if (vague) clarity -= 5;
  if (desc.length < 80) clarity -= 6;
  if (perception.current.toLowerCase().includes("missing")) clarity -= 2;
  if (perception.current.toLowerCase().includes("unclear use-case")) clarity -= 4;
  clarity = clamp(clarity, 0, 25);

  // Completeness: based on how many high-signal attributes are missing.
  const completenessPenalty = missingAttributes.length * 2.8;
  // Add extra weight for category-defining fields if our missing list includes them.
  const highMissingCount = missingAttributes.filter((a) =>
    category === "Skincare" ? ["skin type", "ingredients"].includes(a) : category === "Electronics" ? a === "compatibility" : false
  ).length;
  let completeness = 25 - completenessPenalty - highMissingCount * 3.5;
  completeness = clamp(completeness, 0, 25);

  // Structure: penalize too few sentences / no punctuation (hard for AI extraction).
  let structure = 25;
  if (sentences === 0) structure -= 12;
  if (sentences === 1) structure -= 7;
  if (desc.length < 60) structure -= 8;
  if (perception.current.toLowerCase().includes("low detail")) structure -= 6;
  structure = clamp(structure, 0, 25);

  // Matchability: penalize missing fields that prevent query matching/retrieval.
  let matchability = 25;
  // High impact missing attributes.
  const matchMissingWeight =
    category === "Skincare"
      ? missingAttributes
          .map((a) => (a === "skin type" || a === "ingredients" ? 6 : a === "how to use" || a === "benefits" ? 3.5 : 2))
          .reduce((sum, v) => sum + v, 0)
      : category === "Electronics"
        ? missingAttributes
            .map((a) => (a === "compatibility" ? 6 : 3.5))
            .reduce((sum, v) => sum + v, 0)
        : missingAttributes.length * 3;
  matchability -= matchMissingWeight;
  if (vague) matchability -= 3;
  matchability = clamp(matchability, 0, 25);

  const breakdown: ScoreBreakdown = {
    clarity: Math.round(clarity),
    completeness: Math.round(completeness),
    structure: Math.round(structure),
    matchability: Math.round(matchability),
  };

  const value = clamp(Object.values(breakdown).reduce((a, b) => a + b, 0), 0, 100);

  return {
    value: Math.round(value),
    grade: gradeFromValue(value),
    breakdown,
  };
}

