import * as gmail from "./gmail";
import * as sheets from "./sheets";
import * as slack from "./slack";

export const ServiceNames = {
  GMAIL: "gmail",
  SHEETS: "sheets",
  SLACK: "slack",
} as const;

export type ServiceName = (typeof ServiceNames)[keyof typeof ServiceNames];

export const services = {
  gmail,
  sheets,
  slack,
} as const;

export const SERVICE_DISPLAY: Record<ServiceName, { label: string; icon: string; color: string }> = {
  gmail: { label: "Gmail", icon: "Mail", color: "bg-red-500" },
  sheets: { label: "Google Sheets", icon: "Table", color: "bg-green-500" },
  slack: { label: "Slack", icon: "MessageSquare", color: "bg-purple-500" },
};
