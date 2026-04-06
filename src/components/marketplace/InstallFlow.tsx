"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ServiceBadge } from "@/components/shared/ServiceBadge";
import {
  Download,
  Trash2,
  Loader2,
  CheckCircle2,
  Circle,
  Shield,
  ExternalLink,
} from "lucide-react";

interface InstallFlowProps {
  workflowId: string;
  workflowName: string;
  requiredServices: string[];
  price: number;
  creatorId: string;
  installation: {
    id: string;
    isActive: boolean;
    connectedServices: string[];
    lastRunAt: string | null;
  } | null;
  userId: string | null;
}

export function InstallFlow({
  workflowId,
  workflowName,
  requiredServices,
  price,
  creatorId,
  installation,
  userId,
}: InstallFlowProps) {
  const router = useRouter();
  const [isInstalling, setIsInstalling] = useState(false);
  const [isUninstalling, setIsUninstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track which services the user has "connected" (simulated for demo)
  const [connectedServices, setConnectedServices] = useState<string[]>(
    installation?.connectedServices ?? []
  );

  const isInstalled = installation?.isActive === true;
  const isOwner = userId === creatorId;
  const allServicesConnected = requiredServices.every((s) =>
    connectedServices.includes(s)
  );

  async function handleConnect(service: string) {
    // In production: trigger Auth0 Token Vault consent flow
    // auth0.getAccessTokenForConnection(connection)
    // For demo: simulate connection
    setConnectedServices((prev) => [...prev, service]);
  }

  async function handleInstall() {
    if (!userId) return;
    setIsInstalling(true);
    setError(null);

    try {
      const res = await fetch(`/api/marketplace/${workflowId}/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, connectedServices }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Install failed");
      }

      router.refresh();
      // Force a re-fetch by navigating to the same page
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Install failed");
    } finally {
      setIsInstalling(false);
    }
  }

  async function handleUninstall() {
    if (!userId) return;
    if (!confirm(`Uninstall "${workflowName}"? Your execution history will be preserved.`))
      return;

    setIsUninstalling(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/marketplace/${workflowId}/install?userId=${userId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Uninstall failed");
      }

      router.refresh();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Uninstall failed");
    } finally {
      setIsUninstalling(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          {isInstalled ? "Installed" : "Install Automation"}
        </CardTitle>
        <CardDescription className="text-xs">
          {isInstalled
            ? "This automation is active on your account."
            : "Connect your services to install this automation."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Price */}
        {price > 0 && !isInstalled && (
          <div className="flex items-center justify-between p-2 rounded-md bg-amber-50 border border-amber-200">
            <span className="text-sm font-medium">Price</span>
            <span className="text-lg font-bold text-amber-800">
              ${price.toFixed(2)}
            </span>
          </div>
        )}

        {/* Required Services */}
        {requiredServices.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Required Services
            </p>
            <div className="space-y-2">
              {requiredServices.map((service) => {
                const isConnected = connectedServices.includes(service);
                return (
                  <div
                    key={service}
                    className="flex items-center justify-between p-2 rounded-md border"
                  >
                    <div className="flex items-center gap-2">
                      {isConnected ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <ServiceBadge service={service} />
                    </div>
                    {!isConnected && !isInstalled && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConnect(service)}
                        className="h-7 text-xs"
                      >
                        <ExternalLink className="mr-1 h-3 w-3" />
                        Connect
                      </Button>
                    )}
                    {isConnected && (
                      <Badge
                        variant="outline"
                        className="text-green-700 border-green-300 text-xs"
                      >
                        Connected
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Token Vault notice */}
        <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            Your credentials are stored securely in Auth0 Token Vault. The
            automation creator never has access to your tokens.
          </span>
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-destructive text-center">{error}</p>
        )}

        {/* Actions */}
        {!userId ? (
          <Button className="w-full" disabled>
            Sign in to install
          </Button>
        ) : isOwner ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            You created this automation. Manage it from{" "}
            <a href={`/workflows/${workflowId}`} className="underline">
              My Workflows
            </a>
            .
          </p>
        ) : isInstalled ? (
          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={() => router.push(`/workflows/${workflowId}`)}
            >
              Open Workflow
            </Button>
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              onClick={handleUninstall}
              disabled={isUninstalling}
            >
              {isUninstalling ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              )}
              Uninstall
            </Button>
            {installation?.lastRunAt && (
              <p className="text-xs text-muted-foreground text-center">
                Last run:{" "}
                {new Date(installation.lastRunAt).toLocaleDateString()}
              </p>
            )}
          </div>
        ) : (
          <Button
            className="w-full"
            onClick={handleInstall}
            disabled={
              isInstalling ||
              (requiredServices.length > 0 && !allServicesConnected)
            }
          >
            {isInstalling ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-3.5 w-3.5" />
            )}
            {price > 0 ? `Install — $${price.toFixed(2)}` : "Install — Free"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
