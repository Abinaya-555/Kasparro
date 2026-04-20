import type { AiPerception } from "./productAnalysis/types";
import type { PriorityIssue } from "./priority.service";
import type { ScoreResult } from "./scoring.service";
import type { DemoSummary, ResponseMeta } from "./productAnalysis/types";

function inferPrimaryImpact(priorities: PriorityIssue[], score: ScoreResult) {
  const topIssue = priorities[0]?.issue ?? "No major issue detected";

  if (/use-case|target audience|skin type|compatibility/i.test(topIssue)) {
    return "Low AI matchability";
  }
  if (score.breakdown.clarity <= 10) return "Low content clarity";
  if (score.breakdown.completeness <= 10) return "Low data completeness";
  if (score.breakdown.structure <= 10) return "Weak content structure";
  return "Moderate optimization opportunity";
}

function toFixPhrase(priorities: PriorityIssue[]) {
  const topTwo = priorities.slice(0, 2).map((p) => p.issue.toLowerCase());
  if (!topTwo.length) return "Maintain current product structure";
  if (topTwo.length === 1) return topTwo[0];
  return `${topTwo[0]} and ${topTwo[1]}`;
}

function toActionPhrase(issue: string) {
  const cleaned = issue.trim();
  if (/^Missing /i.test(cleaned)) return `Define ${cleaned.replace(/^Missing /i, "").toLowerCase()}`;
  if (/^No /i.test(cleaned)) return `Add ${cleaned.replace(/^No /i, "").toLowerCase()}`;
  return `Improve ${cleaned.toLowerCase()}`;
}

function buildKeyFix(priorities: PriorityIssue[]) {
  const topTwo = priorities.slice(0, 2).map((p) => p.issue.trim());
  if (!topTwo.length) return "Preserve structure and keep attributes up to date";
  if (topTwo.length === 1) return toActionPhrase(topTwo[0]);

  const first = topTwo[0];
  const second = topTwo[1];

  if (/^Missing /i.test(first) && /^Missing /i.test(second)) {
    return `Define ${first.replace(/^Missing /i, "").toLowerCase()} and ${second.replace(/^Missing /i, "").toLowerCase()}`;
  }

  if (/^No /i.test(first) && /^No /i.test(second)) {
    return `Add ${first.replace(/^No /i, "").toLowerCase()} and ${second.replace(/^No /i, "").toLowerCase()}`;
  }

  return `${toActionPhrase(first)} and ${toActionPhrase(second).replace(/^(Define|Add|Improve)\s+/i, "").toLowerCase()}`;
}

export function generateSummary(score: ScoreResult, priorities: PriorityIssue[], perception: AiPerception): DemoSummary {
  const primaryImpact = inferPrimaryImpact(priorities, score).toLowerCase();
  const headline =
    score.grade === "Excellent"
      ? "Product is already highly understandable for AI commerce systems"
      : `Product has ${primaryImpact.replace(/\bai\b/gi, "AI")} due to ${toFixPhrase(priorities)}`;

  const keyFix =
    priorities.length > 0 ? buildKeyFix(priorities) : "Preserve structure and keep attributes up to date";

  const expectedOutcome =
    /low ai matchability/i.test(inferPrimaryImpact(priorities, score))
      ? "Improved discoverability and stronger query-to-product matching"
      : /clarity/i.test(primaryImpact)
        ? "Clearer AI interpretation and higher conversion potential"
        : perception.ideal
          ? "Better retrieval confidence and more conversion-ready product data"
          : "Improved discoverability and higher conversion potential";

  return {
    headline,
    keyFix: keyFix.charAt(0).toUpperCase() + keyFix.slice(1),
    expectedOutcome,
  };
}

export function buildMetaSummary(score: ScoreResult, priorities: PriorityIssue[]): ResponseMeta["summary"] {
  const topIssue = priorities[0]?.issue ?? "No major issue detected";
  const primaryImpact = inferPrimaryImpact(priorities, score);

  return {
    scoreLabel: score.grade,
    topIssue,
    primaryImpact,
  };
}

