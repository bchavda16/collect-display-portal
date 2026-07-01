'use client'

import { useQuery } from '@tanstack/react-query'
import { Package, Truck, ExternalLink, Clock, CheckCircle2, MapPin } from 'lucide-react'
import { Badge, OrderStatusBadge } from '@/components/ui/Badge'
import { formatDate, formatDateTime } from '@/lib/utils'

interface ShipmentOrder {
  id: string
  orderNumber: string
  status: string
  trackingNumber: string | null
  carrierName: string | null
  estimatedDelivery: string | null
  shippedAt: string | null
  items: { productName: string; quantity: number }[]
  address: {
    line1: string
    city: string
    postcode: string
  } | null
}

const CARRIER_TRACKING_URLS: Record<string, string> = {
  'Royal Mail': 'https://www.royalmail.com/track-your-item#/tracking-results/',
  'DPD': 'https://www.dpd.co.uk/apps/tracking/?reference=',
  'Hermes': 'https://www.evri.com/track-a-parcel#/tracking/',
  'Evri': 'https://www.evri.com/track-a-parcel#/tracking/',
  'DHL': 'https://www.dhl.com/gb-en/home/tracking.html?tracking-id=',
  'FedEx': 'https://www.fedex.com/fedextrack/?tracknumbers=',
  'UPS': 'https://www.ups.com/track?tracknum=',
  'Yodel': 'https://www.yodel.co.uk/track/',
}

function getTrackingUrl(carrier: string | null, trackingNumber: string): string | null {
  if (!carrier) return null
  const base = CARRIER_TRACKING_URLS[carrier]
  return base ? `${base}${encodeURIComponent(trackingNumber)}` : null
}

export default function TrackingPage() {
  const { data, isLoading } = useQuery<{ data: ShipmentOrder[] }>({
    queryKey: ['tracking'],
    queryFn: async () => {
      const res = await fetch('/api/orders?statuses=DISPATCHED,OUT_FOR_DELIVERY&limit=50')
      if (!res.ok) throw new Error('Failed to load shipments')
      return res.json()
    },
  })

  const shipments = data?.data ?? []
  const activeShipments = shipments.filter(s => s.status === 'DISPATCHED' || s.status === 'OUT_FOR_DELIVERY')

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Track Shipments</h1>
        <p className="text-sm text-gray-400 mt-0.5">Live tracking for orders currently in transit</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-white/5 rounded w-1/3 mb-3" />
              <div className="h-3 bg-white/5 rounded w-1/2 mb-2" />
              <div className="h-3 bg-white/5 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : activeShipments.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {activeShipments.map(order => (
            <ShipmentCard key={order.id} order={order} />
          ))}
        </div>
      )}

      {/* Recently delivered */}
      <RecentlyDelivered />
    </div>
  )
}

