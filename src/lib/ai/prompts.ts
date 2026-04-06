import type { CapturedAction, QuestionAnswer } from "@/types/action";
import type { LearnedRule } from "@/types/workflow";

export function INTERPRET_PROMPT(
  previousActions: CapturedAction[],
  context: string
): string {
  const recent = previousActions.slice(-5);
  return `You are MimicAI's screen interpreter. You have TWO jobs:

1. ACTION RECOGNITION: What is the user doing right now?
2. DATA EXTRACTION: What data values are visible on screen? Read ALL numbers, text, and tables you can see. Be precise — these values will be used in automation.

Previous actions: ${JSON.stringify(recent)}
User context: ${context}

Respond ONLY with a JSON object (no markdown, no code fences):
{
  "sourceApp": "name of the application visible on screen",
  "action": "read_data|type_value|click_button|switch_app|scroll|select|copy|paste",
  "actionTarget": "what element the user interacted with",
  "extractedData": {
    "type": "table|single_value|text_block|form_fields",
    "values": { "key": "value pairs of ALL data visible" },
    "rawText": "raw OCR text from the data region",
    "screenRegion": { "x": 0, "y": 0, "width": 0, "height": 0 }
  },
  "destinationService": "gmail|sheets|slack|browser|unknown|null",
  "destinationTarget": "specific location like Sheet1!B3 or null",
  "dataFlow": "read_from_screen|write_to_app|transform|navigate",
  "confidence": 0.0-1.0,
  "needsClarification": true/false,
  "clarificationQuestion": "question about the data or the pattern, or null"
}

If the screenshot shows no data (e.g. a desktop or blank screen), set extractedData to null.

IMPORTANT: When you see a table, spreadsheet, or any structured data on screen,
extract EVERY value you can read. The user may be transcribing this data manually
and we want to automate that transcription.`;
}

export function EXTRACT_PROMPT(
  expectedDataSchema: Record<string, unknown>,
  sourceAppName: string
): string {
  return `You are MimicAI's data extractor. Extract data from "${sourceAppName}" visible on screen.

Expected schema: ${JSON.stringify(expectedDataSchema, null, 2)}

Respond ONLY with a JSON object (no markdown, no code fences) matching the schema with actual values from the screenshot.
Be extremely precise with numbers — these will be written to a spreadsheet.

If you cannot find the expected data, respond with:
{ "error": "DATA_NOT_FOUND", "reason": "explanation", "whatIsVisible": "description" }`;
}

// ─── Learning Engine Prompts ─────────────────────────────────────────

export function QUESTION_GENERATION_PROMPT(
  action: CapturedAction,
  actionIndex: number,
  totalActions: number,
  allActions: CapturedAction[],
  previousQA: QuestionAnswer[]
): string {
  const surroundingActions = allActions
    .slice(Math.max(0, actionIndex - 2), actionIndex + 3)
    .map((a, i) => ({
      index: Math.max(0, actionIndex - 2) + i,
      isCurrent: Math.max(0, actionIndex - 2) + i === actionIndex,
      sourceApp: a.sourceApp,
      action: a.action,
      actionTarget: a.actionTarget,
      extractedData: a.extractedData
        ? { type: a.extractedData.type, fields: Object.keys(a.extractedData.values) }
        : null,
      destinationService: a.destinationService,
      destinationTarget: a.destinationTarget,
    }));

  const previousQASummary = previousQA.slice(-10).map((qa) => ({
    category: qa.category,
    question: qa.question,
    answer: qa.answer,
  }));

  return `You are MimicAI's Learning Engine — a curious, observant apprentice watching someone work.
You watched a user perform a task on their screen and now you need to understand WHY they did each step, not just WHAT they did.

You are reviewing step ${actionIndex + 1} of ${totalActions}.

CURRENT ACTION:
- App: ${action.sourceApp}
- Action: ${action.action}
- Target: ${action.actionTarget}
- Extracted data: ${action.extractedData ? JSON.stringify(action.extractedData.values) : "none"}
- Data type: ${action.extractedData?.type ?? "none"}
- Destination: ${action.destinationService ?? "none"} → ${action.destinationTarget ?? "none"}
- Confidence: ${action.confidence}

SURROUNDING ACTIONS (for context):
${JSON.stringify(surroundingActions, null, 2)}

PREVIOUS Q&A (do NOT repeat these):
${previousQASummary.length > 0 ? JSON.stringify(previousQASummary, null, 2) : "None yet"}

Generate 2-4 clarifying questions about this step. Ask across these categories:

1. IDENTITY — What is this app/data? (ask for first occurrence of each app or data type)
2. REASON — Why did the user do this specific action? Why this target?
3. RULE — Is this always done this way? Are there conditions or thresholds?
4. EDGE_CASE — What if the data is missing, different, or unexpected?

Guidelines:
- Ask about EVERY step, even obvious ones. The goal is to build a reasoning model.
- If data was extracted, ask what the values mean and whether they change.
- If the user switched apps, ask about the relationship between them.
- If the user skipped something, ask why.
- If a value was typed or pasted, ask if it's always that value or if it varies.
- Do NOT ask questions already answered in previous Q&A.
- Prioritize "reason" and "rule" questions — they produce the most useful automation logic.

Respond ONLY with a JSON array (no markdown, no code fences):
[
  { "category": "identity|reason|rule|edge_case", "question": "your question" },
  ...
]`;
}

