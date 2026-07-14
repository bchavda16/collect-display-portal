'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Package, AlertTriangle, Edit2, Trash2, ChevronLeft, ChevronRight, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge, ProductBadgeChip } from '@/components/ui/Badge'
import { toast } from '@/components/ui/Toaster'
import { useDebounce } from '@/hooks/useDebounce'
import { formatCurrencyFromPounds } from '@/lib/utils'
import type { ProductWithBrand } from '@/types'

const PRODUCT_TYPES = ['ALL', 'BLIND_BOX', 'FIGURE', 'PLUSH', 'ACCESSORY', 'BUNDLE']
const PRODUCT_STATUSES = ['ALL', 'ACTIVE', 'LOW_STOCK', 'OUT_OF_STOCK', 'COMING_SOON', 'DISCONTINUED']

interface EditingStock {
  productId: string
  value: string
}

export default function AdminProductsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [editingStock, setEditingStock] = useState<EditingStock | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const debouncedSearch = useDebounce(search, 300)

  const params = new URLSearchParams({
    page: page.toString(),
    limit: '20',
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(typeFilter !== 'ALL' && { type: typeFilter }),
    ...(statusFilter !== 'ALL' && { status: statusFilter }),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', debouncedSearch, typeFilter, statusFilter, page],
    queryFn: async () => {
      const res = await fetch(`/api/products?${params}`)
      if (!res.ok) throw new Error('Failed to fetch products')
      return res.json()
    },
  })

  const updateStockMutation = useMutation({
    mutationFn: async ({ id, stock }: { id: string; stock: number }) => {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockUnits: stock }),
      })
      if (!res.ok) throw new Error('Failed to update stock')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      setEditingStock(null)
      toast('Stock updated', 'success')
    },
    onError: () => toast('Failed to update stock', 'error'),
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      toast('Status updated', 'success')
    },
    onError: () => toast('Failed to update status', 'error'),
  })

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to discontinue product')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      setDeleteConfirm(null)
      toast('Product discontinued', 'success')
    },
    onError: () => toast('Failed to discontinue product', 'error'),
  })

  const handleStockSave = (productId: string) => {
    if (!editingStock || editingStock.productId !== productId) return
    const stock = parseInt(editingStock.value)
    if (isNaN(stock) || stock < 0) {
      toast('Invalid stock value', 'error')
      return
    }
    updateStockMutation.mutate({ id: productId, stock })
  }

  const products: ProductWithBrand[] = data?.data ?? []
  const total: number = data?.total ?? 0
  const totalPages: number = data?.totalPages ?? 1

  const getStatusColour = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success'
      case 'LOW_STOCK': return 'warning'
      case 'OUT_OF_STOCK': return 'danger'
      case 'COMING_SOON': return 'info'
      case 'DISCONTINUED': return 'default'
      default: return 'default'
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Products</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total.toLocaleString()} products total</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} icon={<Plus className="w-4 h-4" />}>
          Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, SKU, or brand…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full bg-bg-base border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand/50"
          />
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="flex gap-1.5 flex-wrap">
            {PRODUCT_TYPES.map(t => (
              <button
                key={t}
                onClick={() => { setTypeFilter(t); setPage(1) }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  typeFilter === t
                    ? 'bg-brand text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {t === 'ALL' ? 'All Types' : t.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="w-px bg-white/10" />
          <div className="flex gap-1.5 flex-wrap">
            {PRODUCT_STATUSES.map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1) }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-brand text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {s === 'ALL' ? 'All Statuses' : s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Product</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">SKU</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Type</th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Unit Cost</th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">CDU</th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">RRP</th>
                <th className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Stock</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-white/5 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-gray-500">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No products found
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-white/2 transition-colors">
                    {/* Product */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 overflow-hidden flex-shrink-0">
                          {product.images?.[0] ? (
                            <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-4 h-4 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate max-w-[200px]">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.brand?.name}</p>
                        </div>
                      </div>
                    </td>

                    {/* SKU */}
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-gray-400">{product.sku}</span>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-400">{product.productType?.replace('_', ' ') ?? '—'}</span>
                    </td>

                    {/* Unit Cost */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-white">{formatCurrencyFromPounds(product.unitCostPence)}</span>
                    </td>

                    {/* CDU Size */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-gray-300">{product.cduSize}</span>
                    </td>

                    {/* RRP */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-gray-400">{formatCurrencyFromPounds(product.rrpPence)}</span>
                    </td>

                    {/* Stock — inline editable */}
                    <td className="px-4 py-3 text-center">
                      {editingStock?.productId === product.id ? (
                        <div className="flex items-center gap-1 justify-center">
                          <input
                            type="number"
                            min="0"
                            value={editingStock.value}
                            onChange={e => setEditingStock({ productId: product.id, value: e.target.value })}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleStockSave(product.id)
                              if (e.key === 'Escape') setEditingStock(null)
                            }}
                            autoFocus
                            className="w-16 text-center text-sm bg-bg-base border border-brand/50 rounded px-1 py-0.5 text-white focus:outline-none"
                          />
                          <button onClick={() => handleStockSave(product.id)} className="text-emerald-400 hover:text-emerald-300">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingStock(null)} className="text-gray-500 hover:text-gray-300">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingStock({ productId: product.id, value: product.stockUnits.toString() })}
                          className="group flex items-center gap-1 mx-auto"
                        >
                          <span className={`text-sm font-medium ${
                            product.stockUnits === 0 ? 'text-red-400' :
                            product.stockUnits <= (product.lowStockThreshold ?? 10) ? 'text-amber-400' :
                            'text-white'
                          }`}>
                            {product.stockUnits.toLocaleString()}
                          </span>
                          <Edit2 className="w-3 h-3 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <select
                        value={product.status}
                        onChange={e => updateStatusMutation.mutate({ id: product.id, status: e.target.value })}
                        className="bg-transparent text-xs border border-white/10 rounded px-2 py-1 text-gray-300 focus:outline-none focus:border-brand/50 cursor-pointer"
                      >
                        {['ACTIVE', 'LOW_STOCK', 'OUT_OF_STOCK', 'COMING_SOON', 'DISCONTINUED'].map(s => (
                          <option key={s} value={s} className="bg-bg-surface">{s.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      {deleteConfirm === product.id ? (
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-xs text-gray-400">Discontinue?</span>
                          <button
                            onClick={() => deleteProductMutation.mutate(product.id)}
                            className="text-xs text-red-400 hover:text-red-300 font-medium"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-xs text-gray-500 hover:text-gray-300"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(product.id)}
                          className="text-gray-600 hover:text-red-400 transition-colors"
                          title="Discontinue product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
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
              Page {page} of {totalPages} · {total.toLocaleString()} products
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                icon={<ChevronLeft className="w-4 h-4" />}
              >
                Prev
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Product Modal */}
      {showCreateModal && (
        <CreateProductModal onClose={() => setShowCreateModal(false)} onSuccess={() => {
          setShowCreateModal(false)
          queryClient.invalidateQueries({ queryKey: ['admin-products'] })
        }} />
      )}
    </div>
  )
}

function CreateProductModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: '', sku: '', brandName: '', productType: 'BLIND_BOX',
    unitCost: '', cduSize: '6', rrp: '', stockUnits: '0',
    description: '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          sku: form.sku,
          brandName: form.brandName,
          productType: form.productType,
          unitCostPence: Math.round(parseFloat(form.unitCost) * 100),
          cduSize: parseInt(form.cduSize),
          rrpPence: Math.round(parseFloat(form.rrp) * 100),
          stockUnits: parseInt(form.stockUnits),
          description: form.description,
        }),
      })
      if (!res.ok) throw new Error('Failed to create product')
      toast('Product created', 'success')
      onSuccess()
    } catch {
      toast('Failed to create product', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-lg p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Add Product</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="Product Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Labubu The Monsters Series 1" />
          </div>
          <Input label="SKU" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="e.g. POP-LBB-001" />
          <Input label="Brand" value={form.brandName} onChange={e => setForm(f => ({ ...f, brandName: e.target.value }))} placeholder="e.g. POP MART" />

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Type</label>
            <select
              value={form.productType}
              onChange={e => setForm(f => ({ ...f, productType: e.target.value }))}
              className="w-full bg-bg-base border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand/50"
            >
              {['BLIND_BOX', 'FIGURE', 'PLUSH', 'ACCESSORY', 'BUNDLE'].map(t => (
                <option key={t} value={t} className="bg-bg-surface">{t.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          <Input
            label="CDU Size"
            type="number"
            min="1"
            value={form.cduSize}
            onChange={e => setForm(f => ({ ...f, cduSize: e.target.value }))}
            hint="Units per display box"
          />

          <Input
            label="Unit Cost (£)"
            type="number"
            step="0.01"
            value={form.unitCost}
            onChange={e => setForm(f => ({ ...f, unitCost: e.target.value }))}
            placeholder="0.00"
          />
          <Input
            label="RRP (£)"
            type="number"
            step="0.01"
            value={form.rrp}
            onChange={e => setForm(f => ({ ...f, rrp: e.target.value }))}
            placeholder="0.00"
          />
          <div className="col-span-2">
            <Input
              label="Opening Stock"
              type="number"
              min="0"
              value={form.stockUnits}
              onChange={e => setForm(f => ({ ...f, stockUnits: e.target.value }))}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full bg-bg-base border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand/50 resize-none"
              placeholder="Optional product description…"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSubmit} loading={loading} className="flex-1">Create Product</Button>
        </div>
      </div>
    </div>
  )
}