function ShipmentCard({ order }: { order: ShipmentOrder }) {
  const trackingUrl = order.trackingNumber
    ? getTrackingUrl(order.carrierName, order.trackingNumber)
    : null

  const isOutForDelivery = order.status === 'OUT_FOR_DELIVERY'

  return (
    <div className={`card p-5 space-y-4 ${isOutForDelivery ? 'ring-1 ring-emerald-500/30' : ''}`}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base font-semibold text-white">{order.orderNumber}</span>
            <OrderStatusBadge status={order.status as any} />
          </div>
          {order.shippedAt && (
            <p className="text-xs text-gray-500">Shipped {formatDate(order.shippedAt)}</p>
          )}
        </div>
        {trackingUrl && (
          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand/10 hover:bg-brand/20 text-brand text-xs font-medium transition-colors flex-shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Track on {order.carrierName ?? 'Carrier'}
          </a>
        )}
      </div>

      {/* Tracking number */}
      {order.trackingNumber && (
        <div className="flex items-center gap-2 bg-bg-base/50 rounded-lg px-3 py-2">
          <Truck className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">{order.carrierName ?? 'Carrier'} Tracking</p>
            <p className="text-sm font-mono text-white">{order.trackingNumber}</p>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(order.trackingNumber!)
            }}
            className="text-xs text-gray-500 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5"
          >
            Copy
          </button>
        </div>
      )}

      {/* Progress bar */}
      <ShipmentProgress status={order.status} estimatedDelivery={order.estimatedDelivery} />

      {/* Items & address */}
      <div className="grid grid-cols-2 gap-4 pt-1">
        <div>
          <p className="text-xs text-gray-500 mb-1.5">Items in shipment</p>
          <ul className="space-y-1">
            {order.items.slice(0, 3).map((item, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-xs text-gray-400">
                <span className="truncate">{item.productName}</span>
                <span className="text-gray-600 flex-shrink-0">×{item.quantity}</span>
              </li>
            ))}
            {order.items.length > 3 && (
              <li className="text-xs text-gray-600">+{order.items.length - 3} more items</li>
            )}
          </ul>
        </div>
        {order.address && (
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Delivering to</p>
            <div className="flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-gray-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-gray-400 leading-relaxed">
                <p>{order.address.line1}</p>
                <p>{order.address.city}</p>
                <p className="font-mono">{order.address.postcode}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ShipmentProgress({ status, estimatedDelivery }: { status: string; estimatedDelivery: string | null }) {
  const steps = [
    { key: 'PLACED', label: 'Ordered' },
    { key: 'PROCESSING', label: 'Processing' },
    { key: 'DISPATCHED', label: 'Dispatched' },
    { key: 'OUT_FOR_DELIVERY', label: 'Out for delivery' },
    { key: 'DELIVERED', label: 'Delivered' },
  ]

  const statusOrder = ['PLACED', 'CONFIRMED', 'PROCESSING', 'PICKED', 'PACKED', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED']
  const currentIdx = statusOrder.indexOf(status)

  return (
    <div>
      <div className="flex items-center gap-0">
        {steps.map((step, i) => {
          const stepIdx = statusOrder.indexOf(step.key)
          const done = currentIdx >= stepIdx
          const active = statusOrder[currentIdx] === step.key || (step.key === 'PROCESSING' && ['PROCESSING', 'PICKED', 'PACKED'].includes(status))
          return (
            <div key={step.key} className="flex-1 flex flex-col items-center">
              <div className="flex items-center w-full">
                {i > 0 && (
                  <div className={`flex-1 h-px ${done ? 'bg-brand' : 'bg-white/10'}`} />
                )}
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  done ? 'bg-brand' : 'bg-white/10'
                } ${active ? 'ring-2 ring-brand/30' : ''}`} />
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-px ${done && !active ? 'bg-brand' : 'bg-white/10'}`} />
                )}
              </div>
              <p className={`text-[10px] mt-1.5 text-center ${done ? 'text-white' : 'text-gray-600'}`}>
                {step.label}
              </p>
            </div>
          )
        })}
      </div>
      {estimatedDelivery && (
        <div className="flex items-center gap-1.5 mt-3">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <p className="text-xs text-amber-400">
            Estimated delivery: <span className="font-medium">{formatDate(estimatedDelivery)}</span>
          </p>
        </div>
      )}
    </div>
  )
}

function RecentlyDelivered() {
  const { data } = useQuery<{ data: ShipmentOrder[] }>({
    queryKey: ['recently-delivered'],
    queryFn: async () => {
      const res = await fetch('/api/orders?statuses=DELIVERED&limit=5')
      if (!res.ok) throw new Error('Failed to load')
      return res.json()
    },
  })

  const delivered = data?.data ?? []
  if (delivered.length === 0) return null

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Recently Delivered</h2>
      {delivered.map(order => (
        <div key={order.id} className="card p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{order.orderNumber}</p>
              <p className="text-xs text-gray-500">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="text-right">
            <OrderStatusBadge status={order.status as any} />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="card p-12 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
        <Truck className="w-8 h-8 text-gray-600" />
      </div>
      <h3 className="text-white font-semibold mb-1">No active shipments</h3>
      <p className="text-sm text-gray-500 max-w-xs">
        Your tracking information will appear here once an order has been dispatched.
      </p>
    </div>
  )
}
