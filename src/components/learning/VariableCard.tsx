"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { WorkflowVariable } from "@/types/workflow";
import { Pencil, Trash2, Check, X, Variable } from "lucide-react";

const SOURCE_LABELS: Record<string, string> = {
  user_input: "User provides",
  extracted: "Read from screen",
  computed: "Calculated",
};

interface VariableCardProps {
  variable: WorkflowVariable;
  onUpdate: (updates: Partial<WorkflowVariable>) => void;
  onDelete: () => void;
}

export function VariableCard({
  variable,
  onUpdate,
  onDelete,
}: VariableCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(variable.name);
  const [description, setDescription] = useState(variable.description);
  const [defaultVal, setDefaultVal] = useState(
    variable.default != null ? String(variable.default) : ""
  );

  const handleSave = () => {
    onUpdate({
      name,
      description,
      default:
        variable.type === "number"
          ? Number(defaultVal)
          : variable.type === "boolean"
            ? defaultVal === "true"
            : defaultVal || null,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setName(variable.name);
    setDescription(variable.description);
    setDefaultVal(variable.default != null ? String(variable.default) : "");
    setIsEditing(false);
  };

  return (
    <Card>
      <CardContent className="p-3">
        {isEditing ? (
          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-sm h-8 font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Description
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-sm h-8"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Default</label>
              <Input
                value={defaultVal}
                onChange={(e) => setDefaultVal(e.target.value)}
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
              <div className="flex items-center gap-1.5">
                <Variable className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-mono text-sm font-medium">
                  {variable.name}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {variable.type}
                </Badge>
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
            <p className="text-xs text-muted-foreground">
              {variable.description}
            </p>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="secondary" className="text-[10px]">
                {SOURCE_LABELS[variable.source] ?? variable.source}
              </Badge>
              {variable.default != null && (
                <span className="text-muted-foreground">
                  Default:{" "}
                  <span className="font-mono">{String(variable.default)}</span>
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
