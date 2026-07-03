'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, UserPlus, Building2, Mail, Phone, ChevronLeft, ChevronRight, X, Eye, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/components/ui/Toaster'
import { useDebounce } from '@/hooks/useDebounce'
import { formatCurrencyFromPounds, formatDate } from '@/lib/utils'
import type { RetailerWithUser } from '@/types'

const PRICING_TIERS = ['STANDARD', 'SILVER', 'GOLD', 'PLATINUM']
const PAYMENT_TERMS = ['PROFORMA', 'NET_14', 'NET_30', 'NET_60']

export default function AdminRetailersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedRetailer, setSelectedRetailer] = useState<RetailerWithUser | null>(null)

  const debouncedSearch = useDebounce(search, 300)

  const params = new URLSearchParams({
    page: page.toString(),
    limit: '20',
    ...(debouncedSearch && { search: debouncedSearch }),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-retailers', debouncedSearch, page],
    queryFn: async () => {
      const res = await fetch(`/api/retailers?${params}`)
      if (!res.ok) throw new Error('Failed to fetch retailers')
      return res.json()
    },
  })

  const retailers: RetailerWithUser[] = data?.data ?? []
  const total: number = data?.total ?? 0
  const totalPages: number = data?.totalPages ?? 1

  const tierColour = (tier: string) => {
    switch (tier) {
      case 'PLATINUM': return 'purple'
      case 'GOLD': return 'warning'
      case 'SILVER': return 'info'
      default: return 'default'
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Retailers</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total.toLocaleString()} accounts</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} icon={<UserPlus className="w-4 h-4" />}>
          Add Retailer
        </Button>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by business name, email, or contact name…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full bg-bg-base border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand/50"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Business</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Contact</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Tier</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Terms</th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Credit Limit</th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Orders</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Joined</th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-white/5 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : retailers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-gray-500">
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No retailers found
                  </td>
                </tr>
              ) : (
                retailers.map((retailer) => (
                  <tr key={retailer.id} className="hover:bg-white/2 transition-colors">
                    {/* Business */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-white">{retailer.businessName}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-gray-600" />
                          <span className="text-xs text-gray-500">{retailer.user?.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm text-gray-300">{retailer.contactName}</p>
                        {retailer.phone && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-gray-600" />
                            <span className="text-xs text-gray-500">{retailer.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Tier */}
                    <td className="px-4 py-3">
                      <Badge variant={tierColour(retailer.pricingTier) as any}>
                        {retailer.pricingTier}
                      </Badge>
                    </td>

                    {/* Payment Terms */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-400">{retailer.paymentTerms?.replace('_', ' ') ?? 'PROFORMA'}</span>
                    </td>

                    {/* Credit Limit */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-white">
                        {retailer.creditLimitPence
                          ? formatCurrencyFromPounds(retailer.creditLimitPence)
                          : <span className="text-gray-600">—</span>}
                      </span>
                    </td>

                    {/* Orders */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-gray-300">{retailer._count?.orders ?? 0}</span>
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-400">{formatDate(retailer.createdAt)}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedRetailer(retailer)}
                        className="text-gray-500 hover:text-white transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Page {page} of {totalPages} · {total.toLocaleString()} retailers
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} icon={<ChevronLeft className="w-4 h-4" />}>Prev</Button>
              <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Retailer Modal */}
      {showCreateModal && (
        <CreateRetailerModal onClose={() => setShowCreateModal(false)} onSuccess={() => {
          setShowCreateModal(false)
          queryClient.invalidateQueries({ queryKey: ['admin-retailers'] })
        }} />
      )}

      {/* Retailer Detail Panel */}
      {selectedRetailer && (
        <RetailerDetailPanel
          retailer={selectedRetailer}
          onClose={() => setSelectedRetailer(null)}
          onUpdate={() => queryClient.invalidateQueries({ queryKey: ['admin-retailers'] })}
        />
      )}
    </div>
  )
}

function CreateRetailerModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    businessName: '', contactName: '', email: '', phone: '',
    pricingTier: 'STANDARD', paymentTerms: 'PROFORMA',
    creditLimit: '', vatNumber: '',
    addressLine1: '', addressLine2: '', city: '', county: '', postcode: '', country: 'GB',
  })
  const [loading, setLoading] = useState(false)

  const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/retailers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: form.businessName,
          contactName: form.contactName,
          email: form.email,
          phone: form.phone || undefined,
          pricingTier: form.pricingTier,
          paymentTerms: form.paymentTerms,
          creditLimitPence: form.creditLimit ? Math.round(parseFloat(form.creditLimit) * 100) : undefined,
          vatNumber: form.vatNumber || undefined,
          address: {
            line1: form.addressLine1,
            line2: form.addressLine2 || undefined,
            city: form.city,
            county: form.county || undefined,
            postcode: form.postcode,
            country: form.country,
          },
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to create retailer')
      }
      toast('Retailer created — welcome email sent', 'success')
      onSuccess()
    } catch (err: any) {
      toast(err.message ?? 'Failed to create retailer', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="card w-full max-w-2xl p-6 space-y-5 my-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Add Retailer</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Business Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Business Name" value={form.businessName} onChange={f('businessName')} placeholder="e.g. Galaxy Collectibles Ltd" />
            </div>
            <Input label="Contact Name" value={form.contactName} onChange={f('contactName')} placeholder="Full name" />
            <Input label="Email Address" type="email" value={form.email} onChange={f('email')} placeholder="owner@business.com" />
            <Input label="Phone" value={form.phone} onChange={f('phone')} placeholder="+44 7700 900000" />
            <Input label="VAT Number" value={form.vatNumber} onChange={f('vatNumber')} placeholder="GB123456789" />
          </div>

          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-2">Account Settings</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Pricing Tier</label>
              <select value={form.pricingTier} onChange={f('pricingTier')} className="w-full bg-bg-base border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand/50">
                {PRICING_TIERS.map(t => <option key={t} value={t} className="bg-bg-surface">{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Payment Terms</label>
              <select value={form.paymentTerms} onChange={f('paymentTerms')} className="w-full bg-bg-base border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand/50">
                {PAYMENT_TERMS.map(t => <option key={t} value={t} className="bg-bg-surface">{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <Input label="Credit Limit (£)" type="number" step="100" value={form.creditLimit} onChange={f('creditLimit')} placeholder="0.00" hint="Leave blank for no limit" />
          </div>

          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-2">Delivery Address</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Address Line 1" value={form.addressLine1} onChange={f('addressLine1')} placeholder="Street address" />
            </div>
            <Input label="Address Line 2" value={form.addressLine2} onChange={f('addressLine2')} placeholder="Optional" />
            <Input label="City" value={form.city} onChange={f('city')} placeholder="City" />
            <Input label="County" value={form.county} onChange={f('county')} placeholder="Optional" />
            <Input label="Postcode" value={form.postcode} onChange={f('postcode')} placeholder="e.g. B1 1AA" />
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSubmit} loading={loading} className="flex-1">Create & Send Welcome Email</Button>
        </div>
      </div>
    </div>
  )
}

function RetailerDetailPanel({ retailer, onClose, onUpdate }: {
  retailer: RetailerWithUser
  onClose: () => void
  onUpdate: () => void
}) {
  const [editingTier, setEditingTier] = useState(false)
  const [tier, setTier] = useState(retailer.pricingTier)
  const [editingTerms, setEditingTerms] = useState(false)
  const [terms, setTerms] = useState(retailer.paymentTerms ?? 'PROFORMA')
  const [saving, setSaving] = useState(false)

  const saveTier = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/retailers/${retailer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pricingTier: tier }),
      })
      if (!res.ok) throw new Error()
      toast('Pricing tier updated', 'success')
      setEditingTier(false)
      onUpdate()
    } catch {
      toast('Update failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const saveTerms = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/retailers/${retailer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentTerms: terms }),
      })
      if (!res.ok) throw new Error()
      toast('Payment terms updated', 'success')
      setEditingTerms(false)
      onUpdate()
    } catch {
      toast('Update failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-bg-surface border-l border-white/10 z-50 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/10">
        <div>
          <h2 className="font-semibold text-white">{retailer.businessName}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{retailer.user?.email}</p>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Contact */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contact</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Name</span>
              <span className="text-white">{retailer.contactName}</span>
            </div>
            {retailer.phone && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Phone</span>
                <span className="text-white">{retailer.phone}</span>
              </div>
            )}
            {retailer.vatNumber && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">VAT No.</span>
                <span className="text-white font-mono text-xs">{retailer.vatNumber}</span>
              </div>
            )}
          </div>
        </section>

        {/* Account */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Account</h3>
          <div className="space-y-3">
            {/* Pricing Tier */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Pricing Tier</span>
              {editingTier ? (
                <div className="flex items-center gap-2">
                  <select value={tier} onChange={e => setTier(e.target.value)} className="bg-bg-base border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none">
                    {PRICING_TIERS.map(t => <option key={t} value={t} className="bg-bg-surface">{t}</option>)}
                  </select>
                  <button onClick={saveTier} disabled={saving} className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">Save</button>
                  <button onClick={() => setEditingTier(false)} className="text-xs text-gray-500">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setEditingTier(true)} className="flex items-center gap-1 group">
                  <span className="text-white">{retailer.pricingTier}</span>
                  <Edit2Icon className="w-3 h-3 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>

            {/* Payment Terms */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Payment Terms</span>
              {editingTerms ? (
                <div className="flex items-center gap-2">
                  <select value={terms} onChange={e => setTerms(e.target.value)} className="bg-bg-base border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none">
                    {PAYMENT_TERMS.map(t => <option key={t} value={t} className="bg-bg-surface">{t.replace('_', ' ')}</option>)}
                  </select>
                  <button onClick={saveTerms} disabled={saving} className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">Save</button>
                  <button onClick={() => setEditingTerms(false)} className="text-xs text-gray-500">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setEditingTerms(true)} className="flex items-center gap-1 group">
                  <span className="text-white">{retailer.paymentTerms?.replace('_', ' ') ?? 'PROFORMA'}</span>
                  <Edit2Icon className="w-3 h-3 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>

            {retailer.creditLimitPence && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Credit Limit</span>
                <span className="text-white">{formatCurrencyFromPounds(retailer.creditLimitPence)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Total Orders</span>
              <span className="text-white">{retailer._count?.orders ?? 0}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Joined</span>
              <span className="text-white">{formatDate(retailer.createdAt)}</span>
            </div>
          </div>
        </section>

        {/* Address */}
        {retailer.addresses?.[0] && (
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Default Address</h3>
            <div className="text-sm text-gray-300 leading-relaxed">
              <p>{retailer.addresses[0].line1}</p>
              {retailer.addresses[0].line2 && <p>{retailer.addresses[0].line2}</p>}
              <p>{retailer.addresses[0].city}</p>
              {retailer.addresses[0].county && <p>{retailer.addresses[0].county}</p>}
              <p className="font-mono text-xs">{retailer.addresses[0].postcode}</p>
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => window.open(`/admin/orders?retailer=${retailer.id}`, '_blank')}
        >
          View All Orders →
        </Button>
      </div>
    </div>
  )
}

// Inline icon to avoid import clash with Edit2 from lucide
function Edit2Icon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}
