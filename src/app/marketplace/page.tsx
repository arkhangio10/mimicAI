"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AutomationCard } from "@/components/marketplace/AutomationCard";
import { Search, SlidersHorizontal, Store } from "lucide-react";

interface MarketplaceListing {
  id: string;
  workflowId: string;
  name: string;
  description: string;
  creatorName: string;
  creatorId: string;
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
}

const SORT_OPTIONS = [
  { value: "popular", label: "Most Popular" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
] as const;

const SERVICE_FILTERS = [
  { value: "gmail", label: "Gmail" },
  { value: "sheets", label: "Sheets" },
  { value: "slack", label: "Slack" },
] as const;

export default function MarketplacePage() {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("popular");
  const [serviceFilter, setServiceFilter] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ sort });
      if (search.trim()) params.set("search", search.trim());
      if (serviceFilter) params.set("service", serviceFilter);

      const res = await fetch(`/api/marketplace?${params}`);
      if (!res.ok) throw new Error("Failed to fetch listings");
      const data = await res.json();
      setListings(data.listings ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  }, [search, sort, serviceFilter]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
        <p className="text-muted-foreground">
          Browse automations created by the community. Install and run them on
          your own connected accounts.
        </p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search automations..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />

          {/* Service filter */}
          {SERVICE_FILTERS.map((sf) => (
            <Button
              key={sf.value}
              variant={serviceFilter === sf.value ? "default" : "outline"}
              size="sm"
              onClick={() =>
                setServiceFilter(
                  serviceFilter === sf.value ? null : sf.value
                )
              }
              className="h-7 text-xs"
            >
              {sf.label}
            </Button>
          ))}

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-7 rounded-md border bg-background px-2 text-xs"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active filter badges */}
      {(serviceFilter || search) && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Filters:</span>
          {serviceFilter && (
            <Badge
              variant="secondary"
              className="cursor-pointer"
              onClick={() => setServiceFilter(null)}
            >
              {serviceFilter} &times;
            </Badge>
          )}
          {search && (
            <Badge
              variant="secondary"
              className="cursor-pointer"
              onClick={() => {
                setSearch("");
                setSearchInput("");
              }}
            >
              &quot;{search}&quot; &times;
            </Badge>
          )}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full mt-1" />
              </CardHeader>
              <CardContent>
                <div className="flex gap-1.5 mb-3">
                  <Skeleton className="h-5 w-14" />
                  <Skeleton className="h-5 w-14" />
                </div>
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Results count */}
      {!isLoading && !error && listings.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {listings.length} automation{listings.length !== 1 ? "s" : ""} found
        </p>
      )}

      {/* Listings Grid */}
      {!isLoading && !error && listings.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <AutomationCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && listings.length === 0 && (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Store className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-base">
              {search || serviceFilter
                ? "No matching automations"
                : "No automations published yet"}
            </CardTitle>
            <CardDescription>
              {search || serviceFilter
                ? "Try adjusting your search or filters."
                : "Be the first to publish! Record a workflow, teach MimicAI your process, and share it with the community."}
            </CardDescription>
          </CardHeader>
          {(search || serviceFilter) && (
            <CardContent className="text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setSearchInput("");
                  setServiceFilter(null);
                }}
              >
                Clear filters
              </Button>
            </CardContent>
          )}
        </Card>
      )}
    </div>
    </div>
  );
}
