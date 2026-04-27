export interface EvalQueryRequest {
  question: string;
  evaluate?: boolean;
}

export interface EvalScores {
  faithfulness: number;
  answerRelevancy: number;
  contextPrecision: number;
  overallScore: number;
}

export interface EvalQueryResponse {
  answer: string;
  contexts: string[];
  evaluation: EvalScores | null;
  langsmithTraceUrl: string | null;
  executionTimeMs: number;
}

export interface TestCase {
  question: string;
  groundTruth: string;
}

export interface BatchEvalRequest {
  testSet: TestCase[];
}

export interface BatchEvalResult {
  question: string;
  answer: string;
  evaluation: EvalScores;
}

export interface BatchEvalResponse {
  results: BatchEvalResult[];
  averageScores: EvalScores;
  executionTimeMs: number;
}
