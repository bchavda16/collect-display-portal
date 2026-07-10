"use client"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"

export default function CheckoutPage() {
  const router = useRouter()
  const [poRef, setPoRef] = useState("")
  const [deliveryDate, setDeliveryDate] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState<string|null>(null)

  const { data: basket } = useQuery({
    queryKey: ["basket"],
    queryFn: async () => { const r = await fetch("/api/basket"); return r.json() },
  })

  const items = basket?.items ?? []
  const subtotal = basket?.subtotalPence ?? 0
  const vat = basket?.vatPence ?? 0
  const total = basket?.totalPence ?? 0

  const handleSubmit = async () => {
    if (!poRef.trim()) { setError("PO Reference is required"); return }
    setLoading(true); setError("")
    const r = await fetch("/api/orders", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ poReference: poRef, requestedDeliveryDate: deliveryDate || undefined, deliveryNotes: notes || undefined })
    })
    const d = await r.json()
    setLoading(false)
    if (d.success) {
      setSuccess(d.data.orderNumber)
    } else {
      setError(d.error ?? "Failed to place order")
    }
  }

  if (success) {
    return (
      <>
      <style>{`.checkout-page{padding:24px;font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;text-align:center;padding-top:80px}.success-icon{font-size:64px;margin-bottom:16px}.success-title{font-size:22px;font-weight:700;color:#1A1A2E;margin:0 0 8px}.success-sub{font-size:14px;color:#8888AA;margin:0 0 32px}.btn-pink{display:inline-flex;align-items:center;gap:6px;padding:10px 20px;background:#F0A3BC;color:white;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;margin:0 6px}.btn-ghost{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;background:white;color:#4A4A6A;border:1px solid rgba(0,0,0,.12);border-radius:10px;font-size:14px;font-weight:500;cursor:pointer;text-decoration:none;margin:0 6px}`}</style>
      <div className="checkout-page">
        <div className="success-icon">🎉</div>
        <h1 className="success-title">Order placed!</h1>
        <p className="success-sub">{success} has been submitted successfully. You will receive a confirmation email shortly.</p>
        <div><Link href="/orders" className="btn-pink">View my orders</Link><Link href="/stock" className="btn-ghost">Continue shopping</Link></div>
      </div>
      </>
    )
  }

  if (items.length === 0) {
    return (
      <>
      <style>{`.checkout-page{padding:24px;font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;text-align:center;padding-top:80px}.btn-pink{display:inline-flex;padding:10px 20px;background:#F0A3BC;color:white;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none}`}</style>
      <div className="checkout-page">
        <div style={{fontSize:48,marginBottom:16}}>🛒</div>
        <h1 style={{fontSize:20,fontWeight:700,color:"#1A1A2E",marginBottom:8}}>Your basket is empty</h1>
        <p style={{fontSize:13,color:"#8888AA",marginBottom:24}}>Add some products before checking out</p>
        <Link href="/stock" className="btn-pink">Browse stock</Link>
      </div>
      </>
    )
  }

  return (
    <>
    <style>{`
      body{font-family:system-ui,sans-serif}
      .checkout-page{padding:24px;max-width:900px}
      .page-title{font-size:22px;font-weight:700;color:#1A1A2E;margin:0 0 24px}
      .checkout-grid{display:grid;grid-template-columns:1fr 340px;gap:24px;align-items:start}
      .card{background:white;border:1px solid rgba(0,0,0,.09);border-radius:14px;box-shadow:0 1px 4px rgba(0,0,0,.05)}
      .card-head{padding:14px 20px;border-bottom:1px solid rgba(0,0,0,.07);font-size:14px;font-weight:600;color:#1A1A2E}
      .card-body{padding:20px}
      .form-group{margin-bottom:18px}
      .form-label{display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#4A4A6A;margin-bottom:7px}
      .form-input{width:100%;padding:11px 14px;border:1.5px solid rgba(0,0,0,.12);border-radius:10px;font-size:14px;color:#1A1A2E;outline:none;box-sizing:border-box;background:white;transition:border-color .15s}
      .form-input:focus{border-color:#F0A3BC;box-shadow:0 0 0 3px rgba(240,163,188,.15)}
      .form-hint{font-size:11px;color:#8888AA;margin-top:5px}
      .submit-btn{width:100%;padding:14px;background:#F0A3BC;color:white;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;transition:background .15s}
      .submit-btn:hover{background:#E88BAA}
      .submit-btn:disabled{opacity:.6;cursor:not-allowed}
      .error-box{background:#FFF1F4;border:1px solid rgba(225,29,72,.2);border-radius:8px;padding:10px 14px;font-size:13px;color:#E11D48;margin-bottom:16px}
      .line-item{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid rgba(0,0,0,.06)}
      .line-item:last-child{border-bottom:none}
      .line-name{font-size:13px;font-weight:500;color:#1A1A2E;margin:0 0 2px}
      .line-meta{font-size:11px;color:#8888AA;margin:0}
      .line-price{font-size:13px;font-weight:600;color:#1A1A2E;flex-shrink:0}
      .totals-row{display:flex;justify-content:space-between;font-size:13px;color:#8888AA;padding:5px 0}
      .totals-final{display:flex;justify-content:space-between;font-size:16px;font-weight:700;color:#C4638A;padding-top:10px;border-top:1.5px solid rgba(0,0,0,.08);margin-top:6px}
    `}</style>
    <div className="checkout-page">
      <h1 className="page-title">Checkout</h1>
      <div className="checkout-grid">
        <div className="card">
          <div className="card-head">Order Details</div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">PO Reference *</label>
              <input className="form-input" value={poRef} onChange={e=>setPoRef(e.target.value)} placeholder="e.g. PO-2026-001" />
              <p className="form-hint">Your internal purchase order number</p>
            </div>
            <div className="form-group">
              <label className="form-label">Requested Delivery Date</label>
              <input className="form-input" type="date" value={deliveryDate} onChange={e=>setDeliveryDate(e.target.value)} />
              <p className="form-hint">We will do our best to meet your preferred date</p>
            </div>
            <div className="form-group">
              <label className="form-label">Delivery Notes</label>
              <textarea className="form-input" rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Special delivery instructions, access notes…" style={{resize:"none"}} />
            </div>
            {error && <div className="error-box">{error}</div>}
            <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
              {loading ? "Placing order…" : "Place Order · "+formatCurrency(total)}
            </button>
            <p style={{fontSize:11,color:"#8888AA",textAlign:"center",marginTop:12}}>By placing this order you agree to our <a href="#" style={{color:"#F0A3BC"}}>terms of trade</a>.</p>
          </div>
        </div>

        <div className="card">
          <div className="card-head">Summary ({items.length} {items.length===1?"line":"lines"})</div>
          <div className="card-body" style={{paddingBottom:0}}>
            {items.map((item: any) => (
              <div key={item.id} className="line-item">
                <div style={{minWidth:0}}>
                  <p className="line-name">{item.productName}</p>
                  <p className="line-meta">×{item.quantity} units</p>
                </div>
                <span className="line-price">{formatCurrency(item.lineTotalPence)}</span>
              </div>
            ))}
          </div>
          <div style={{padding:"14px 20px"}}>
            <div className="totals-row"><span>Subtotal (ex. VAT)</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="totals-row"><span>VAT (20%)</span><span>{formatCurrency(vat)}</span></div>
            <div className="totals-final"><span>Total</span><span>{formatCurrency(total)}</span></div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