export function FOLLOW_UP_PROMPT(
  action: CapturedAction,
  conversation: QuestionAnswer[]
): string {
  const convoSummary = conversation.map((qa) => ({
    category: qa.category,
    question: qa.question,
    answer: qa.answer,
  }));

  return `You are MimicAI's Learning Engine. You are having a conversation about a specific step in a workflow.

ACTION:
- App: ${action.sourceApp}
- Action: ${action.action}
- Target: ${action.actionTarget}
- Data: ${action.extractedData ? JSON.stringify(action.extractedData.values) : "none"}
- Destination: ${action.destinationService ?? "none"} → ${action.destinationTarget ?? "none"}

CONVERSATION SO FAR:
${JSON.stringify(convoSummary, null, 2)}

Based on the user's latest answer, decide if a follow-up question would help you understand:
- A conditional rule (IF/THEN logic) the user mentioned or implied
- A variable value that changes between runs
- An edge case or exception
- A deeper "why" behind their answer

Do NOT follow up if:
- The answer is complete and self-explanatory
- You already have enough information for this step
- You would just be rephrasing a previous question

Respond ONLY with a JSON object (no markdown, no code fences):
{ "shouldFollowUp": true, "category": "identity|reason|rule|edge_case", "question": "your follow-up question" }
or
{ "shouldFollowUp": false }`;
}

export function SYNTHESIS_PROMPT(
  actions: CapturedAction[],
  allQA: QuestionAnswer[]
): string {
  const actionSummaries = actions.map((a, i) => ({
    step: i + 1,
    id: a.id,
    app: a.sourceApp,
    action: a.action,
    target: a.actionTarget,
    hasData: !!a.extractedData,
    dataType: a.extractedData?.type ?? null,
    destination: a.destinationService,
    destinationTarget: a.destinationTarget,
  }));

  const qaSummary = allQA.map((qa) => ({
    id: qa.id,
    category: qa.category,
    question: qa.question,
    answer: qa.answer,
  }));

  return `You are MimicAI's Workflow Synthesizer. You have observed a user performing a task and asked them clarifying questions about every step. Now synthesize everything into a structured understanding.

RECORDED ACTIONS (${actions.length} steps):
${JSON.stringify(actionSummaries, null, 2)}

ALL Q&A FROM LEARNING SESSION (${allQA.length} exchanges):
${JSON.stringify(qaSummary, null, 2)}

Analyze the actions and Q&A to extract:

1. RULES — IF/THEN conditional logic the user described or implied.
   Look for: thresholds ("above 1.5"), conditions ("only when..."), exceptions ("except for..."), patterns ("always start at...").

2. EDGE CASES — Unusual situations and how to handle them.
   Look for: "what if" answers, error handling, missing data scenarios, special cases.

3. STEP UNDERSTANDINGS — For each action, synthesize a purpose description and identify conditions.

Respond ONLY with a JSON object (no markdown, no code fences):
{
  "rules": [
    {
      "id": "rule_1",
      "condition": "human-readable condition (e.g., 'absorbance > 1.5')",
      "action": "what to do when condition is true (e.g., 'mark cell red and email supervisor')",
      "source": "Q&A id that generated this rule",
      "confidence": 0.0-1.0
    }
  ],
  "edgeCases": [
    {
      "id": "edge_1",
      "scenario": "description of the unusual situation",
      "response": "what to do in this scenario",
      "source": "Q&A id that generated this"
    }
  ],
  "stepUnderstandings": [
    {
      "actionId": "the action's id",
      "purposeDescription": "human-readable purpose of this step",
      "conditionLogic": "any IF/THEN logic for this step, or empty string",
      "isConditional": false,
      "condition": null,
      "consequences": ["list of downstream effects"]
    }
  ]
}

Be precise. Extract EVERY rule and edge case mentioned in the Q&A. When in doubt about confidence, use 0.7.
If no rules or edge cases were found, return empty arrays — do NOT invent them.`;
}

