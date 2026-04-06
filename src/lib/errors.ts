export class TokenVaultError extends Error {
  code = "TOKEN_VAULT_ERROR" as const;

  constructor(message: string) {
    super(message);
    this.name = "TokenVaultError";
  }
}

export class ServiceError extends Error {
  code = "SERVICE_ERROR" as const;
  service: string;

  constructor(service: string, message: string) {
    super(message);
    this.name = "ServiceError";
    this.service = service;
  }
}

export class InterpretationError extends Error {
  code = "INTERPRETATION_ERROR" as const;

  constructor(message: string) {
    super(message);
    this.name = "InterpretationError";
  }
}

export class AIProviderError extends Error {
  code = "AI_PROVIDER_ERROR" as const;
  provider: string;

  constructor(provider: string, message: string) {
    super(message);
    this.name = "AIProviderError";
    this.provider = provider;
  }
}

export class LearningError extends Error {
  code = "LEARNING_ERROR" as const;

  constructor(message: string) {
    super(message);
    this.name = "LearningError";
  }
}

export class ExecutionError extends Error {
  code = "EXECUTION_ERROR" as const;
  stepId: string | null;

  constructor(message: string, stepId?: string) {
    super(message);
    this.name = "ExecutionError";
    this.stepId = stepId ?? null;
  }
}
