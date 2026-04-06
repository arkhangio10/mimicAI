export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  services: string[];
  steps: WorkflowStep[];
  rules: LearnedRule[];
  edgeCases: EdgeCase[];
  variables: WorkflowVariable[];
  triggerType: "manual" | "schedule" | "event";
  triggerConfig: Record<string, unknown>;
  requiresScreenCapture: boolean;
  sourceApp: string | null;
  isPublished: boolean;
  price: number;
}

export interface WorkflowStep {
  id: string;
  order: number;
  type: "read_screen" | "write_api" | "transform" | "decision" | "notify";
  service: string | null;
  action: string;
  parameters: Record<string, unknown>;
  purpose: string;
  isConditional: boolean;
  condition: string | null;
  inputFrom: string | null;
  outputTo: string | null;
}

export interface WorkflowVariable {
  name: string;
  type: "string" | "number" | "boolean";
  source: "user_input" | "extracted" | "computed";
  default: unknown;
  description: string;
}

export interface LearnedRule {
  id: string;
  condition: string;
  action: string;
  source: string;
  confidence: number;
}

export interface EdgeCase {
  id: string;
  scenario: string;
  response: string;
  source: string;
}
