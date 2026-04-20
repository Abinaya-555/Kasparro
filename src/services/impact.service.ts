import type { PriorityIssue } from "./priority.service";

export type ImpactExplanation = {
  ai: string;
  business: string;
};

export type PriorityIssueWithImpact = PriorityIssue & {
  impactExplanation: ImpactExplanation;
};

type IssueKey =
  | "Missing use-case"
  | "Missing target audience"
  | "Missing skin type"
  | "No ingredients listed"
  | "No usage instructions"
  | "Benefits not specified"
  | "Low clarity"
  | "Add structured sections (benefits/specs/usage)"
  | "Missing compatibility";

const mapping: Partial<Record<IssueKey, ImpactExplanation>> = {
  "Missing use-case": {
    ai: "AI cannot map this product to specific shopper intent, so intent-matching retrieval becomes low-confidence.",
    business: "Lower relevance in search/recommendations leads to reduced clicks and conversions.",
  },
  "Missing target audience": {
    ai: "Without a clear audience constraint, AI personalization and recommendation ranking becomes less precise.",
    business: "Weaker engagement and lower CTR because shoppers do not feel the product is “for them”.",
  },
  "Missing skin type": {
    ai: "Constraint-based queries like “for oily skin” cannot be satisfied reliably, reducing match accuracy.",
    business: "Reduced discoverability for high-intent audience searches and fewer purchases.",
  },
  "No ingredients listed": {
    ai: "Ingredient-based matching fails because AI cannot infer actives/benefits from specifics.",
    business: "Lower trust and purchase confidence, increasing drop-off at decision time.",
  },
  "No usage instructions": {
    ai: "How-to queries (AM/PM, apply frequency) cannot be answered confidently, lowering retrieval coverage.",
    business: "Less shopper confidence about results/fit leads to fewer conversions.",
  },
  "Benefits not specified": {
    ai: "Outcome/value queries cannot be grounded in explicit benefits, so AI relevance drops.",
    business: "Weaker value proposition reduces conversion rate once users compare products.",
  },
  "Low clarity": {
    ai: "Low clarity makes AI extraction inconsistent, causing misclassification and wrong attribute inferences.",
    business: "More mismatch between what shoppers expect and what they find reduces engagement and sales.",
  },
  "Add structured sections (benefits/specs/usage)": {
    ai: "Unstructured text causes attribute extraction drift, making AI matching less deterministic across updates.",
    business: "Catalog optimization becomes less effective, slowing incremental improvements in visibility.",
  },
  "Missing compatibility": {
    ai: "AI cannot validate fit/compatibility constraints, so device-specific queries yield poor matches.",
    business: "Reduced conversion plus higher return risk due to uncertainty about compatibility.",
  },
};

function fallbackFromIssue(issue: PriorityIssue): ImpactExplanation {
  // Deterministic fallback anchored to the existing issue reason (not random/generic).
  const impactNudge =
    issue.impact === "high" ? "highly" : issue.impact === "medium" ? "moderately" : "slightly";

  return {
    ai: `AI matching is ${impactNudge} impaired because "${issue.issue}" prevents reliable intent/attribute alignment (${issue.reason}).`,
    business: `This reduces discoverability and confidence ${impactNudge}, leading to lower CTR and fewer purchases.`,
  };
}

export function generateImpactExplanations(priorities: PriorityIssue[]): {
  prioritiesWithImpact: PriorityIssueWithImpact[];
} {
  const prioritiesWithImpact: PriorityIssueWithImpact[] = priorities.map((p) => {
    const key = p.issue as IssueKey;
    const impactExplanation = mapping[key] ?? fallbackFromIssue(p);
    return { ...p, impactExplanation };
  });

  return { prioritiesWithImpact };
}

