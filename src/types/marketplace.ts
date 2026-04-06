export interface MarketplaceListing {
  id: string;
  workflowId: string;
  name: string;
  description: string;
  creatorName: string;
  creatorAvatar: string | null;
  services: string[];
  stepCount: number;
  ruleCount: number;
  requiresScreenCapture: boolean;
  sourceApp: string | null;
  price: number;
  installCount: number;
  createdAt: string;
}

export interface InstallationStatus {
  id: string;
  workflowId: string;
  workflowName: string;
  connectedServices: string[];
  requiredServices: string[];
  isActive: boolean;
  lastRunAt: string | null;
}
