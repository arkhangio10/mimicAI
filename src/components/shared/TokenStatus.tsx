"use client";

import { Badge } from "@/components/ui/badge";

interface TokenStatusProps {
  service: string;
  connected: boolean;
}

export function TokenStatus({ service, connected }: TokenStatusProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-2 w-2 rounded-full ${
          connected ? "bg-green-500" : "bg-gray-300"
        }`}
      />
      <span className="text-sm capitalize">{service}</span>
      {connected ? (
        <Badge variant="secondary" className="text-xs">Connected</Badge>
      ) : (
        <Badge variant="outline" className="text-xs">Not connected</Badge>
      )}
    </div>
  );
}
