import type { BeforeAfterSimulation } from "./types";

type Category =
  | "Skincare"
  | "Haircare"
  | "Supplements"
  | "Apparel"
  | "Electronics"
  | "General Merchandise";

function makeSimulation(query: string, missingAttributes: string[]): BeforeAfterSimulation {
  const beforeMatchExplanation = `Before: missing (${missingAttributes.slice(0, 3).join(", ") || "critical attributes"}) -> weak semantic match to the query.`;
  const afterMatchExplanation =
    `After: add missing (${missingAttributes.slice(0, 3).join(", ") || "critical attributes"}) + structured attributes/audience/use-cases -> strong match and higher confidence retrieval.`;
  const improvementReason = `Now includes ${missingAttributes.slice(0, 3).join(", ") || "clear attributes"} that better match this query's intent and constraints.`;

  return { query, beforeMatchExplanation, afterMatchExplanation, improvementReason, source: "fixed" };
}

export function buildFixedSimulations(category: string, missingAttributes: string[]): BeforeAfterSimulation[] {
  const c = (category || "General Merchandise") as Category;

  const queriesByCategory: Record<Category, string[]> = {
    Skincare: [
      "best moisturizer for oily acne-prone skin",
      "vitamin c serum fragrance-free for dark spots",
      "how to use retinol serum with moisturizer at night",
    ],
    Haircare: [
      "best shampoo for curly hair with frizz",
      "conditioner for oily scalp sulfate-free",
      "leave-in treatment to repair hair with heat protection",
    ],
    Supplements: [
      "best collagen supplement for skin elasticity",
      "vitamin d gummies 2000 IU for immunity",
      "magnesium for sleep vegan gluten-free",
    ],
    Apparel: [
      "hoodie for winter oversized cotton",
      "t-shirt size guide for 5'10 170 regular fit",
      "cotton dress that is machine washable",
    ],
    Electronics: [
      "charger compatible with iPhone USB-C",
      "best headphones with noise cancelling under $100",
      "wireless earbuds for workouts battery life 8+ hours",
    ],
    "General Merchandise": [
      "best product for everyday use",
      "product size and materials details",
      "does this product work with my setup",
    ],
  };

  const queries = queriesByCategory[c] ?? queriesByCategory["General Merchandise"];
  return queries.map((q) => makeSimulation(q, missingAttributes));
}