export function VARIABLE_DETECTION_PROMPT(
  actions: CapturedAction[],
  allQA: QuestionAnswer[],
  rules: LearnedRule[]
): string {
  const actionSummaries = actions.map((a, i) => ({
    step: i + 1,
    app: a.sourceApp,
    action: a.action,
    hasData: !!a.extractedData,
    destination: a.destinationService,
  }));

  const qaSummary = allQA.map((qa) => ({
    category: qa.category,
    question: qa.question,
    answer: qa.answer,
  }));

  const rulesSummary = rules.map((r) => ({
    condition: r.condition,
    action: r.action,
  }));

  return `You are MimicAI's Variable Detector. Given a workflow's actions, the Q&A conversation, and extracted rules, identify values that would CHANGE between runs.

ACTIONS: ${JSON.stringify(actionSummaries)}

Q&A: ${JSON.stringify(qaSummary)}

RULES: ${JSON.stringify(rulesSummary)}

Look for:
- Values the user said "depend on" something or "vary" or "sometimes"
- Thresholds mentioned in rules (they might be configurable)
- Destination targets that follow patterns (like "next empty row")
- Multipliers, factors, or constants the user said could change
- File names, sheet names, or recipients that aren't fixed

For each variable, determine:
- name: descriptive camelCase name
- type: "string" | "number" | "boolean"
- source: "user_input" (user provides each run) | "extracted" (read from screen) | "computed" (calculated)
- default: the value seen in this recording (or null)
- description: what this variable represents

Respond ONLY with a JSON array (no markdown, no code fences):
[
  {
    "name": "variableName",
    "type": "string|number|boolean",
    "source": "user_input|extracted|computed",
    "default": "value or null",
    "description": "what this variable is"
  }
]

If no variables are detected, return an empty array [].`;
}

// ─── Workflow Generation Prompt ─────────────────────────────────────

export function WORKFLOW_GENERATION_PROMPT(
  actions: CapturedAction[],
  allQA: QuestionAnswer[],
  rules: LearnedRule[],
  edgeCases: import("@/types/workflow").EdgeCase[],
  variables: import("@/types/workflow").WorkflowVariable[],
  stepUnderstandings: Array<{
    actionId: string;
    purposeDescription: string;
    conditionLogic: string;
    isConditional: boolean;
    condition: string | null;
    consequences: string[];
  }>
): string {
  const actionSummaries = actions.map((a, i) => ({
    step: i + 1,
    id: a.id,
    app: a.sourceApp,
    action: a.action,
    target: a.actionTarget,
    hasData: !!a.extractedData,
    dataType: a.extractedData?.type ?? null,
    dataFields: a.extractedData ? Object.keys(a.extractedData.values) : [],
    destination: a.destinationService,
    destinationTarget: a.destinationTarget,
  }));

  return `You are MimicAI's Workflow Generator. Convert a learned recording into a structured, executable workflow.

RECORDED ACTIONS (${actions.length} steps):
${JSON.stringify(actionSummaries, null, 2)}

LEARNED RULES:
${JSON.stringify(rules, null, 2)}

EDGE CASES:
${JSON.stringify(edgeCases, null, 2)}

VARIABLES:
${JSON.stringify(variables, null, 2)}

STEP UNDERSTANDINGS:
${JSON.stringify(stepUnderstandings, null, 2)}

Convert this into an executable workflow. For each action, create a WorkflowStep:

Step types:
- "read_screen" — read data from screen using AI Vision (source has no API)
- "write_api" — write data to a service (gmail, sheets, slack) via API
- "transform" — compute/transform data (e.g., multiply by factor, filter rows)
- "decision" — evaluate a condition (IF/THEN from rules)
- "notify" — send notification (email, slack message)

For each step, determine:
1. What type it is based on the action and destination
2. What service it uses (null for screen reads, "gmail"/"sheets"/"slack" for API calls)
3. What parameters it needs (API-specific: to, subject, body for gmail; spreadsheetId, range, values for sheets; channel, text for slack)
4. Whether it's conditional (from rules and step understandings)
5. Data flow: which step provides input, which step receives output

Also determine:
- Which services are required (list of unique services used)
- Whether screen capture is required (true if any step is "read_screen")
- What the source app is (the non-API app being read from screen)

Respond ONLY with a JSON object (no markdown, no code fences):
{
  "steps": [
    {
      "id": "step_1",
      "order": 1,
      "type": "read_screen|write_api|transform|decision|notify",
      "service": "gmail|sheets|slack|null",
      "action": "human-readable action description",
      "parameters": {},
      "purpose": "why this step exists",
      "isConditional": false,
      "condition": null,
      "inputFrom": "step_id or screen or null",
      "outputTo": "step_id or null"
    }
  ],
  "services": ["gmail", "sheets"],
  "requiresScreenCapture": true,
  "sourceApp": "name of the source app or null",
  "suggestedName": "short workflow name",
  "suggestedDescription": "one-line description of what this workflow does"
}`;
}

