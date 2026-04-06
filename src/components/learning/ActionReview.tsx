"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CapturedAction } from "@/types/action";
import {
  Monitor,
  MousePointerClick,
  Type,
  ArrowRightLeft,
  Table,
  Hash,
  FileText,
  FormInput,
} from "lucide-react";

const ACTION_ICONS: Record<string, React.ReactNode> = {
  read_data: <Monitor className="h-4 w-4" />,
  click_button: <MousePointerClick className="h-4 w-4" />,
  type_value: <Type className="h-4 w-4" />,
  switch_app: <ArrowRightLeft className="h-4 w-4" />,
};

const DATA_TYPE_ICONS: Record<string, React.ReactNode> = {
  table: <Table className="h-3 w-3" />,
  single_value: <Hash className="h-3 w-3" />,
  text_block: <FileText className="h-3 w-3" />,
  form_fields: <FormInput className="h-3 w-3" />,
};

interface ActionReviewProps {
  action: CapturedAction;
  actionIndex: number;
  totalActions: number;
  screenshotFilename: string | null;
}

export function ActionReview({
  action,
  actionIndex,
  totalActions,
  screenshotFilename,
}: ActionReviewProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Step {actionIndex + 1} of {totalActions}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {Math.round(action.confidence * 100)}% confidence
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Screenshot */}
          {screenshotFilename && (
            <div className="rounded-md border overflow-hidden bg-muted/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/screenshots/${screenshotFilename}`}
                alt={`Screenshot for step ${actionIndex + 1}`}
                className="w-full h-auto max-h-48 object-contain"
              />
            </div>
          )}

          {/* Action details */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              {ACTION_ICONS[action.action] ?? <Monitor className="h-4 w-4" />}
              <span className="font-medium">{action.sourceApp}</span>
              <Badge variant="secondary" className="text-[10px]">
                {action.action.replace(/_/g, " ")}
              </Badge>
            </div>

            {action.actionTarget && (
              <div className="text-muted-foreground">
                Target: <span className="text-foreground">{action.actionTarget}</span>
              </div>
            )}

            {action.destinationService && (
              <div className="text-muted-foreground">
                Destination:{" "}
                <span className="text-foreground">
                  {action.destinationService}
                  {action.destinationTarget && ` / ${action.destinationTarget}`}
                </span>
              </div>
            )}

            {action.extractedData && (
              <div className="mt-2 rounded border bg-muted/30 p-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  {DATA_TYPE_ICONS[action.extractedData.type]}
                  Extracted {action.extractedData.type.replace(/_/g, " ")}
                </div>
                <div className="space-y-0.5">
                  {Object.entries(action.extractedData.values)
                    .slice(0, 4)
                    .map(([key, val]) => (
                      <div key={key} className="text-xs">
                        <span className="text-muted-foreground">{key}:</span>{" "}
                        <span className="font-mono">
                          {typeof val === "object" ? JSON.stringify(val) : String(val)}
                        </span>
                      </div>
                    ))}
                  {Object.keys(action.extractedData.values).length > 4 && (
                    <div className="text-xs text-muted-foreground">
                      +{Object.keys(action.extractedData.values).length - 4} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
