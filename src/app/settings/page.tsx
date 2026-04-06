"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TokenStatus } from "@/components/shared/TokenStatus";
import { useState } from "react";

const AI_PROVIDERS = [
  {
    id: "gemini",
    name: "Gemini 2.5 Flash",
    description: "Cheapest with great vision — recommended",
    cost: "$0.23/session",
  },
  {
    id: "openai",
    name: "GPT-4o",
    description: "Strong general-purpose model",
    cost: "$1.34/session",
  },
  {
    id: "anthropic",
    name: "Claude Sonnet 4",
    description: "Best reasoning quality",
    cost: "$1.76/session",
  },
] as const;

export default function SettingsPage() {
  const [selectedProvider, setSelectedProvider] = useState("gemini");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage connected services and AI provider preferences.
        </p>
      </div>

      {/* Connected Services */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Services</CardTitle>
          <CardDescription>
            Services connected via Auth0 Token Vault. Your tokens are securely
            managed by Auth0 — we never store them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <TokenStatus service="Gmail" connected={false} />
            <Button variant="outline" size="sm">
              Connect
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <TokenStatus service="Google Sheets" connected={false} />
            <Button variant="outline" size="sm">
              Connect
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <TokenStatus service="Slack" connected={false} />
            <Button variant="outline" size="sm">
              Connect
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Provider */}
      <Card>
        <CardHeader>
          <CardTitle>AI Provider</CardTitle>
          <CardDescription>
            Choose which AI provider processes your screen recordings. You
            provide your own API key.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {AI_PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() => setSelectedProvider(provider.id)}
                className={`flex items-center justify-between rounded-lg border p-4 text-left transition-colors ${
                  selectedProvider === provider.id
                    ? "border-primary bg-primary/5"
                    : "hover:bg-accent"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{provider.name}</span>
                    {provider.id === "gemini" && (
                      <Badge variant="secondary" className="text-xs">
                        Recommended
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {provider.description}
                  </p>
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  {provider.cost}
                </span>
              </button>
            ))}
          </div>

          <Separator />

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="api-key">
              API Key
            </label>
            <Input
              id="api-key"
              type="password"
              placeholder={`Enter your ${AI_PROVIDERS.find((p) => p.id === selectedProvider)?.name} API key`}
            />
            <p className="text-xs text-muted-foreground">
              Your API key is encrypted in your session and never stored in our
              database.
            </p>
          </div>

          <Button>Save Provider Settings</Button>
        </CardContent>
      </Card>
    </div>
    </div>
  );
}