// ─── Infer Workflow Prompt (analyze all actions in one shot) ────────

export function INFER_WORKFLOW_PROMPT(
  actions: CapturedAction[]
): string {
  const actionSummaries = actions.map((a, i) => ({
    step: i + 1,
    id: a.id,
    app: a.sourceApp,
    action: a.action,
    target: a.actionTarget,
    hasData: !!a.extractedData,
    dataType: a.extractedData?.type ?? null,
    dataFields: a.extractedData ? Object.keys(a.extractedData.values) : [],
    dataValues: a.extractedData?.values ?? null,
    destination: a.destinationService,
    destinationTarget: a.destinationTarget,
    confidence: a.confidence,
  }));

  return `You are MimicAI's Workflow Analyzer. You watched a user perform a task via ${actions.length} screenshots. Analyze the ENTIRE sequence and infer the complete workflow — what they did, why, and the rules behind it.

RECORDED ACTIONS (${actions.length} steps):
${JSON.stringify(actionSummaries, null, 2)}

Analyze this sequence and produce a COMPLETE understanding:

1. **WORKFLOW SUMMARY** — One paragraph describing what the user is doing and why.

2. **STEPS** — Group related actions into logical workflow steps. Multiple screenshots may be one step (e.g., 3 screenshots of scrolling through a spreadsheet = 1 step "Read data from spreadsheet").

3. **RULES** — Infer IF/THEN logic from the data patterns. Look for:
   - Thresholds (values that trigger different behaviors)
   - Filters (rows/items that were skipped)
   - Conditional actions (steps that only happen sometimes)
   - Data transformations (calculations, formatting)

4. **VARIABLES** — Values that would change between runs:
   - User inputs (file names, dates, recipients)
   - Thresholds that might be configurable
   - Destination targets (which sheet, which channel)

5. **EDGE CASES** — What could go wrong and reasonable handling.

6. **CONFIDENCE NOTES** — What are you unsure about? What would you ask the user to clarify?

Respond ONLY with a JSON object (no markdown, no code fences):
{
  "summary": "One paragraph workflow description",
  "steps": [
    {
      "id": "step_1",
      "order": 1,
      "type": "read_screen|write_api|transform|decision|notify",
      "service": "gmail|sheets|slack|null",
      "action": "short action description",
      "purpose": "why this step exists",
      "parameters": {},
      "isConditional": false,
      "condition": null,
      "inputFrom": "step_id|screen|null",
      "outputTo": "step_id|null"
    }
  ],
  "rules": [
    {
      "id": "rule_1",
      "condition": "human-readable condition",
      "action": "what to do when condition is true",
      "confidence": 0.0-1.0
    }
  ],
  "variables": [
    {
      "name": "camelCaseName",
      "type": "string|number|boolean",
      "source": "user_input|extracted|computed",
      "default": null,
      "description": "what this variable represents"
    }
  ],
  "edgeCases": [
    {
      "id": "edge_1",
      "scenario": "what could go wrong",
      "response": "how to handle it"
    }
  ],
  "confidenceNotes": ["Things you're unsure about that the user should verify"],
  "services": ["gmail", "sheets"],
  "requiresScreenCapture": true,
  "sourceApp": "name of source app or null",
  "suggestedName": "short workflow name",
  "suggestedDescription": "one-line description"
}

Be BOLD in your inferences. It's better to guess intelligently and let the user correct you than to ask 30 questions. Think like a smart apprentice who watched carefully and now presents their understanding for review.`;
}

// ─── Execution Prompts ──────────────────────────────────────────────

export function RULE_EVALUATION_PROMPT(
  rules: LearnedRule[],
  currentData: Record<string, unknown>,
  variables: Record<string, unknown>
): string {
  return `You are MimicAI's Rule Evaluator. Given the current data and learned rules, determine which rules apply.

RULES:
${JSON.stringify(rules, null, 2)}

CURRENT DATA:
${JSON.stringify(currentData, null, 2)}

VARIABLE VALUES:
${JSON.stringify(variables, null, 2)}

For each rule, evaluate whether its condition is TRUE given the current data and variables.

Respond ONLY with a JSON object (no markdown, no code fences):
{
  "evaluations": [
    {
      "ruleId": "rule_id",
      "condition": "the rule condition",
      "result": true,
      "reason": "why this rule matched or didn't match",
      "actions": ["list of actions to take if true"]
    }
  ],
  "activeRules": ["ids of rules that evaluated to true"],
  "skipSteps": ["step ids to skip based on conditions"],
  "modifiedParameters": {}
}`;
}
