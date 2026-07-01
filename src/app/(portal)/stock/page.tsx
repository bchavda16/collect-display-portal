"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, Package } from "lucide-react";
import { ProductCard } from "@/components/portal/ProductCard";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn, buildQueryString } from "@/lib/utils";
import type { ApiResponse, PaginatedResponse, ProductWithBrand } from "@/types";
import { useDebounce } from "@/hooks/useDebounce";

const BRAND_FILTERS = [
  { value: "", label: "All Brands" },
  { value: "pop-mart", label: "Pop Mart" },
  { value: "mighty-jaxx", label: "Mighty Jaxx" },
  { value: "funko", label: "Funko" },
];

const TYPE_FILTERS = [
  { value: "", label: "All Types" },
  { value: "BLIND_BOX", label: "Blind Box" },
  { value: "VINYL_FIGURE", label: "Vinyl Figure" },
  { value: "PLUSH", label: "Plush" },
  { value: "ACCESSORIES", label: "Accessories" },
];

export default function StockPage() {
  const [search, setSearch] = useState("");
  const [brandId, setBrandId] = useState("");
  const [type, setType] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["products", debouncedSearch, brandId, type, inStockOnly, page],
    queryFn: async () => {
      const qs = buildQueryString({
        search: debouncedSearch || undefined,
        brandId: brandId || undefined,
        type: type || undefined,
        inStock: inStockOnly || undefined,
        page,
        limit: 24,
      });
      const res = await fetch(`/api/products${qs}`);
      const json: ApiResponse<PaginatedResponse<ProductWithBrand>> = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data!;
    },
  });

  const resetFilters = useCallback(() => {
    setSearch("");
    setBrandId("");
    setType("");
    setInStockOnly(false);
    setPage(1);
  }, []);

  const hasFilters = search || brandId || type || inStockOnly;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border bg-bg-surface sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Live Stock</h1>
            <p className="text-xs text-text-muted mt-0.5">
              {data ? `${data.total} products` : "Loading…"}
              {inStockOnly && " · In stock only"}
            </p>
          </div>
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-text-muted hover:text-brand transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="flex gap-3 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-48">
            <Input
              placeholder="Search products, SKUs…"
              leftIcon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {/* Filter chips */}
          <div className="flex gap-2 flex-wrap">
            {TYPE_FILTERS.map((f) => (
              <FilterChip
                key={f.value}
                active={type === f.value}
                onClick={() => { setType(f.value); setPage(1); }}
              >
                {f.label}
              </FilterChip>
            ))}
            <FilterChip
              active={inStockOnly}
              onClick={() => { setInStockOnly((v) => !v); setPage(1); }}
              highlight
            >
              In Stock
            </FilterChip>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : !data || data.data.length === 0 ? (
          <EmptyState hasFilters={!!hasFilters} onReset={resetFilters} />
        ) : (
          <>
            <div
              className={cn(
                "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 transition-opacity",
                isFetching && "opacity-60"
              )}
            >
              {data.data.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="flex items-center text-xs text-text-muted px-3">
                  Page {page} of {data.totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  children,
  active,
  onClick,
  highlight,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 border",
        active
          ? highlight
            ? "bg-emerald/15 border-emerald/40 text-emerald"
            : "bg-brand/15 border-brand/40 text-brand"
          : "bg-bg-elevated border-border text-text-secondary hover:border-border-strong hover:text-text-primary"
      )}
    >
      {children}
    </button>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="aspect-square bg-bg-elevated rounded-t-lg" />
      <div className="p-4 flex flex-col gap-3">
        <div className="space-y-1.5">
          <div className="h-2.5 bg-bg-elevated rounded w-1/3" />
          <div className="h-3 bg-bg-elevated rounded w-4/5" />
          <div className="h-2 bg-bg-elevated rounded w-1/4" />
        </div>
        <div className="h-10 bg-bg-elevated rounded-lg" />
        <div className="h-8 bg-bg-elevated rounded-lg" />
      </div>
    </div>
  );
}

function EmptyState({
  hasFilters,
  onReset,
}: {
  hasFilters: boolean;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-bg-elevated flex items-center justify-center">
        <Package className="w-6 h-6 text-text-muted" />
      </div>
      <div>
        <p className="text-sm font-medium text-text-primary">No products found</p>
        <p className="text-xs text-text-muted mt-1">
          {hasFilters
            ? "Try adjusting your filters"
            : "No products are available right now"}
        </p>
      </div>
      {hasFilters && (
        <Button variant="secondary" size="sm" onClick={onReset}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
