import type { ImprovementResult } from "./improvement.service";
import type { PriorityIssue } from "./priority.service";
import type { ScoreResult } from "./scoring.service";
import type { BeforeAfterSimulation } from "./productAnalysis/types";

function attrsAsText(improvements: ImprovementResult) {
  return [
    improvements.title,
    improvements.targetAudience,
    improvements.useCase,
    ...improvements.benefits,
    ...improvements.keyAttributes.map((a) => `${a.name} ${a.value}`),
  ]
    .join(" ")
    .toLowerCase();
}

function simulationSupportsImprovements(simulations: BeforeAfterSimulation[]) {
  return simulations.every(
    (s) =>
      s.afterMatchExplanation.toLowerCase().includes("structured") &&
      s.improvementReason.toLowerCase().includes("match") &&
      s.beforeMatchExplanation !== s.afterMatchExplanation,
  );
}

export function runConsistencyChecks(args: {
  priorities: PriorityIssue[];
  improvements: ImprovementResult;
  score: ScoreResult;
  simulations: BeforeAfterSimulation[];
}): string[] {
  const warnings: string[] = [];
  const text = attrsAsText(args.improvements);

  for (const p of args.priorities.slice(0, 3)) {
    if (/skin type/i.test(p.issue) && !text.includes("skin type")) {
      warnings.push("Top issue says skin type is missing, but improvements do not add a clear skin type field.");
    }
    if (/ingredients/i.test(p.issue) && !text.includes("ingredients")) {
      warnings.push("Top issue says ingredients are missing, but improvements do not add ingredient details.");
    }
    if (/use-case/i.test(p.issue) && !text.includes("use-case") && !text.includes("use ")) {
      warnings.push("Top issue says use-case is missing, but improvements do not clearly define a use-case.");
    }
    if (/target audience/i.test(p.issue) && !text.includes("audience") && !args.improvements.targetAudience.trim()) {
      warnings.push("Top issue says target audience is missing, but improvements do not define one clearly.");
    }
    if (/compatibility/i.test(p.issue) && !text.includes("compatibility")) {
      warnings.push("Top issue says compatibility is missing, but improvements do not add compatibility details.");
    }
  }

  if (args.score.grade === "Excellent" && args.priorities.length > 0) {
    warnings.push("Score is excellent while priority issues still exist; scoring may be too generous.");
  }

  if (args.score.grade === "Critical" && args.priorities.length === 0) {
    warnings.push("Score is critical but no priorities were generated; issue ranking may be incomplete.");
  }

  if (!simulationSupportsImprovements(args.simulations)) {
    warnings.push("Simulation explanations may not fully reflect the improvements being proposed.");
  }

  return warnings;
}

