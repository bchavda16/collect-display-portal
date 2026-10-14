"use client"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import Link from "next/link"

const fmt = (p: number) => new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(p/100)

export default function CheckoutPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [poRef, setPoRef] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [removing, setRemoving] = useState<string|null>(null)
  const [clearing, setClearing] = useState(false)

  const { data: account } = useQuery({
    queryKey: ["account"],
    queryFn: async () => { const r = await fetch("/api/account"); return r.json() },
  })

  const { data: basket } = useQuery({
    queryKey: ["basket"],
    queryFn: async () => { const r = await fetch("/api/basket"); return r.json() },
  })

  const items = basket?.items ?? []
  const subtotal = basket?.subtotalPence ?? 0
  const vat = basket?.vatPence ?? 0
  const total = basket?.totalPence ?? 0

  const removeItem = async (itemId: string) => {
    setRemoving(itemId)
    const r = await fetch("/api/basket", { method:"DELETE", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ itemId }) })
    const d = await r.json()
    qc.setQueryData(["basket"], d)
    setRemoving(null)
  }

  const clearBasket = async () => {
    setClearing(true)
    const r = await fetch("/api/basket", { method:"DELETE", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ clearAll: true }) })
    const d = await r.json()
    qc.setQueryData(["basket"], d)
    setClearing(false)
  }

  const handleOrder = async () => {
    if (!poRef.trim()) { setError("PO Reference is required"); return }
    setLoading(true); setError("")
    const r = await fetch("/api/orders", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ poReference: poRef, deliveryNotes: notes || undefined }) })
    const d = await r.json()
    setLoading(false)
    if (d.error) { setError(d.error); return }
    qc.invalidateQueries({queryKey:["basket"]})
    router.push("/orders/" + d.data?.id)
  }

  if (account && !account.hasAddress) {
    return (
      <div style={{padding:24,fontFamily:"'Inter',system-ui",textAlign:"center",paddingTop:80}}>
        <div style={{fontSize:48,marginBottom:16}}>📋</div>
        <h2 style={{fontSize:20,fontWeight:700,color:"#1c1c1e",margin:"0 0 8px"}}>Add delivery address first</h2>
        <p style={{fontSize:14,color:"#8e8e93",margin:"0 0 24px"}}>We need your delivery address before you can place an order.</p>
        <Link href="/account" style={{display:"inline-block",padding:"13px 28px",background:"#88dde1",color:"white",borderRadius:14,fontSize:15,fontWeight:600,textDecoration:"none"}}>Go to account settings</Link>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div style={{padding:24,fontFamily:"'Inter',system-ui",textAlign:"center",paddingTop:80}}>
        <div style={{fontSize:48,marginBottom:16}}>🛒</div>
        <h2 style={{fontSize:20,fontWeight:700,color:"#1c1c1e",margin:"0 0 8px"}}>Your basket is empty</h2>
        <p style={{fontSize:14,color:"#8e8e93",margin:"0 0 24px"}}>Add products from the stock page to get started.</p>
        <Link href="/stock" style={{display:"inline-block",padding:"13px 28px",background:"#88dde1",color:"white",borderRadius:14,fontSize:15,fontWeight:600,textDecoration:"none"}}>Browse stock</Link>
      </div>
    )
  }

  return (
    <>
    <style>{`
      .co{padding:16px;font-family:'Inter',system-ui,sans-serif;background:#f2f2f7;min-height:100vh;max-width:640px;margin:0 auto}
      .co h1{font-size:22px;font-weight:800;color:#1c1c1e;margin:0 0 20px;letter-spacing:-.5px}
      .co-section{background:white;border-radius:16px;overflow:hidden;margin-bottom:16px}
      .co-row{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid #f2f2f7}
      .co-row:last-child{border-bottom:none}
      .co-item-img{width:44px;height:44px;border-radius:8px;background:#f2f2f7;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden}
      .co-item-img img{width:100%;height:100%;object-fit:contain}
      .co-label{font-size:13px;font-weight:600;color:#8e8e93;padding:12px 16px 6px}
      .co-input{width:100%;padding:13px 16px;border:none;border-bottom:1px solid #f2f2f7;font-size:16px;color:#1c1c1e;background:transparent;outline:none;font-family:inherit}
      .co-input:last-child{border-bottom:none}
      .co-input::placeholder{color:#c7c7cc}
      .co-total-row{display:flex;justify-content:space-between;padding:10px 16px;font-size:14px;color:#8e8e93;border-bottom:1px solid #f2f2f7}
      .co-total-final{display:flex;justify-content:space-between;padding:12px 16px;font-size:17px;font-weight:700;color:#1c1c1e}
      .co-btn{width:100%;padding:16px;background:#88dde1;color:white;border:none;border-radius:14px;font-size:16px;font-weight:600;cursor:pointer;font-family:inherit;transition:background .15s}
      .co-btn:active{background:#0062cc}
      .co-btn:disabled{opacity:.4;cursor:not-allowed}
      .co-err{background:#fff2f2;border:1px solid #ffcdd2;border-radius:12px;padding:12px 16px;font-size:13px;color:#d32f2f;margin-bottom:16px}
    `}</style>
    <div className="co">
      <h1>Checkout</h1>

      {/* Order items */}
      <div className="co-section">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px 8px"}}>
          <span style={{fontSize:13,fontWeight:600,color:"#8e8e93"}}>Order summary</span>
          <button onClick={clearBasket} disabled={clearing} style={{background:"none",border:"none",cursor:"pointer",color:"#e11d48",fontSize:13,fontWeight:600,padding:0,fontFamily:"inherit"}}>{clearing?"Clearing…":"Clear all"}</button>
        </div>
        {items.map((item: any) => (
          <div key={item.id} className="co-row">
            <div className="co-item-img">
              {item.imageUrl ? <img src={item.imageUrl} alt={item.productName} /> : <span style={{fontSize:20}}>🎁</span>}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:"#1c1c1e",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.productName}</div>
              <div style={{fontSize:12,color:"#8e8e93"}}>×{item.quantity} units</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
              <div style={{fontSize:14,fontWeight:600,color:"#1c1c1e"}}>{fmt(item.lineTotalPence)}</div>
              <button onClick={()=>removeItem(item.id)} disabled={removing===item.id}
                style={{width:28,height:28,borderRadius:"50%",background:"#fff1f4",border:"none",color:"#e11d48",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,flexShrink:0}}>
                {removing===item.id?"…":"×"}
              </button>
            </div>
          </div>
        ))}
        <div className="co-total-row"><span>Subtotal (ex. VAT)</span><span>{fmt(subtotal)}</span></div>
        <div className="co-total-row"><span>VAT (20%)</span><span>{fmt(vat)}</span></div>
        <div className="co-total-final"><span>Total</span><span style={{color:"#88dde1"}}>{fmt(total)}</span></div>
      </div>

      {/* Order details */}
      <div className="co-section">
        <div className="co-label">Order details</div>
        <input className="co-input" placeholder="PO Reference (required)" value={poRef} onChange={e=>setPoRef(e.target.value)} />
        <input className="co-input" placeholder="Delivery notes (optional)" value={notes} onChange={e=>setNotes(e.target.value)} />
      </div>

      {/* Delivery address */}
      {account?.addresses?.[0] && (
        <div className="co-section">
          <div className="co-label">Delivering to</div>
          <div style={{padding:"10px 16px 14px",fontSize:13,color:"#1c1c1e",lineHeight:1.7}}>
            {account.addresses[0].line1}<br/>
            {account.addresses[0].line2 && <>{account.addresses[0].line2}<br/></>}
            {account.addresses[0].city}, {account.addresses[0].postcode}
          </div>
        </div>
      )}

      {error && <div className="co-err">{error}</div>}

      <button className="co-btn" onClick={handleOrder} disabled={loading}>
        {loading ? "Placing order…" : `Place order · ${fmt(total)}`}
      </button>

      <p style={{textAlign:"center",fontSize:12,color:"#8e8e93",marginTop:12}}>
        By placing this order you agree to our trading terms.
      </p>
    </div>
    </>
  )
}
