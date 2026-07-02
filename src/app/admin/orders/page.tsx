'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge, OrderStatusBadge } from '@/components/ui/Badge'
import { toast } from '@/components/ui/Toaster'
import { useDebounce } from '@/hooks/useDebounce'
import { formatCurrencyFromPounds, formatDate } from '@/lib/utils'

const STATUSES = ['ALL','PLACED','CONFIRMED','PROCESSING','PICKED','PACKED','DISPATCHED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED']

export default function AdminOrdersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [editingOrder, setEditingOrder] = useState<any>(null)
  const [newStatus, setNewStatus] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [carrierName, setCarrierName] = useState('')
  const [note, setNote] = useState('')

  const debouncedSearch = useDebounce(search, 300)

  const params = new URLSearchParams({
    page: page.toString(),
    limit: '20',
    ...(statusFilter !== 'ALL' && { status: statusFilter }),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', statusFilter, page],
    queryFn: async () => {
      const res = await fetch(`/api/orders?${params}`)
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...body }: any) => {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      setEditingOrder(null)
      toast('Order updated', 'success')
    },
    onError: () => toast('Update failed', 'error'),
  })

  const orders = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1

  const handleUpdate = () => {
    if (!editingOrder || !newStatus) return
    updateMutation.mutate({
      id: editingOrder.id,
      status: newStatus,
      trackingNumber: trackingNumber || undefined,
      carrierName: carrierName || undefined,
      note: note || undefined,
    })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Orders</h1>
          <p className="text-sm text-text-muted mt-0.5">{total.toLocaleString()} total</p>
        </div>
      </div>

      <div className="card p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search by order number or retailer…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full bg-white border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUSES.map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === s ? 'bg-brand text-white' : 'bg-bg-elevated text-text-secondary hover:bg-brand-light hover:text-brand-dark'}`}>
              {s === 'ALL' ? 'All' : s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-bg-elevated border-b border-border">
                {['Order', 'Retailer', 'Date', 'Items', 'Value', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-bg-elevated rounded animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-text-muted text-sm">No orders found</td></tr>
              ) : orders.map((order: any) => (
                <tr key={order.id} className="hover:bg-bg-elevated/50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-sm text-brand-dark">{order.orderNumber}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{order.retailer?.businessName}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{order._count?.items ?? order.items?.length ?? 0}</td>
                  <td className="px-4 py-3 text-sm font-medium text-text-primary">{formatCurrencyFromPounds(order.totalPence)}</td>
                  <td className="px-4 py-3"><OrderStatusBadge status={order.status} /></td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setEditingOrder(order); setNewStatus(order.status); setTrackingNumber(order.trackingNumber ?? ''); setCarrierName(order.carrierName ?? ''); setNote('') }}
                      className="text-xs text-brand hover:text-brand-hover font-medium">Update</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <p className="text-sm text-text-muted">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
              <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {editingOrder && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-text-primary">Update {editingOrder.orderNumber}</h2>
              <button onClick={() => setEditingOrder(null)} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Status</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                className="w-full bg-white border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand">
                {STATUSES.filter(s => s !== 'ALL').map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <Input label="Carrier" value={carrierName} onChange={e => setCarrierName(e.target.value)} placeholder="e.g. Royal Mail" />
            <Input label="Tracking Number" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="e.g. RM123456789GB" />
            <Input label="Internal Note (optional)" value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note…" />
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setEditingOrder(null)} className="flex-1">Cancel</Button>
              <Button onClick={handleUpdate} loading={updateMutation.isPending} className="flex-1">Save Changes</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
