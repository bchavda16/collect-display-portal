'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { useBasket, useUpdateBasketItem, useClearBasket } from '@/hooks/useBasket'
import { formatCurrencyFromPounds } from '@/lib/utils'

export function BasketDrawer() {
  const [open, setOpen] = useState(false)
  const { data: basket, isLoading } = useBasket()
  const updateItem = useUpdateBasketItem()
  const clearBasket = useClearBasket()

  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('open-basket', handler)
    return () => window.removeEventListener('open-basket', handler)
  }, [])

  const items = basket?.items ?? []
  const subtotal = basket?.subtotalPence ?? 0
  const vat = basket?.vatPence ?? 0
  const total = basket?.totalPence ?? 0

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40"
        onClick={() => setOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-border z-50 flex flex-col shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-brand" />
            <h2 className="font-semibold text-text-primary">
              Basket
              {items.length > 0 && (
                <span className="ml-2 text-sm font-normal text-text-muted">({items.length} line{items.length !== 1 ? 's' : ''})</span>
              )}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={() => clearBasket.mutate()}
                className="text-xs text-text-muted hover:text-rose transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            )}
            <button onClick={() => setOpen(false)} className="text-text-muted hover:text-text-primary transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-bg-elevated rounded-lg animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-brand-light flex items-center justify-center mb-4">
                <ShoppingCart className="w-8 h-8 text-brand" />
              </div>
              <p className="text-sm font-medium text-text-primary mb-1">Your basket is empty</p>
              <p className="text-xs text-text-muted">Add items from the Live Stock page</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {items.map(item => (
                <div key={item.id} className="flex gap-3 p-3 rounded-xl bg-bg-surface border border-border">
                  {/* Image */}
                  <div className="w-12 h-12 rounded-lg bg-bg-elevated border border-border overflow-hidden flex-shrink-0">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted/40 text-xs font-bold">
                        {item.productName[0]}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-text-primary truncate">{item.productName}</p>
                    <p className="text-[10px] text-text-muted font-mono">{item.sku}</p>
                    <p className="text-xs text-brand-dark font-semibold mt-0.5">
                      {formatCurrencyFromPounds(item.lineTotalPence)}
                    </p>
                  </div>

                  {/* Qty stepper */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => updateItem.mutate({ itemId: item.id, quantity: item.quantity - item.cduSize })}
                      className="w-6 h-6 rounded-full bg-bg-elevated hover:bg-border border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <span className="text-xs font-semibold text-text-primary w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateItem.mutate({ itemId: item.id, quantity: item.quantity + item.cduSize })}
                      className="w-6 h-6 rounded-full bg-bg-elevated hover:bg-border border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals + Checkout */}
        {items.length > 0 && (
          <div className="border-t border-border p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Subtotal (ex. VAT)</span>
                <span className="font-medium text-text-primary">{formatCurrencyFromPounds(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">VAT (20%)</span>
                <span className="text-text-muted">{formatCurrencyFromPounds(vat)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t border-border pt-2">
                <span className="text-text-primary">Total (inc. VAT)</span>
                <span className="text-brand-dark text-base">{formatCurrencyFromPounds(total)}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-3 bg-brand hover:bg-brand-hover text-white font-semibold rounded-xl transition-colors shadow-sm"
            >
              <ShoppingCart className="w-4 h-4" />
              Proceed to Checkout
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
