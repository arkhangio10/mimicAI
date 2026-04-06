import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SERVICE_CONFIG: Record<string, { label: string; className: string }> = {
  gmail: { label: "Gmail", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  sheets: { label: "Sheets", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  slack: { label: "Slack", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
};

interface ServiceBadgeProps {
  service: string;
  className?: string;
}

export function ServiceBadge({ service, className }: ServiceBadgeProps) {
  const config = SERVICE_CONFIG[service] ?? {
    label: service,
    className: "bg-gray-100 text-gray-800",
  };

  return (
    <Badge variant="secondary" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
