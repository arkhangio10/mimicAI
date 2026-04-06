"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RuleCard } from "./RuleCard";
import { EdgeCaseCard } from "./EdgeCaseCard";
import { VariableCard } from "./VariableCard";
import type { LearnedStep } from "@/types/action";
import type { LearnedRule, EdgeCase, WorkflowVariable } from "@/types/workflow";
import {
  GitBranch,
  AlertTriangle,
  Variable,
  List,
  CheckCircle,
} from "lucide-react";

interface UnderstandingPanelProps {
  rules: LearnedRule[];
  edgeCases: EdgeCase[];
  variables: WorkflowVariable[];
  learnedSteps: LearnedStep[];
  onUpdateRule: (ruleId: string, updates: Partial<LearnedRule>) => void;
  onDeleteRule: (ruleId: string) => void;
  onUpdateEdgeCase: (id: string, updates: Partial<EdgeCase>) => void;
  onDeleteEdgeCase: (id: string) => void;
  onUpdateVariable: (name: string, updates: Partial<WorkflowVariable>) => void;
  onDeleteVariable: (name: string) => void;
  onFinalize: () => void;
  isLoading: boolean;
}

export function UnderstandingPanel({
  rules,
  edgeCases,
  variables,
  learnedSteps,
  onUpdateRule,
  onDeleteRule,
  onUpdateEdgeCase,
  onDeleteEdgeCase,
  onUpdateVariable,
  onDeleteVariable,
  onFinalize,
  isLoading,
}: UnderstandingPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Learned Understanding
        </CardTitle>
        <CardDescription>
          Review what MimicAI learned from your recording. Edit or remove
          anything that looks wrong before finalizing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="rules">
          <TabsList>
            <TabsTrigger value="rules">
              <GitBranch className="mr-1 h-3 w-3" />
              Rules
              <Badge variant="secondary" className="ml-1 text-[10px] px-1">
                {rules.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="edge-cases">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Edge Cases
              <Badge variant="secondary" className="ml-1 text-[10px] px-1">
                {edgeCases.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="variables">
              <Variable className="mr-1 h-3 w-3" />
              Variables
              <Badge variant="secondary" className="ml-1 text-[10px] px-1">
                {variables.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="steps">
              <List className="mr-1 h-3 w-3" />
              Steps
              <Badge variant="secondary" className="ml-1 text-[10px] px-1">
                {learnedSteps.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="mt-4">
            {rules.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No rules extracted. This means the workflow is a simple linear
                sequence.
              </p>
            ) : (
              <div className="space-y-2">
                {rules.map((rule) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    onUpdate={(updates) => onUpdateRule(rule.id, updates)}
                    onDelete={() => onDeleteRule(rule.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="edge-cases" className="mt-4">
            {edgeCases.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No edge cases identified. Consider adding some manually.
              </p>
            ) : (
              <div className="space-y-2">
                {edgeCases.map((ec) => (
                  <EdgeCaseCard
                    key={ec.id}
                    edgeCase={ec}
                    onUpdate={(updates) => onUpdateEdgeCase(ec.id, updates)}
                    onDelete={() => onDeleteEdgeCase(ec.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="variables" className="mt-4">
            {variables.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No variable values detected. All values appear to be fixed.
              </p>
            ) : (
              <div className="space-y-2">
                {variables.map((v) => (
                  <VariableCard
                    key={v.name}
                    variable={v}
                    onUpdate={(updates) => onUpdateVariable(v.name, updates)}
                    onDelete={() => onDeleteVariable(v.name)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="steps" className="mt-4">
            <div className="space-y-3">
              {learnedSteps.map((step, i) => (
                <div
                  key={step.id}
                  className="flex gap-3 items-start text-sm border rounded-lg p-3"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
                    {i + 1}
                  </div>
                  <div className="space-y-1 min-w-0">
                    <p className="font-medium">
                      {step.understanding.purposeDescription}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-[10px]">
                        {step.observation.sourceApp}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {step.observation.action.replace(/_/g, " ")}
                      </Badge>
                      {step.understanding.isConditional && (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-amber-700 border-amber-200 bg-amber-50"
                        >
                          Conditional
                        </Badge>
                      )}
                    </div>
                    {step.understanding.conditionLogic && (
                      <p className="text-xs text-muted-foreground font-mono">
                        {step.understanding.conditionLogic}
                      </p>
                    )}
                    {step.reasoning.questions.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {step.reasoning.questions.length} question
                        {step.reasoning.questions.length !== 1 ? "s" : ""}{" "}
                        answered
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end">
          <Button onClick={onFinalize} disabled={isLoading}>
            {isLoading ? "Finalizing..." : "Finalize Workflow"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
