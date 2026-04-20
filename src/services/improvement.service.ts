import type { PerceptionResult } from "./perception.service";
import type { ProductAnalysisInput } from "./productAnalysis/types";
import type { PriorityIssue } from "./priority.service";

export type ImprovementResult = {
  title: string;
  category: string;
  targetAudience: string;
  keyAttributes: Array<{ name: string; value: string }>;
  benefits: string[];
  useCase: string;
};

const normalize = (s: string) => s.trim().replace(/\s+/g, " ");

const includesAny = (haystack: string, needles: string[]) => needles.some((n) => haystack.includes(n));

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

function inferSkinType(description: string) {
  const d = description.toLowerCase();
  if (includesAny(d, ["oily", "acne", "blemish"])) return "oily / acne-prone skin";
  if (includesAny(d, ["dry", "flaky", "dehydrated"])) return "dry skin";
  if (includesAny(d, ["sensitive", "redness", "irritation", "reactive"])) return "sensitive skin";
  if (includesAny(d, ["combination"])) return "combination skin";
  if (includesAny(d, ["all skin types", "suitable for all"])) return "all skin types";
  return "";
}

function inferActive(description: string, title: string) {
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
    if (includesAny(d, ["hydrate", "hydration", "plump", "moisturize", "moisturising"])) return "hydrating";
    if (includesAny(d, ["soothe", "calm", "sensitive", "redness", "irritation"])) return "soothing";
    if (includesAny(d, ["repair", "barrier", "strengthen"])) return "barrier repair";
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

function inferBenefits(category: string, outcome: string) {
  if (!outcome) return [];

  if (category === "Skincare") {
    if (outcome === "brightening") return ["Brightens dull skin", "Helps reduce the look of dark spots", "Improves glow and tone"];
    if (outcome === "hydrating") return ["Deeply hydrates", "Helps skin look plumper", "Supports a smoother look"];
    if (outcome === "soothing") return ["Calms visible redness", "Comforts sensitive-looking skin", "Supports a balanced skin feel"];
    if (outcome === "barrier repair") return ["Supports skin barrier", "Helps strengthen resilience", "Reduces the look of dryness"];
  }

  if (category === "Haircare") {
    if (outcome === "anti-frizz") return ["Reduces frizz", "Smooths flyaways", "Improves manageability in humidity"];
    if (outcome === "curl definition") return ["Enhances curl definition", "Helps reduce puffiness", "Adds soft, touchable hold"];
    if (outcome === "repair") return ["Helps repair damaged-looking hair", "Strengthens strands", "Supports healthier-looking ends"];
  }

  if (category === "Supplements") {
    if (outcome === "immunity support") return ["Supports immune function", "Helps overall wellness", "Daily easy routine"];
    if (outcome === "sleep support") return ["Supports better sleep routine", "Helps relaxation", "Gentle daily support"];
    if (outcome === "skin elasticity") return ["Supports skin elasticity", "Helps support youthful-looking skin", "Daily confidence boost"];
  }

  return [];
}

function inferTargetAudience(category: string, description: string, outcome: string) {
  if (category === "Skincare") {
    const skinType = inferSkinType(description);
    if (skinType) return [skinType, outcome ? `${outcome} seekers` : "people who want better results"];
    return [outcome ? `${outcome} shoppers` : "general skin needs", "daily skincare routine users"];
  }

  return [category === "General Merchandise" ? "everyday shoppers" : "general shoppers"];
}

function inferUseCase(category: string, outcome: string, skinType: string, active: string, description: string) {
  if (category === "Skincare") {
    const who = skinType || "your skin type";
    const activePart = active ? `${active} ` : "";
    const out = outcome || "brighter, healthier-looking skin";
    return `Use ${activePart}for ${out}: apply to clean skin as part of your routine for ${who}. (AM/PM guidance: follow product directions and follow with moisturizer if needed.)`;
  }
  if (category === "Haircare") {
    const who = skinType || "your hair type";
    const out = outcome || "better hair days";
    return `Use this for ${out}: apply as directed to ${who} and build into your routine.`;
  }
  if (category === "Supplements") {
    const out = outcome || "your daily wellness goal";
    return `Use as a daily supplement to support: ${out}. Follow dosage guidance on the label.`;
  }
  if (category === "Electronics") {
    const compat = inferCompatibility(description);
    const out = outcome || "device compatibility with confidence";
    const who = skinType || "your device setup";
    return `Use-case: ${out}. This product should match ${who} via ${compat || "supported ports"} / key specs. Verify compatibility before purchase.`;
  }
  if (category === "Apparel") {
    const out = outcome || "fit, materials, and care";
    return `Use-case: apparel for ${out}. Add clear size/material/care so AI can match “fit” and “care” queries confidently.`;
  }
  return `Use-case: ${category} shoppers looking for clear results and structured specs.`;
}

function keyAttr(name: string, value: string) {
  return { name, value };
}

export function generateImprovements(product: ProductAnalysisInput, perception: PerceptionResult, priorities: PriorityIssue[]): ImprovementResult {
  const detectedCategory = inferCategory(product);
  const titleIn = normalize(product.title);
  const description = normalize(product.description);

  const outcome = inferOutcome(detectedCategory, description);
  const active = inferActive(description, titleIn);
  const skinType = inferSkinType(description);
  const targetAudience = inferTargetAudience(detectedCategory, description, outcome);
  const benefits = inferBenefits(detectedCategory, outcome);

  const priorityIssues = new Set(priorities.map((p) => p.issue));
  const has = (needle: string) => priorityIssues.has(needle);

  // Align with perception.ideal without copying it verbatim:
  // - perception.ideal is short; we derive category/outcome/audience from deterministic inference.
  const category = detectedCategory;

  const improvedTitle =
    category === "Skincare"
      ? `${active ? capitalizeWords(active) + " " : ""}${outcome ? outcomeToNoun(outcome) + " " : ""}serum`
      : category === "Haircare"
        ? `${active ? capitalizeWords(active) + " " : ""}${outcome ? outcomeToNoun(outcome) + " " : ""}treatment`
        : category === "Supplements"
          ? `${active ? capitalizeWords(active) + " " : ""}${outcome ? outcomeToNoun(outcome) + " " : ""}supplement`
          : titleIn || "Optimized Product";

  const keyAttributes: Array<{ name: string; value: string }> = [
    keyAttr("Product", titleIn || "Unknown"),
    keyAttr("Category", category),
  ];

  if (category === "Skincare") {
    // Always include structured skincare constraints to improve AI matchability.
    keyAttributes.push(keyAttr("Ingredients", active ? active : "Add key ingredients (INCI list / active(s))"));
    keyAttributes.push(keyAttr("Benefits", benefits.length ? benefits.join("; ") : outcome ? outcome : "Add explicit benefits/outcomes"));
    keyAttributes.push(keyAttr("How to use", "AM/PM: Apply after cleansing. Use the frequency on the label; follow with moisturizer if needed."));

    if (has("Missing skin type") || has("Missing target audience")) {
      keyAttributes.push(keyAttr("Skin type", skinType ? skinType : "Choose the intended skin type (e.g., oily, dry, sensitive)."));
    }

    if (has("No ingredients listed")) {
      setAttrValue(keyAttributes, "Ingredients", active ? active : "List the active ingredients (e.g., vitamin c / niacinamide / retinol) + full INCI list");
    }

    if (has("No usage instructions")) {
      setAttrValue(
        keyAttributes,
        "How to use",
        "Use guidance: cleanse -> apply a thin layer -> follow with moisturizer (AM/PM as directed).",
      );
    }
  }

  if (category === "Electronics") {
    const compatibility = inferCompatibility(description);
    const specs = inferElectronicsSpecs(description);

    keyAttributes.push(
      keyAttr(
        "Compatibility",
        compatibility || (has("Missing compatibility") ? "Specify compatible devices/ports (e.g., usb-c / lightning / model names)" : "Add compatibility details (ports/devices supported)."),
      ),
    );
    keyAttributes.push(
      keyAttr(
        "Key specs",
        specs || "Add key specs: watt/mah, cable/connector type, battery life (if applicable), and charging standard.",
      ),
    );
    if (has("Missing compatibility")) {
      setAttrValue(keyAttributes, "Compatibility", compatibility || "Specify compatible devices/ports (e.g., usb-c / lightning / model names)");
    }
  }

  if (category === "Haircare") {
    keyAttributes.push(
      keyAttr("Ingredients/Actives", active ? active : "Add key actives/ingredients (e.g., keratin/biotin) and their benefits"),
    );
    keyAttributes.push(keyAttr("How to use", "Use as directed: apply to wet hair, massage in, leave briefly, rinse (or follow label for leave-in)."));
    if (has("Low clarity")) {
      keyAttributes.push(keyAttr("Use-case constraint", "State the target hair type/issue and expected results clearly in 1-2 sentences."));
    }
  }

  if (category === "Supplements") {
    keyAttributes.push(keyAttr("Active ingredients", active ? active : "Add active ingredients + amount (mg/IU)"));
    keyAttributes.push(keyAttr("Dosage", "Add dosage guidance (e.g., 1 capsule daily) exactly as on label."));
    if (has("Benefits not specified")) {
      keyAttributes.push(keyAttr("Benefits", benefits.length ? benefits.join("; ") : outcome ? outcome : "Add explicit benefits/outcomes"));
    }
  }

  if (category === "Apparel") {
    keyAttributes.push(keyAttr("Materials", "Add fabric/material composition (e.g., cotton/linen/polyester)"));
    keyAttributes.push(keyAttr("Care instructions", "Add care instructions: machine wash / tumble dry / iron guidance."));
    keyAttributes.push(keyAttr("Fit/size info", "Add size guidance: measurements + model height/weight (if available)."));
  }

  const finalBenefits = benefits.length ? benefits : has("Benefits not specified") ? ["Clear benefits to match outcomes"] : ["Add explicit benefits to improve AI relevance"];

  const useCase = inferUseCase(category, outcome, skinType, active, description);

  return {
    title: improvedTitle,
    category,
    targetAudience: targetAudience.slice(0, 3).join(", "),
    keyAttributes: keyAttributes.slice(0, 8),
    benefits: finalBenefits.slice(0, 5),
    useCase,
  };
}

function setAttrValue(attrs: Array<{ name: string; value: string }>, name: string, value: string) {
  const idx = attrs.findIndex((a) => a.name === name);
  if (idx >= 0) attrs[idx] = keyAttr(name, value);
}

function capitalizeWords(s: string) {
  return s
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function outcomeToNoun(outcome: string) {
  const map: Record<string, string> = {
    brightening: "brightening",
    hydrating: "hydrating",
    soothing: "soothing",
    "barrier repair": "barrier repair",
    "anti-frizz": "anti-frizz",
    "curl definition": "curl definition",
    repair: "repair",
    "immunity support": "immunity support",
    "sleep support": "sleep support",
    "skin elasticity": "skin elasticity",
  };
  return map[outcome] ?? "improved";
}

function inferCompatibility(text: string) {
  const d = (text || "").toLowerCase();
  if (d.includes("usb-c")) return "USB-C";
  if (d.includes("lightning")) return "Apple Lightning";
  if (d.includes("micro-usb")) return "micro-USB";
  if (d.includes("android")) return "Android devices";
  if (d.includes("ios") || d.includes("iphone") || d.includes("ipad")) return "iOS devices";
  if (d.includes("bluetooth")) return "Bluetooth-enabled devices";
  return "";
}

function inferElectronicsSpecs(description: string) {
  const d = description.toLowerCase();
  const parts: string[] = [];
  if (d.includes("wireless")) parts.push("wireless");
  if (d.includes("noise cancelling")) parts.push("noise cancelling");
  if (d.includes("battery")) {
    const match = d.match(/(\d+)\s*(hours|hrs|hr)\b/);
    parts.push(match ? `battery life ~${match[1]}+ hours` : "battery life");
  }
  if (d.includes("mah")) {
    const match = d.match(/(\d+)\s*mah\b/);
    parts.push(match ? `${match[1]} mAh` : "battery capacity (mAh)");
  }
  if (d.includes("watt") || d.includes("w")) {
    const match = d.match(/(\d+)\s*watt\b|(\d+)\s*w\b/);
    parts.push(match ? "charging power (W)" : "charging power");
  }
  return parts.length ? parts.join(", ") : "";
}

