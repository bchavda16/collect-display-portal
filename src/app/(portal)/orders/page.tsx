"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ClipboardList, ChevronRight, Search } from "lucide-react";
import { OrderStatusBadge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { formatCurrency, formatDate, buildQueryString } from "@/lib/utils";
import type { ApiResponse, PaginatedResponse } from "@/types";

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["orders", page, status],
    queryFn: async () => {
      const qs = buildQueryString({ page, limit: 20, status: status || undefined });
      const res = await fetch(`/api/orders${qs}`);
      const json: ApiResponse<PaginatedResponse<Order>> = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data!;
    },
  });

  const STATUS_OPTIONS = [
    { value: "", label: "All" },
    { value: "PLACED", label: "Placed" },
    { value: "CONFIRMED", label: "Confirmed" },
    { value: "DISPATCHED", label: "Dispatched" },
    { value: "DELIVERED", label: "Delivered" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  return (
    <div className="p-6 max-w-4xl flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">My Orders</h1>
        <p className="text-sm text-text-muted mt-0.5">
          {data ? `${data.total} orders` : "Loading…"}
        </p>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setStatus(opt.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              status === opt.value
                ? "bg-brand/15 border-brand/40 text-brand"
                : "bg-bg-elevated border-border text-text-secondary hover:border-border-strong"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Orders table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center justify-between animate-pulse">
                <div className="flex flex-col gap-1.5">
                  <div className="h-3 w-24 bg-bg-elevated rounded" />
                  <div className="h-2.5 w-32 bg-bg-elevated rounded" />
                </div>
                <div className="h-5 w-20 bg-bg-elevated rounded" />
              </div>
            ))}
          </div>
        ) : !data?.data.length ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <ClipboardList className="w-8 h-8 text-text-disabled" />
            <div>
              <p className="text-sm font-medium text-text-primary">No orders found</p>
              <p className="text-xs text-text-muted mt-1">
                {status ? "Try a different filter" : "Your orders will appear here"}
              </p>
            </div>
            <Link href="/stock" className="text-xs text-brand hover:underline">
              Browse stock →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.data.map((order: Order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-bg-elevated transition-colors group"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-text-primary">
                      {order.orderNumber}
                    </span>
                    {order.poReference && (
                      <span className="text-xs text-text-muted">PO: {order.poReference}</span>
                    )}
                  </div>
                  <span className="text-xs text-text-muted">
                    {formatDate(order.createdAt)} · {order.items?.length ?? 0} lines
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <OrderStatusBadge status={order.status as never} />
                  <span className="text-sm font-semibold text-text-primary min-w-[70px] text-right">
                    {formatCurrency(order.totalPence)}
                  </span>
                  <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-brand transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-1.5 text-xs rounded-lg bg-bg-elevated border border-border text-text-secondary hover:border-border-strong disabled:opacity-40 disabled:pointer-events-none"
          >
            Previous
          </button>
          <span className="flex items-center text-xs text-text-muted px-2">
            {page} / {data.totalPages}
          </span>
          <button
            disabled={page === data.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-1.5 text-xs rounded-lg bg-bg-elevated border border-border text-text-secondary hover:border-border-strong disabled:opacity-40 disabled:pointer-events-none"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

interface Order {
  id: string;
  orderNumber: string;
  poReference?: string | null;
  status: string;
  totalPence: number;
  createdAt: string;
  items?: { id: string }[];
}
