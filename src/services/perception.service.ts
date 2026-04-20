export type ProductInput = {
  title: string;
  description: string;
};

export type PerceptionResult = {
  current: string;
  ideal: string;
};

const normalize = (s: string) => s.trim().replace(/\s+/g, " ");

const includesAny = (haystack: string, needles: string[]) => needles.some((n) => haystack.includes(n));

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

function detectVagueness(description: string) {
  const d = description.toLowerCase();
  const vague = ["best", "amazing", "premium", "awesome", "great", "effective", "works", "world-class", "magic"];
  return includesAny(d, vague);
}

function hasLowStructure(description: string) {
  // If the description is one short fragment, it’s harder for AI retrieval to extract facts.
  const d = description.trim();
  if (d.length < 60) return true;
  const sentenceCount = (d.match(/[.!?]/g) || []).length;
  return sentenceCount === 0;
}

function inferActive(title: string, description: string) {
  const t = `${title} ${description}`.toLowerCase();
  const actives = [
    "vitamin c",
    "niacinamide",
    "hyaluronic acid",
    "retinol",
    "ceramide",
    "collagen",
    "magnesium",
    "vitamin d",
    "keratin",
    "biotin",
  ];
  const found = actives.find((a) => t.includes(a));
  return found ?? "";
}

function inferOutcome(category: string, description: string) {
  const d = description.toLowerCase();

  if (category === "Skincare") {
    if (includesAny(d, ["brighten", "brightening", "dark spots", "hyperpigmentation"])) return "brightening";
    if (includesAny(d, ["hydrate", "hydration", "plump", "moisturize", "moisturising"])) return "hydration";
    if (includesAny(d, ["soothe", "calm", "sensitive", "redness", "irritation"])) return "calming";
    if (includesAny(d, ["repair", "barrier", "strengthen"])) return "repair";
  }

  if (category === "Haircare") {
    if (includesAny(d, ["frizz", "humidity"])) return "anti-frizz";
    if (includesAny(d, ["curl", "definition"])) return "curl definition";
    if (includesAny(d, ["repair", "damage", "split ends"])) return "repair";
  }

  if (category === "Supplements") {
    if (includesAny(d, ["immunity"])) return "immunity support";
    if (includesAny(d, ["sleep"])) return "sleep support";
    if (includesAny(d, ["elasticity"])) return "skin elasticity";
  }

  return "";
}

