"use client";

import Link from "next/link";
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
  Monitor,
  Play,
  GitBranch,
  Download,
  User,
  CheckCircle2,
} from "lucide-react";

export interface AutomationCardProps {
  listing: {
    id: string;
    name: string;
    description: string;
    creatorName: string;
    creatorAvatar: string | null;
    services: string[];
    stepCount: number;
    ruleCount: number;
    requiresScreenCapture: boolean;
    sourceApp: string | null;
    price: number;
    installCount: number;
    createdAt: string;
    installed?: boolean;
  };
}

export function AutomationCard({ listing }: AutomationCardProps) {
  return (
    <Link href={`/marketplace/${listing.id}`}>
      <Card className="transition-all hover:border-primary/30 hover:shadow-md cursor-pointer h-full flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">
                {listing.name}
              </CardTitle>
              {listing.description && (
                <CardDescription className="line-clamp-2 mt-1">
                  {listing.description}
                </CardDescription>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              {listing.price > 0 ? (
                <Badge className="bg-amber-100 text-amber-800">
                  ${listing.price.toFixed(2)}
                </Badge>
              ) : (
                <Badge variant="secondary">Free</Badge>
              )}
              {listing.installed && (
                <Badge
                  variant="outline"
                  className="text-green-700 border-green-300"
                >
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Installed
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between">
          {/* Services */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {listing.services.map((s) => (
              <ServiceBadge key={s} service={s} />
            ))}
            {listing.requiresScreenCapture && (
              <Badge variant="outline" className="bg-blue-100 text-blue-700">
                <Monitor className="mr-1 h-3 w-3" />
                Screen
              </Badge>
            )}
            {listing.sourceApp && (
              <Badge variant="outline">{listing.sourceApp}</Badge>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Play className="h-3 w-3" />
              {listing.stepCount} steps
            </span>
            {listing.ruleCount > 0 && (
              <span className="flex items-center gap-1">
                <GitBranch className="h-3 w-3" />
                {listing.ruleCount} rules
              </span>
            )}
            <span className="flex items-center gap-1">
              <Download className="h-3 w-3" />
              {listing.installCount}
            </span>
          </div>

          {/* Creator */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>by {listing.creatorName}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
