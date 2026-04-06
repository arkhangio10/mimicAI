"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ServiceBadge } from "@/components/shared/ServiceBadge";
import { InstallFlow } from "@/components/marketplace/InstallFlow";
import {
  ArrowLeft,
  Monitor,
  User,
  Download,
  Clock,
  Play,
  GitBranch,
  AlertTriangle,
  Variable,
  ArrowRight,
} from "lucide-react";

interface StepPreview {
  order: number;
  type: string;
  purpose: string;
  service: string | null;
  isConditional: boolean;
}

interface RulePreview {
  condition: string;
  action: string;
  confidence: number;
}

interface EdgeCasePreview {
  scenario: string;
  response: string;
}

interface VariablePreview {
  name: string;
  type: string;
  source: string;
  description: string;
  default: unknown;
}

interface ListingDetail {
  id: string;
  name: string;
  description: string;
  creator: { id: string; name: string; avatar: string | null };
  services: string[];
  requiresScreenCapture: boolean;
  sourceApp: string | null;
  triggerType: string;
  price: number;
  installCount: number;
  createdAt: string;
  steps: StepPreview[];
  rules: RulePreview[];
  edgeCases: EdgeCasePreview[];
  variables: VariablePreview[];
  installation: {
    id: string;
    isActive: boolean;
    connectedServices: string[];
    lastRunAt: string | null;
  } | null;
}

const STEP_TYPE_COLORS: Record<string, string> = {
  read_screen: "bg-blue-100 text-blue-700",
  write_api: "bg-green-100 text-green-700",
  transform: "bg-amber-100 text-amber-700",
  decision: "bg-purple-100 text-purple-700",
  notify: "bg-red-100 text-red-700",
};

// TODO: Replace with actual auth — using a hardcoded dev userId for demo
const DEV_USER_ID = "demo-buyer";

