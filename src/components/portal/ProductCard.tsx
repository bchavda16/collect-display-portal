'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ShoppingCart, Plus, Minus, Package, Check } from 'lucide-react'
import { ProductBadgeChip } from '@/components/ui/Badge'
import { useAddToBasket } from '@/hooks/useBasket'
import { formatCurrencyFromPounds } from '@/lib/utils'
import type { ProductWithBrand } from '@/types'

interface ProductCardProps {
  product: ProductWithBrand
}

export function ProductCard({ product }: ProductCardProps) {
  const [qty, setQty] = useState(product.cduSize)
  const [added, setAdded] = useState(false)
  const addToBasket = useAddToBasket()

  const isAvailable = product.status !== 'OUT_OF_STOCK' && product.status !== 'DISCONTINUED'
  const isComingSoon = product.status === 'COMING_SOON'

  const step = product.cduSize
  const max = Math.floor(product.stockUnits / step) * step || step

  const increment = () => setQty(q => Math.min(q + step, max))
  const decrement = () => setQty(q => Math.max(step, q - step))

  const handleAdd = async () => {
    await addToBasket.mutateAsync({ productId: product.id, quantity: qty })
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  const cduCost = product.unitCostPence * product.cduSize

  return (
    <div className="gradient-border rounded-xl bg-white border border-border shadow-card hover:shadow-card-hover transition-all duration-200 group overflow-hidden">
      {/* Image area */}
      <div className="relative aspect-square bg-bg-surface overflow-hidden">
        {product.images?.[0] ? (
          <Image
            src={product.images[0].url}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="w-12 h-12 text-text-muted/30" />
          </div>
        )}

        {/* Status overlay for out of stock / coming soon */}
        {!isAvailable && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
            <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${
              isComingSoon
                ? 'bg-bg-elevated text-text-secondary border border-border'
                : 'bg-rose-light text-rose border border-rose/20'
            }`}>
              {isComingSoon ? 'Coming Soon' : 'Out of Stock'}
            </span>
          </div>
        )}

        {/* Badges */}
        {product.badges && product.badges.length > 0 && (
          <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
            {product.badges.map((badge: any) => (
              <ProductBadgeChip key={badge} badge={badge} />
            ))}
          </div>
        )}

        {/* CDU size pill */}
        <div className="absolute bottom-2.5 right-2.5">
          <span className="text-[10px] font-semibold bg-white/90 backdrop-blur-sm border border-border rounded-full px-2 py-0.5 text-text-secondary">
            CDU × {product.cduSize}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Brand & name */}
        <div>
          {product.brand && (
            <p className="text-[11px] font-semibold text-teal-dark uppercase tracking-wide mb-0.5">
              {product.brand.name}
            </p>
          )}
          <h3 className="text-sm font-semibold text-text-primary leading-snug line-clamp-2">
            {product.name}
          </h3>
          <p className="text-[11px] text-text-muted font-mono mt-0.5">{product.sku}</p>
        </div>

        {/* Price grid */}
        <div className="grid grid-cols-3 gap-1 bg-bg-surface rounded-lg p-2.5 border border-border/50">
          <PriceCol label="Unit" value={formatCurrencyFromPounds(product.unitCostPence)} />
          <PriceCol label={`CDU (×${product.cduSize})`} value={formatCurrencyFromPounds(cduCost)} highlight />
          <PriceCol label="RRP" value={formatCurrencyFromPounds(product.rrpPence)} muted />
        </div>

        {/* Stock */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-muted">Stock</span>
          <span className={`font-medium ${
            product.stockUnits === 0 ? 'text-rose' :
            product.stockUnits <= (product.lowStockThreshold ?? 10) ? 'text-amber' :
            'text-emerald'
          }`}>
            {product.stockUnits.toLocaleString()} units
          </span>
        </div>

        {/* Add to basket */}
        {isAvailable && !isComingSoon && (
          <div className="flex gap-2 pt-1">
            {/* Qty stepper */}
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <button
                onClick={decrement}
                disabled={qty <= step}
                className="px-2.5 py-2 text-text-muted hover:bg-bg-elevated hover:text-text-primary disabled:opacity-30 transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="px-2.5 text-sm font-semibold text-text-primary min-w-[2.5rem] text-center">
                {qty}
              </span>
              <button
                onClick={increment}
                disabled={qty >= max}
                className="px-2.5 py-2 text-text-muted hover:bg-bg-elevated hover:text-text-primary disabled:opacity-30 transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* Add button */}
            <button
              onClick={handleAdd}
              disabled={addToBasket.isPending || added}
              className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg py-2 transition-all duration-200 ${
                added
                  ? 'bg-emerald-light text-emerald border border-emerald/25'
                  : 'bg-brand hover:bg-brand-hover text-white shadow-sm'
              }`}
            >
              {added ? (
                <><Check className="w-3.5 h-3.5" /> Added</>
              ) : (
                <><ShoppingCart className="w-3.5 h-3.5" /> Add</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function PriceCol({ label, value, highlight, muted }: { label: string; value: string; highlight?: boolean; muted?: boolean }) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-text-muted mb-0.5">{label}</p>
      <p className={`text-xs font-semibold ${
        highlight ? 'text-brand-dark' : muted ? 'text-text-muted' : 'text-text-primary'
      }`}>
        {value}
      </p>
    </div>
  )
}
