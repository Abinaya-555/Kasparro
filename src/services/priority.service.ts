import type { PerceptionResult } from "./perception.service";
import type { ProductAnalysisInput } from "./productAnalysis/types";

type PriorityImpact = "high" | "medium" | "low";

export type PriorityIssue = {
  issue: string;
  impact: PriorityImpact;
  reason: string;
};

type PriorityContext = {
  missingAttributes?: string[];
  clarityIssues?: string[];
  detectedCategory?: string;
};

const inferCategoryFromProduct = (product: ProductAnalysisInput) => {
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
};

function normalizeCategory(category?: string) {
  return category && category.trim() ? category : "General Merchandise";
}

function inferTargetAudienceApprox(category: string, product: ProductAnalysisInput) {
  const d = product.description.toLowerCase();
  if (category === "Skincare") {
    const segments = [
      { label: "oily / acne-prone", keys: ["oily", "acne", "breakout", "blemish"] },
      { label: "dry", keys: ["dry", "dehydrated", "flaky"] },
      { label: "sensitive", keys: ["sensitive", "redness", "irritation", "reactive"] },
      { label: "all skin types", keys: ["all skin types", "suitable for all"] },
      { label: "combination", keys: ["combination"] },
    ];
    const found = segments.find((s) => s.keys.some((k) => d.includes(k)));
    return found?.label ?? "general shoppers";
  }

  return "general shoppers";
}

function impactWeight(impact: PriorityImpact) {
  return impact === "high" ? 0 : impact === "medium" ? 1 : 2;
}

export function getPriorityIssues(
  product: ProductAnalysisInput,
  perception: PerceptionResult,
  context: PriorityContext = {}
): PriorityIssue[] {
  const category = normalizeCategory(context.detectedCategory ?? inferCategoryFromProduct(product));
  const missingAttributes = context.missingAttributes ?? [];
  const clarityIssues = context.clarityIssues ?? [];

  const priorities: PriorityIssue[] = [];

  const add = (p: PriorityIssue) => {
    if (priorities.some((x) => x.issue === p.issue)) return;
    priorities.push(p);
  };

  const perceptionLower = perception.current.toLowerCase();

  // HIGH: missing use-case (AI can't confidently match intent)
  if (perceptionLower.includes("unclear use-case") || perceptionLower.includes("unclear use-case due")) {
    add({
      issue: "Missing use-case",
      impact: "high",
      reason: "Without a clear use-case, AI can’t match the product to specific shopper intent, reducing retrieval and relevance.",
    });
  }

  // HIGH: missing target audience (especially skin type)
  if (category === "Skincare") {
    const audience = inferTargetAudienceApprox(category, product);
    if (audience === "general shoppers" || missingAttributes.includes("skin type") === false) {
      add({
        issue: "Missing target audience",
        impact: "high",
        reason: "If skin type/audience isn’t clear, AI can’t map the product to “for oily/dry/sensitive skin” queries, hurting discoverability.",
      });
    }
  }

  // HIGH/MEDIUM: category-defining attributes
  if (category === "Skincare") {
    if (missingAttributes.includes("skin type")) {
      add({
        issue: "Missing skin type",
        impact: "high",
        reason: "Skin type is a query-critical constraint. Without it, AI can’t reliably match intent like “best moisturizer for oily skin”.",
      });
    }
    if (missingAttributes.includes("ingredients")) {
      add({
        issue: "No ingredients listed",
        impact: "high",
        reason: "Ingredients let AI infer actives and benefits. Missing ingredients reduces match confidence for ingredient-based searches.",
      });
    }
    if (missingAttributes.includes("how to use")) {
      add({
        issue: "No usage instructions",
        impact: "medium",
        reason: "Missing usage steps reduce clarity and prevent AI from linking the product to routine-based intents (AM/PM, apply frequency).",
      });
    }
    if (missingAttributes.includes("benefits")) {
      add({
        issue: "Benefits not specified",
        impact: "medium",
        reason: "If benefits aren’t explicit, AI can’t connect the product to outcome queries (brightening, hydration, soothing), reducing conversion relevance.",
      });
    }
  }

  if (category === "Electronics") {
    if (missingAttributes.includes("compatibility")) {
      add({
        issue: "Missing compatibility",
        impact: "high",
        reason: "Compatibility is a primary shopper constraint. Without it, AI can’t validate fit for device/query, lowering search match and trust.",
      });
    }
  }

  // MEDIUM: clarity issues (low detail / no sentences / vague marketing)
  if (clarityIssues.some((x) => x.includes("too short")) || perceptionLower.includes("vague messaging")) {
    add({
      issue: "Low clarity",
      impact: "medium",
      reason: "Low clarity makes AI extraction harder and can cause misclassification, reducing ranking and conversion confidence.",
    });
  }

  // LOW: structure/format improvements
  if (perceptionLower.includes("low detail") || perceptionLower.includes("unclear use-case")) {
    add({
      issue: "Add structured sections (benefits/specs/usage)",
      impact: "low",
      reason: "Structured data makes AI extraction deterministic and improves consistent attribute matching.",
    });
  }

  // Stable ordering: high -> medium -> low, then by insertion order
  priorities.sort((a, b) => impactWeight(a.impact) - impactWeight(b.impact));

  // Keep it merchant-friendly: top 5
  return priorities.slice(0, 5);
}