export default function MarketplaceDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchListing() {
      try {
        const res = await fetch(
          `/api/marketplace/${id}?userId=${DEV_USER_ID}`
        );
        if (!res.ok) {
          if (res.status === 404) throw new Error("Automation not found");
          throw new Error("Failed to fetch automation");
        }
        const data = await res.json();
        setListing(data.listing);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setIsLoading(false);
      }
    }
    if (id) fetchListing();
  }, [id]);

  // Loading
  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Skeleton className="h-96" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
      </div>
    );
  }

  // Error / Not found
  if (error || !listing) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-destructive mb-4">
            {error ?? "Automation not found"}
          </p>
          <Link href="/marketplace">
            <Button variant="outline">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back to Marketplace
            </Button>
          </Link>
        </CardContent>
      </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Link href="/marketplace">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{listing.name}</h1>
          {listing.price > 0 ? (
            <Badge className="bg-amber-100 text-amber-800">
              ${listing.price.toFixed(2)}
            </Badge>
          ) : (
            <Badge variant="secondary">Free</Badge>
          )}
        </div>
        {listing.description && (
          <p className="text-muted-foreground ml-12">{listing.description}</p>
        )}
      </div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-2 ml-12">
        {listing.services.map((s) => (
          <ServiceBadge key={s} service={s} />
        ))}
        {listing.requiresScreenCapture && (
          <Badge variant="outline" className="bg-blue-100 text-blue-700">
            <Monitor className="mr-1 h-3 w-3" />
            Screen Capture
          </Badge>
        )}
        {listing.sourceApp && (
          <Badge variant="outline">{listing.sourceApp}</Badge>
        )}
        <Badge variant="outline" className="capitalize">
          {listing.triggerType}
        </Badge>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          by {listing.creator.name}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Download className="h-3 w-3" />
          {listing.installCount} installs
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {new Date(listing.createdAt).toLocaleDateString()}
        </span>
      </div>

      {/* Main layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Details */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="steps">
            <TabsList>
              <TabsTrigger value="steps">
                Steps ({listing.steps.length})
              </TabsTrigger>
              <TabsTrigger value="rules">
                Rules ({listing.rules.length})
              </TabsTrigger>
              <TabsTrigger value="variables">
                Variables ({listing.variables.length})
              </TabsTrigger>
            </TabsList>

            {/* Steps tab */}
            <TabsContent value="steps" className="mt-4 space-y-2">
              {listing.steps.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    No steps defined.
                  </CardContent>
                </Card>
              ) : (
                listing.steps.map((step, idx) => (
                  <Card key={idx}>
                    <CardContent className="flex items-center gap-3 py-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium shrink-0">
                        {step.order ?? idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge
                            variant="outline"
                            className={
                              STEP_TYPE_COLORS[step.type] ?? ""
                            }
                          >
                            {step.type.replace("_", " ")}
                          </Badge>
                          {step.service && (
                            <ServiceBadge service={step.service} />
                          )}
                          {step.isConditional && (
                            <Badge
                              variant="outline"
                              className="text-amber-700 border-amber-300"
                            >
                              conditional
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm">{step.purpose}</p>
                      </div>
                      {idx < listing.steps.length - 1 && (
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Rules tab — transparency for buyers */}
            <TabsContent value="rules" className="mt-4 space-y-2">
              {listing.rules.length === 0 && listing.edgeCases.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    No conditional rules. This automation runs the same way
                    every time.
                  </CardContent>
                </Card>
              ) : (
                <>
                  {listing.rules.map((rule, idx) => (
                    <Card key={`rule-${idx}`}>
                      <CardContent className="py-3">
                        <div className="flex items-start gap-3">
                          <GitBranch className="h-4 w-4 mt-0.5 text-purple-600 shrink-0" />
                          <div>
                            <p className="text-sm">
                              <span className="font-medium text-purple-700">
                                IF
                              </span>{" "}
                              {rule.condition}{" "}
                              <span className="font-medium text-purple-700">
                                THEN
                              </span>{" "}
                              {rule.action}
                            </p>
                            {rule.confidence < 0.8 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Confidence: {Math.round(rule.confidence * 100)}%
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {listing.edgeCases.length > 0 && (
                    <>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">
                        Edge Cases
                      </p>
                      {listing.edgeCases.map((edge, idx) => (
                        <Card key={`edge-${idx}`}>
                          <CardContent className="py-3">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
                              <div>
                                <p className="text-sm">
                                  <span className="font-medium text-amber-700">
                                    WHEN
                                  </span>{" "}
                                  {edge.scenario}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  <span className="font-medium">THEN</span>{" "}
                                  {edge.response}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </>
                  )}
                </>
              )}
            </TabsContent>

            {/* Variables tab */}
            <TabsContent value="variables" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Required Inputs
                  </CardTitle>
                  <CardDescription className="text-xs">
                    You&apos;ll provide these values each time you run the
                    automation.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {listing.variables.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No variable inputs needed. This automation runs without
                      any configuration.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {listing.variables.map((v) => (
                        <div
                          key={v.name}
                          className="rounded-md border p-3 space-y-1"
                        >
                          <div className="flex items-center gap-2">
                            <Variable className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium font-mono">
                              {v.name}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {v.type}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {v.source}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {v.description}
                          </p>
                          {v.default != null && (
                            <p className="text-xs">
                              Default:{" "}
                              <code className="bg-muted px-1 rounded">
                                {String(v.default)}
                              </code>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Install panel */}
        <div className="space-y-4">
          <InstallFlow
            workflowId={listing.id}
            workflowName={listing.name}
            requiredServices={listing.services}
            price={listing.price}
            creatorId={listing.creator.id}
            installation={listing.installation ?? null}
            userId={DEV_USER_ID}
          />

          {/* Quick stats card */}
          <Card>
            <CardContent className="py-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Steps</span>
                <span className="font-medium flex items-center gap-1">
                  <Play className="h-3 w-3" />
                  {listing.steps.length}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Rules</span>
                <span className="font-medium flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  {listing.rules.length}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Edge Cases</span>
                <span className="font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {listing.edgeCases.length}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Variables</span>
                <span className="font-medium flex items-center gap-1">
                  <Variable className="h-3 w-3" />
                  {listing.variables.length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </div>
  );
}
