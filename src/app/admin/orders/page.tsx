"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, ChevronDown, Check } from "lucide-react";
import { OrderStatusBadge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDateTime, buildQueryString } from "@/lib/utils";
import { toast } from "@/components/ui/Toaster";
import type { ApiResponse, PaginatedResponse } from "@/types";

const STATUSES = [
  "PLACED",
  "CONFIRMED",
  "PAYMENT_RECEIVED",
  "PICKING",
  "PACKED",
  "DISPATCHED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
] as const;

type Status = (typeof STATUSES)[number];

export default function AdminOrdersPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<Status | "">("");
  const [statusNote, setStatusNote] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");

  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders", page, status, search],
    queryFn: async () => {
      const qs = buildQueryString({ page, limit: 25, status: status || undefined });
      const res = await fetch(`/api/orders${qs}`);
      const json: ApiResponse<PaginatedResponse<Order>> = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data!;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({
      orderId,
      status,
      note,
      trackingNumber,
    }: {
      orderId: string;
      status: Status;
      note?: string;
      trackingNumber?: string;
    }) => {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note, trackingNumber }),
      });
      const json: ApiResponse<Order> = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data!;
    },
    onSuccess: () => {
      toast({ type: "success", title: "Order updated" });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      setSelectedOrder(null);
      setNewStatus("");
      setStatusNote("");
      setTrackingNumber("");
    },
    onError: (err: Error) => {
      toast({ type: "error", title: "Update failed", description: err.message });
    },
  });

  const filtered = data?.data.filter(
    (o) =>
      !search ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.retailer?.companyName.toLowerCase().includes(search.toLowerCase()) ||
      o.poReference?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 flex flex-col gap-5 max-w-6xl">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Orders</h1>
        <p className="text-sm text-text-muted mt-0.5">
          {data ? `${data.total} total` : "Loading…"}
        </p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-48">
          <Input
            placeholder="Search order, retailer, PO…"
            leftIcon={<Search className="w-4 h-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["", "PLACED", "CONFIRMED", "DISPATCHED", "DELIVERED"].map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                status === s
                  ? "bg-brand/15 border-brand/40 text-brand"
                  : "bg-bg-elevated border-border text-text-secondary hover:border-border-strong"
              }`}
            >
              {s || "All"}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-text-muted">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Order", "Retailer", "PO Ref", "Lines", "Total", "Status", "Date", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs text-text-muted font-medium"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered?.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-bg-elevated transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-text-primary">
                      {order.orderNumber}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-text-primary">{order.retailer?.companyName}</p>
                      <p className="text-xs text-text-muted">{order.retailer?.accountCode}</p>
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-xs">
                      {order.poReference ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {order.items?.length ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-text-primary">
                      {formatCurrency(order.totalPence)}
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={order.status as never} />
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {formatDateTime(order.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setNewStatus(order.status as Status);
                        }}
                        className="text-xs text-brand hover:underline"
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Update status modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedOrder(null);
          }}
        >
          <div className="card p-6 w-full max-w-md flex flex-col gap-4">
            <h2 className="text-base font-semibold">
              Update {selectedOrder.orderNumber}
            </h2>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-text-muted uppercase tracking-wide font-medium">
                New Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as Status)}
                className="input-base"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            {(newStatus === "DISPATCHED" || newStatus === "OUT_FOR_DELIVERY") && (
              <Input
                label="Tracking Number"
                placeholder="e.g. 1Z999AA10123456784"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-text-muted uppercase tracking-wide font-medium">
                Internal Note (optional)
              </label>
              <textarea
                className="input-base resize-none"
                rows={2}
                placeholder="Add a note visible to your team…"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                variant="secondary"
                onClick={() => setSelectedOrder(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                loading={updateStatus.isPending}
                onClick={() =>
                  updateStatus.mutate({
                    orderId: selectedOrder.id,
                    status: newStatus as Status,
                    note: statusNote || undefined,
                    trackingNumber: trackingNumber || undefined,
                  })
                }
              >
                Save
              </Button>
            </div>
          </div>
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
  retailer?: { companyName: string; accountCode: string };
  items?: { id: string }[];
}