function capitalizeWords(s: string) {
  return s
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function outcomeToDescriptor(outcome: string) {
  const map: Record<string, string> = {
    brightening: "brightening",
    hydration: "hydrating",
    calming: "soothing",
    repair: "barrier-repair",
  };
  return map[outcome] ?? "clear";
}

function outcomeToDefaultAudience(outcome: string) {
  const map: Record<string, string> = {
    brightening: "glowing skin",
    hydration: "plumped, hydrated skin",
    calming: "sensitive skin",
    repair: "healthy skin barrier",
  };
  return map[outcome] ?? "general skin needs";
}

function inferTargetAudience(category: string, description: string) {
  const d = description.toLowerCase();
  if (category === "Skincare") {
    const segments = [
      { label: "oily acne-prone skin", keys: ["oily", "acne", "breakout", "blemish"] },
      { label: "dry skin", keys: ["dry", "dehydrated", "flaky"] },
      { label: "sensitive skin", keys: ["sensitive", "redness", "irritation", "reactive"] },
      { label: "all skin types", keys: ["all skin types", "suitable for all"] },
      { label: "combination skin", keys: ["combination"] },
    ];

    const found = segments.find((s) => s.keys.some((k) => d.includes(k)));
    if (found) return found.label;
  }

  if (category === "Supplements") {
    if (includesAny(d, ["women", "female"])) return "women";
    if (includesAny(d, ["men", "male"])) return "men";
    if (includesAny(d, ["veg", "vegan"])) return "vegan shoppers";
  }

  return "general shoppers";
}

function missingKeyAttributes(category: string, description: string) {
  const d = description.toLowerCase();

  const missing: string[] = [];
  if (category === "Skincare") {
    if (!includesAny(d, ["skin type", "oily", "dry", "sensitive", "combination"])) missing.push("skin type");
    if (!includesAny(d, ["ingredients", "niacinamide", "hyaluronic", "retinol", "vitamin c", "fragrance-free"])) missing.push("key ingredients");
    if (!includesAny(d, ["how to use", "apply", "morning", "night", "steps"])) missing.push("usage instructions");
    if (!includesAny(d, ["benefit", "brighten", "hydrate", "reduce", "soothe", "repair", "dark spots"])) missing.push("specific benefits");
  } else if (category === "Electronics") {
    if (!includesAny(d, ["compatible", "usb", "usb-c", "lightning", "works with"])) missing.push("compatibility");
    if (!includesAny(d, ["battery", "hours", "watt", "mah", "charging"])) missing.push("key specs");
  } else {
    const common = ["materials", "size", "compatibility", "care instructions", "warranty"];
    for (const c of common) {
      if (!includesAny(d, [c.replace("/", " "), c])) missing.push(c);
    }
  }

  return missing;
}

function buildCurrentPerception(args: { category: string; description: string; title: string }) {
  const { category, description, title } = args;
  const d = normalize(description);
  const t = normalize(title);

  const vagueness = detectVagueness(d);
  const lowStructure = hasLowStructure(d);
  const missing = missingKeyAttributes(category, d);

  const missingPrimary = missing.length ? missing.slice(0, 2).join(" and ") : "";

  if (category === "General Merchandise") {
    const reason = lowStructure ? "unclear use-case" : missingPrimary ? `missing ${missingPrimary}` : "limited detail";
    return `Low-confidence category classification; ${reason}.`;
  }

  if (missingPrimary && (lowStructure || vagueness)) {
    return `${category} product; missing ${missingPrimary}; unclear use-case due to low detail/vagueness.`;
  }

  if (missingPrimary) {
    return `${category} product; missing ${missingPrimary}.`;
  }

  if (lowStructure) {
    return `${category} product; unclear use-case due to low detail.`;
  }

  if (vagueness) {
    return `${category} product; vague messaging with limited specs.`;
  }

  const titleHint = t.length < 6 ? "generic title" : "enough detail";
  return `${category} product; ${titleHint}.`;
}

function buildIdealPerception(args: { category: string; title: string; description: string }) {
  const { category, title, description } = args;

  const active = inferActive(title, description);
  const outcome = inferOutcome(category, description);
  const audience = inferTargetAudience(category, description);
  const finalAudience = audience === "general shoppers" ? outcomeToDefaultAudience(outcome) : audience;

  const productNoun =
    category === "Skincare"
      ? active
        ? `${active} serum`
        : "brightening serum"
      : category === "Haircare"
        ? active
          ? `${active} treatment`
          : "treatment"
        : category === "Supplements"
          ? active
            ? `${active} supplement`
            : "supplement"
          : category === "Apparel"
            ? title.toLowerCase().includes("hoodie")
              ? "hoodie"
              : "apparel"
            : category === "Electronics"
              ? title.toLowerCase().includes("charger")
                ? "charger"
                : "electronics product"
              : "product";

  if (category === "Skincare") {
    const descriptor = outcomeToDescriptor(outcome);
    const base = active ? `${capitalizeWords(active)} ${descriptor} serum` : `Targeted ${descriptor} serum`;
    return `${base} for ${finalAudience}`;
  }

  if (category === "Haircare") {
    const idealOutcome = outcome ? outcome : "better results";
    return `${productNoun} for ${finalAudience || idealOutcome}`;
  }

  if (category === "Supplements") {
    const idealOutcome = outcome ? outcome : "everyday support";
    return `${productNoun} for ${finalAudience || idealOutcome}`;
  }

  // Generic ideal: ensure it has category + audience + explicit use-case.
  return `${productNoun} for ${finalAudience} with clear specs and use-case`;
}

export function analyzePerception(product: ProductInput): PerceptionResult {
  const title = normalize(product.title);
  const description = normalize(product.description);
  const category = detectCategory(title, description);

  const current = buildCurrentPerception({ category, description, title });
  const ideal = buildIdealPerception({ category, title, description });

  return { current, ideal };
}

/**
 * Optional upgrade hook: when we introduce OpenAI-backed perception,
 * we can generate richer “current/ideal” strings here.
 */
export async function generateAIPerception(_product: ProductInput): Promise<PerceptionResult> {
  // Upgrade hook for the AI-backed perception engine.
  // Until OpenAI prompting is introduced, we keep behavior deterministic.
  // This ensures the system never crashes during the hackathon demo.
  return analyzePerception(_product);
}

