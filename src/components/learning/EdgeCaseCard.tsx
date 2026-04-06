"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EdgeCase } from "@/types/workflow";
import { Pencil, Trash2, Check, X } from "lucide-react";

interface EdgeCaseCardProps {
  edgeCase: EdgeCase;
  onUpdate: (updates: Partial<EdgeCase>) => void;
  onDelete: () => void;
}

export function EdgeCaseCard({
  edgeCase,
  onUpdate,
  onDelete,
}: EdgeCaseCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [scenario, setScenario] = useState(edgeCase.scenario);
  const [response, setResponse] = useState(edgeCase.response);

  const handleSave = () => {
    onUpdate({ scenario, response });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setScenario(edgeCase.scenario);
    setResponse(edgeCase.response);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardContent className="p-3">
        {isEditing ? (
          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">WHEN</label>
              <Input
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                className="text-sm h-8"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">THEN</label>
              <Input
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                className="text-sm h-8"
              />
            </div>
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="h-3 w-3" />
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Check className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm">
                <span className="font-mono text-xs text-muted-foreground">
                  WHEN{" "}
                </span>
                <span>{edgeCase.scenario}</span>
              </div>
              <div className="flex shrink-0 gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="text-sm">
              <span className="font-mono text-xs text-muted-foreground">
                THEN{" "}
              </span>
              <span>{edgeCase.response}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
