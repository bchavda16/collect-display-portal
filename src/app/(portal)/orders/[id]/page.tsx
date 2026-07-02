import { notFound } from "next/navigation";


import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ChevronLeft, Package, Truck, ExternalLink } from "lucide-react";
import { OrderStatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

const ALL_STATUSES = [
  "PLACED",
  "CONFIRMED",
  "PAYMENT_RECEIVED",
  "PICKING",
  "PACKED",
  "DISPATCHED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;

const STATUS_LABELS: Record<string, string> = {
  PLACED: "Order Placed",
  CONFIRMED: "Confirmed",
  PAYMENT_RECEIVED: "Payment Received",
  PICKING: "Picking",
  PACKED: "Packed",
  DISPATCHED: "Dispatched",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
};

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session) return null;

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: {
        include: {
          product: { include: { brand: true } },
        },
      },
      retailer: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
      deliveryAddress: true,
      placedBy: { select: { name: true, email: true } },
    },
  });

  if (!order) notFound();

  // Verify access
  if (session.user.role !== "ADMIN") {
    const retailer = await prisma.retailer.findFirst({
      where: { users: { some: { id: session.user.id } } },
    });
    if (!retailer || order.retailerId !== retailer.id) notFound();
  }

  const reachedStatuses = new Set(order.statusHistory.map((h) => h.status));
  const isCancelled = order.status === "CANCELLED";

  return (
    <div className="p-6 max-w-3xl flex flex-col gap-6">
      {/* Back link */}
      <Link
        href="/orders"
        className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors w-fit"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Back to orders
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">{order.orderNumber}</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Placed {formatDateTime(order.createdAt)}
            {order.poReference && ` · PO: ${order.poReference}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <OrderStatusBadge status={order.status as never} />
          {order.invoiceUrl && (
            <a
              href={order.invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-brand hover:underline"
            >
              Invoice <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Status timeline */}
      {!isCancelled && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-4">Order Progress</h2>
          <div className="flex items-start gap-0">
            {ALL_STATUSES.map((status, idx) => {
              const reached = reachedStatuses.has(status);
              const isCurrent = order.status === status;
              const historyEntry = order.statusHistory.find((h) => h.status === status);

              return (
                <div key={status} className="flex flex-col items-center flex-1 relative">
                  {/* Connector line */}
                  {idx < ALL_STATUSES.length - 1 && (
                    <div
                      className={`absolute top-3 left-1/2 w-full h-0.5 ${
                        reached ? "bg-brand" : "bg-border"
                      }`}
                    />
                  )}

                  {/* Dot */}
                  <div
                    className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCurrent
                        ? "bg-brand border-brand scale-110"
                        : reached
                        ? "bg-brand/20 border-brand"
                        : "bg-bg-elevated border-border"
                    }`}
                  >
                    {reached && !isCurrent && (
                      <div className="w-2 h-2 rounded-full bg-brand" />
                    )}
                    {isCurrent && (
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    )}
                  </div>

                  {/* Label */}
                  <p
                    className={`text-[9px] text-center mt-1.5 leading-tight font-medium ${
                      isCurrent
                        ? "text-brand"
                        : reached
                        ? "text-text-secondary"
                        : "text-text-disabled"
                    }`}
                  >
                    {STATUS_LABELS[status]}
                  </p>

                  {/* Date */}
                  {historyEntry && (
                    <p className="text-[8px] text-text-muted mt-0.5 text-center">
                      {formatDate(historyEntry.createdAt)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tracking */}
      {order.trackingNumber && (
        <div className="card p-4 flex items-center gap-3">
          <Truck className="w-4 h-4 text-emerald shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-text-muted">Tracking number</p>
            <p className="text-sm font-medium text-text-primary">{order.trackingNumber}</p>
          </div>
          {order.trackingUrl && (
            <a
              href={order.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-brand hover:underline"
            >
              Track <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* Line items */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">
            Order Lines ({order.items.length})
          </h2>
        </div>
        <div className="divide-y divide-border">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 px-5 py-3">
              <div className="w-8 h-8 rounded bg-bg-elevated flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 text-text-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {item.product.name}
                </p>
                <p className="text-xs text-text-muted">
                  {item.product.sku} · {item.product.brand.name}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-text-muted">×{item.quantity}</p>
                <p className="text-sm font-semibold text-text-primary">
                  {formatCurrency(item.lineTotalPence)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t border-border px-5 py-4 flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-text-secondary">
            <span>Subtotal (ex. VAT)</span>
            <span>{formatCurrency(order.subtotalPence)}</span>
          </div>
          <div className="flex justify-between text-xs text-text-secondary">
            <span>VAT (20%)</span>
            <span>{formatCurrency(order.vatPence)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-text-primary pt-1.5 border-t border-border">
            <span>Total</span>
            <span>{formatCurrency(order.totalPence)}</span>
          </div>
        </div>
      </div>

      {/* Delivery address */}
      {order.deliveryAddress && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-2">Delivery Address</h2>
          <address className="text-sm text-text-secondary not-italic leading-relaxed">
            {order.deliveryAddress.line1}<br />
            {order.deliveryAddress.line2 && <>{order.deliveryAddress.line2}<br /></>}
            {order.deliveryAddress.city}, {order.deliveryAddress.postcode}
          </address>
          {order.deliveryNotes && (
            <p className="text-xs text-text-muted mt-2 border-t border-border pt-2">
              Note: {order.deliveryNotes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
