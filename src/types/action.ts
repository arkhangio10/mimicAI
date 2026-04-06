export interface CapturedAction {
  id: string;
  timestamp: number;
  screenshotUrl: string;
  sourceApp: string;
  action: string;
  actionTarget: string;
  extractedData: ExtractedData | null;
  destinationService: "gmail" | "sheets" | "slack" | "browser" | "unknown" | null;
  destinationTarget: string | null;
  confidence: number;
  needsClarification: boolean;
}

export interface ExtractedData {
  type: "table" | "single_value" | "text_block" | "form_fields";
  values: Record<string, unknown>;
  rawText: string;
  screenRegion: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface LearnedStep {
  id: string;
  recordingId: string;
  observation: {
    screenshotUrl: string;
    sourceApp: string;
    action: string;
    extractedData: ExtractedData | null;
    destinationService: string | null;
    destinationTarget: string | null;
  };
  reasoning: {
    questions: QuestionAnswer[];
    rules: import("./workflow").LearnedRule[];
    edgeCases: import("./workflow").EdgeCase[];
  };
  understanding: {
    purposeDescription: string;
    conditionLogic: string;
    isConditional: boolean;
    condition: string | null;
    consequences: string[];
  };
}

export interface QuestionAnswer {
  id: string;
  category: "identity" | "reason" | "rule" | "edge_case";
  question: string;
  answer: string;
  timestamp: number;
  screenshotUrl: string;
}
