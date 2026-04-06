"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { CapturedAction } from "@/types/action";
import {
  Eye,
  MousePointer,
  Keyboard,
  ArrowRightLeft,
  HelpCircle,
  Layers,
  Table,
  Type,
  FileText,
  FormInput,
  Circle,
} from "lucide-react";

interface ActionTimelineProps {
  actions: CapturedAction[];
  isRecording: boolean;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  read_data: <Eye className="h-4 w-4" />,
  click_button: <MousePointer className="h-4 w-4" />,
  type_value: <Keyboard className="h-4 w-4" />,
  switch_app: <ArrowRightLeft className="h-4 w-4" />,
  scroll: <Layers className="h-4 w-4" />,
  select: <MousePointer className="h-4 w-4" />,
  copy: <FileText className="h-4 w-4" />,
  paste: <FileText className="h-4 w-4" />,
  screen_capture: <Eye className="h-4 w-4" />,
};

const DATA_TYPE_ICONS: Record<string, React.ReactNode> = {
  table: <Table className="h-3.5 w-3.5" />,
  single_value: <Type className="h-3.5 w-3.5" />,
  text_block: <FileText className="h-3.5 w-3.5" />,
  form_fields: <FormInput className="h-3.5 w-3.5" />,
};

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence * 100);
  const variant =
    confidence >= 0.8
      ? "default"
      : confidence >= 0.5
        ? "secondary"
        : "destructive";
  return (
    <Badge variant={variant} className="text-xs">
      {percent}%
    </Badge>
  );
}

function ExtractedDataPreview({ data }: { data: CapturedAction["extractedData"] }) {
  if (!data) return null;

  const entries = Object.entries(data.values).slice(0, 4);
  const hasMore = Object.keys(data.values).length > 4;

  return (
    <div className="mt-2 rounded-md border bg-muted/50 p-2">
      <div className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
        {DATA_TYPE_ICONS[data.type] || <FileText className="h-3.5 w-3.5" />}
        <span>Extracted Data ({data.type})</span>
      </div>
      <div className="space-y-0.5 text-xs">
        {entries.map(([key, value]) => (
          <div key={key} className="flex justify-between gap-2">
            <span className="text-muted-foreground">{key}:</span>
            <span className="font-mono">
              {typeof value === "object"
                ? JSON.stringify(value).slice(0, 50)
                : String(value).slice(0, 50)}
            </span>
          </div>
        ))}
        {hasMore && (
          <span className="text-muted-foreground">
            +{Object.keys(data.values).length - 4} more fields...
          </span>
        )}
      </div>
    </div>
  );
}

function ActionItem({ action }: { action: CapturedAction }) {
  return (
    <div className="flex gap-3 py-3">
      {/* Timeline dot & line */}
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-background">
          {ACTION_ICONS[action.action] || <Eye className="h-4 w-4" />}
        </div>
        <div className="w-px flex-1 bg-border" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {action.sourceApp}
              </span>
              <Badge variant="outline" className="text-xs">
                {action.action.replace(/_/g, " ")}
              </Badge>
              {action.needsClarification && (
                <HelpCircle className="h-4 w-4 text-amber-500" />
              )}
            </div>
            {action.actionTarget && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Target: {action.actionTarget}
              </p>
            )}
            {action.destinationService && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                → {action.destinationService}
                {action.destinationTarget && `: ${action.destinationTarget}`}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ConfidenceBadge confidence={action.confidence} />
            <span className="text-xs text-muted-foreground">
              {formatTime(action.timestamp)}
            </span>
          </div>
        </div>

        <ExtractedDataPreview data={action.extractedData} />
      </div>
    </div>
  );
}

export function ActionTimeline({ actions, isRecording }: ActionTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Action Timeline</CardTitle>
            <CardDescription>
              {actions.length === 0
                ? "Actions will appear here as the AI interprets your screen."
                : `${actions.length} action${actions.length !== 1 ? "s" : ""} captured`}
            </CardDescription>
          </div>
          {actions.length > 0 && (
            <Badge variant="secondary">{actions.length}</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {actions.length === 0 && !isRecording && (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            Start recording to see actions here.
          </div>
        )}

        {actions.length === 0 && isRecording && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Waiting for first frame to be processed...
            </p>
          </div>
        )}

        <div className="max-h-[500px] overflow-y-auto">
          {/* Render in reverse chronological order (newest first) */}
          {[...actions].reverse().map((action) => (
            <ActionItem key={action.id} action={action} />
          ))}
        </div>

        {/* Live indicator */}
        {isRecording && actions.length > 0 && (
          <div className="flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
            <Circle className="h-2 w-2 animate-pulse fill-red-500 text-red-500" />
            Listening for new actions...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
