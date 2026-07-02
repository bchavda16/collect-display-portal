import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import Link from "next/link"
import { ChevronLeft, Package, Truck, ExternalLink } from "lucide-react"
import { OrderStatusBadge } from "@/components/ui/Badge"
import { formatCurrencyFromPounds, formatDate, formatDateTime } from "@/lib/utils"

const ALL_STATUSES = ["PLACED","CONFIRMED","PROCESSING","PICKED","PACKED","DISPATCHED","OUT_FOR_DELIVERY","DELIVERED"] as const

const STATUS_LABELS: Record<string, string> = {
  PLACED: "Placed", CONFIRMED: "Confirmed", PROCESSING: "Processing",
  PICKED: "Picked", PACKED: "Packed", DISPATCHED: "Dispatched",
  OUT_FOR_DELIVERY: "Out for Delivery", DELIVERED: "Delivered",
}

const CARRIER_URLS: Record<string, string> = {
  "Royal Mail": "https://www.royalmail.com/track-your-item#/tracking-results/",
  "DPD": "https://www.dpd.co.uk/apps/tracking/?reference=",
  "Evri": "https://www.evri.com/track-a-parcel#/tracking/",
  "DHL": "https://www.dhl.com/gb-en/home/tracking.html?tracking-id=",
  "UPS": "https://www.ups.com/track?tracknum=",
  "FedEx": "https://www.fedex.com/fedextrack/?tracknumbers=",
  "Yodel": "https://www.yodel.co.uk/track/",
}

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: { include: { product: { include: { brand: true } } } },
      retailer: { include: { addresses: true } },
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  })

  if (!order) notFound()

  if ((session.user as any).role !== "ADMIN") {
    const retailer = await prisma.retailer.findFirst({ where: { userId: (session.user as any).id } })
    if (!retailer || order.retailerId !== retailer.id) notFound()
  }

  const reachedStatuses = new Set(order.statusHistory.map((h) => h.status))
  const isCancelled = order.status === "CANCELLED"
  const trackingUrl = order.trackingNumber && order.carrierName
    ? (CARRIER_URLS[order.carrierName] ?? null)
    : null

  const deliveryAddress = order.retailer.addresses[0]

  return (
    <div className="p-6 max-w-3xl flex flex-col gap-6">
      <Link href="/orders" className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors w-fit">
        <ChevronLeft className="w-3.5 h-3.5" /> Back to orders
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">{order.orderNumber}</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Placed {formatDateTime(order.createdAt)}{order.poReference && ` · PO: ${order.poReference}`}
          </p>
        </div>
        <OrderStatusBadge status={order.status as any} />
      </div>

      {!isCancelled && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-4">Order Progress</h2>
          <div className="flex items-start gap-0">
            {ALL_STATUSES.map((status, idx) => {
              const reached = reachedStatuses.has(status)
              const isCurrent = order.status === status
              const historyEntry = order.statusHistory.find((h) => h.status === status)
              return (
                <div key={status} className="flex flex-col items-center flex-1 relative">
                  {idx < ALL_STATUSES.length - 1 && (
                    <div className={`absolute top-3 left-1/2 w-full h-0.5 ${reached ? "bg-brand" : "bg-border"}`} />
                  )}
                  <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${isCurrent ? "bg-brand border-brand scale-110" : reached ? "bg-brand/20 border-brand" : "bg-bg-elevated border-border"}`}>
                    {reached && !isCurrent && <div className="w-2 h-2 rounded-full bg-brand" />}
                    {isCurrent && <div className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                  </div>
                  <p className={`text-[9px] text-center mt-1.5 leading-tight font-medium ${isCurrent ? "text-brand" : reached ? "text-text-secondary" : "text-text-muted"}`}>
                    {STATUS_LABELS[status]}
                  </p>
                  {historyEntry && <p className="text-[8px] text-text-muted mt-0.5 text-center">{formatDate(historyEntry.createdAt)}</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {order.trackingNumber && (
        <div className="card p-4 flex items-center gap-3">
          <Truck className="w-4 h-4 text-emerald flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-text-muted">{order.carrierName ?? "Carrier"} tracking</p>
            <p className="text-sm font-mono font-medium text-text-primary">{order.trackingNumber}</p>
          </div>
          {trackingUrl && (
            <a href={`${trackingUrl}${encodeURIComponent(order.trackingNumber)}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-brand hover:underline">
              Track <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Order Lines ({order.items.length})</h2>
        </div>
        <div className="divide-y divide-border">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 px-5 py-3">
              <div className="w-8 h-8 rounded bg-bg-elevated flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 text-text-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{item.productName}</p>
                <p className="text-xs text-text-muted">{item.sku} · {item.product.brand?.name}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-text-muted">×{item.quantity}</p>
                <p className="text-sm font-semibold text-text-primary">{formatCurrencyFromPounds(item.lineTotalPence)}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border px-5 py-4 flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-text-secondary">
            <span>Subtotal (ex. VAT)</span><span>{formatCurrencyFromPounds(order.subtotalPence)}</span>
          </div>
          <div className="flex justify-between text-xs text-text-secondary">
            <span>VAT (20%)</span><span>{formatCurrencyFromPounds(order.vatPence)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-text-primary pt-1.5 border-t border-border">
            <span>Total</span><span>{formatCurrencyFromPounds(order.totalPence)}</span>
          </div>
        </div>
      </div>

      {deliveryAddress && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-2">Delivery Address</h2>
          <address className="text-sm text-text-secondary not-italic leading-relaxed">
            {deliveryAddress.line1}<br />
            {deliveryAddress.line2 && <>{deliveryAddress.line2}<br /></>}
            {deliveryAddress.city}{deliveryAddress.county ? `, ${deliveryAddress.county}` : ""}<br />
            {deliveryAddress.postcode}
          </address>
          {order.deliveryNotes && (
            <p className="text-xs text-text-muted mt-2 border-t border-border pt-2">Note: {order.deliveryNotes}</p>
          )}
        </div>
      )}
    </div>
  )
}
