export type Priority = "high" | "medium" | "low";

export type ProductAnalysisInput = {
  title: string;
  description: string;
};

export type AnalysisIssue = {
  id: string;
  title: string;
  priority: Priority;
  whyItMatters: string;
  suggestion: string;
};

export type StructuredImprovement = {
  detectedCategory: string;
  targetAudience: string[];
  keyAttributes: Array<{ name: string; value: string }>;
  benefits: string[];
  useCases: string[];
};

export type AiPerception = {
  current: string;
  ideal: string;
};

export type BeforeAfterSimulation = {
  query: string;
  beforeMatchExplanation: string;
  afterMatchExplanation: string;
  improvementReason: string;
  source?: "fixed" | "ai";
};

export type DemoSummary = {
  headline: string;
  keyFix: string;
  expectedOutcome: string;
};

export type ResponseMeta = {
  simulationMode: "fixed" | "ai" | "hybrid";
  warnings: string[];
  summary: {
    scoreLabel: "Critical" | "Poor" | "Fair" | "Good" | "Excellent";
    topIssue: string;
    primaryImpact: string;
  };
  demoSummary: DemoSummary;
};

export type ProductAnalysisResult = {
  detectedCategory: string;
  missingAttributes: string[];
  clarityIssues: string[];
  issues: AnalysisIssue[];
  perception: AiPerception;
  structuredImprovement: StructuredImprovement;
  improvements: {
    title: string;
    category: string;
    targetAudience: string;
    keyAttributes: Array<{ name: string; value: string }>;
    benefits: string[];
    useCase: string;
  };
  score: {
    value: number; // 0-100
    grade: "Critical" | "Poor" | "Fair" | "Good" | "Excellent";
    breakdown: {
      clarity: number; // 0-25
      completeness: number; // 0-25
      structure: number; // 0-25
      matchability: number; // 0-25
    };
  };
  simulations: BeforeAfterSimulation[];
  impactAnalysis: Array<{
    issue: string;
    impact: "high" | "medium" | "low";
    reason: string;
    impactExplanation: {
      ai: string;
      business: string;
    };
  }>;
  priorities: Array<{
    issue: string;
    impact: "high" | "medium" | "low";
    reason: string;
  }>;
};

export type ProductAnalyzeResponse = {
  data: ProductAnalysisResult;
  meta: ResponseMeta;
};

