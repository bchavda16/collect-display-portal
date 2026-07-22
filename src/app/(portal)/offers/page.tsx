"use client"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

const fmt = (p: number) => new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(p/100)

const STATUS: Record<string,{bg:string;color:string;label:string}> = {
  PENDING:   {bg:"#FEF3C7",color:"#D97706",label:"Pending"},
  ACCEPTED:  {bg:"#EAFAF3",color:"#0EA572",label:"Accepted"},
  DECLINED:  {bg:"#FFF1F4",color:"#E11D48",label:"Declined"},
  COUNTERED: {bg:"#F0F0FF",color:"#6366F1",label:"Counter-offer"},
  EXPIRED:   {bg:"#F4F5F7",color:"#8888AA",label:"Expired"},
  COMPLETED: {bg:"#E8F8F7",color:"#3A9E9B",label:"Completed"},
}

function timeLeft(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return null
  const hrs = Math.floor(diff / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  if (hrs > 0) return `${hrs}h ${mins}m left`
  return `${mins}m left`
}

export default function OffersPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState("ALL")
  const [addedToBasket, setAddedToBasket] = useState<Set<string>>(new Set())
  const [counterModal, setCounterModal] = useState<any>(null)
  const [counterPrice, setCounterPrice] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["my-offers", filter],
    queryFn: async () => {
      const p = new URLSearchParams(filter !== "ALL" ? {status: filter} : {})
      const r = await fetch("/api/offers?" + p); return r.json()
    },
  })

  const addToBasketMutation = useMutation({
    mutationFn: async (offer: any) => {
      const agreedPrice = offer.counterPricePence ?? offer.offeredPricePence
      const r = await fetch("/api/basket", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ productId: offer.productId, quantity: offer.quantity, unitCostPence: agreedPrice })
      })
      return r.json()
    },
    onSuccess: (_, offer) => {
      qc.invalidateQueries({queryKey:["basket"]})
      setAddedToBasket(prev => new Set([...prev, offer.id]))
    },
  })

  const counterMutation = useMutation({
    mutationFn: async ({ id, price }: any) => {
      const r = await fetch("/api/offers/"+id, {
        method: "PUT",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ action: "accept_counter" })
      })
      return r.json()
    },
    onSuccess: () => { qc.invalidateQueries({queryKey:["my-offers"]}); setCounterModal(null) },
  })

  const acceptCounterMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch("/api/offers/"+id, {
        method: "PUT",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ action: "accept_counter" })
      })
      return r.json()
    },
    onSuccess: () => { qc.invalidateQueries({queryKey:["my-offers"]}) },
  })

  const declineCounterMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch("/api/offers/"+id, {
        method: "PUT",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ action: "decline_counter" })
      })
      return r.json()
    },
    onSuccess: () => { qc.invalidateQueries({queryKey:["my-offers"]}) },
  })

  const offers = data?.data ?? []

  return (
    <>
    <style>{`
      .offers-page{padding:20px;font-family:system-ui,sans-serif;max-width:700px}
      .offers-title{font-size:22px;font-weight:800;color:#0d1117;margin:0 0 4px;letter-spacing:-.5px}
      .offers-sub{font-size:13px;color:#8888AA;margin:0 0 20px}
      .filter-scroll{display:flex;gap:6px;overflow-x:auto;padding-bottom:8px;margin-bottom:20px;scrollbar-width:none}
      .filter-scroll::-webkit-scrollbar{display:none}
      .chip{padding:6px 14px;border-radius:99px;font-size:12px;font-weight:500;border:none;cursor:pointer;flex-shrink:0;transition:all .15s;white-space:nowrap}
      .chip-on{background:#88dde1;color:#0a1420;font-weight:700}
      .chip-off{background:#F4F5F7;color:#4A4A6A}
      .offer-card{background:white;border:1px solid rgba(0,0,0,.08);border-radius:14px;padding:18px;margin-bottom:12px}
      .offer-badge{display:inline-flex;padding:4px 12px;border-radius:99px;font-size:11px;font-weight:700}
      .offer-product{font-size:15px;font-weight:700;color:#0d1117;margin:10px 0 4px}
      .offer-sku{font-size:11px;color:#AAAAAA;font-family:monospace;margin:0 0 14px}
      .offer-prices{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}
      .price-box{background:#f8fafb;border-radius:8px;padding:10px 12px;text-align:center}
      .price-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#AAAAAA;margin:0 0 4px}
      .price-val{font-size:14px;font-weight:700;color:#0d1117;margin:0}
      .price-val.green{color:#0EA572}
      .price-val.cyan{color:#1a9da3}
      .btn-add{width:100%;padding:12px;background:#88dde1;color:#0a1420;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;transition:all .15s;margin-top:4px}
      .btn-add:hover{background:#5ecfd4}
      .btn-add.done{background:#22c55e;color:white}
      .btn-add:disabled{opacity:.6;cursor:not-allowed}
      .expiry{font-size:11px;font-weight:600;color:#D97706;background:#FEF3C7;padding:4px 10px;border-radius:99px;display:inline-block;margin-bottom:12px}
      .expiry.urgent{color:#E11D48;background:#FFF1F4}
      .counter-btns{display:flex;gap:8px;margin-top:12px}
      .btn-accept{flex:1;padding:10px;background:#EAFAF3;color:#0EA572;border:1.5px solid rgba(14,165,114,.3);border-radius:10px;font-size:13px;font-weight:600;cursor:pointer}
      .btn-decline{flex:1;padding:10px;background:#FFF1F4;color:#E11D48;border:1.5px solid rgba(225,29,72,.2);border-radius:10px;font-size:13px;font-weight:600;cursor:pointer}
      .note-box{background:#f0fafb;border-left:3px solid #88dde1;padding:10px 14px;border-radius:0 8px 8px 0;font-size:12px;color:#444;margin-top:10px}
      .empty{text-align:center;padding:48px 16px;background:white;border-radius:14px;border:1px solid rgba(0,0,0,.08)}
      .overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);backdrop-filter:blur(2px);z-index:50;display:flex;align-items:center;justify-content:center;padding:16px}
      .modal{background:white;border-radius:16px;padding:28px;max-width:400px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.15)}
    `}</style>

    <div className="offers-page">
      <h1 className="offers-title">My Offers</h1>
      <p className="offers-sub">{offers.length} offer{offers.length!==1?"s":""}</p>

      <div className="filter-scroll">
        {["ALL","PENDING","ACCEPTED","COUNTERED","DECLINED","EXPIRED","COMPLETED"].map(f=>(
          <button key={f} className={"chip "+(filter===f?"chip-on":"chip-off")} onClick={()=>setFilter(f)}>
            {f==="ALL"?"All":STATUS[f]?.label??f}
          </button>
        ))}
      </div>

      {isLoading ? <p style={{color:"#AAAAAA",fontSize:13}}>Loading…</p>
      : offers.length===0 ? (
        <div className="empty">
          <div style={{fontSize:40,marginBottom:12}}>💬</div>
          <p style={{fontWeight:600,color:"#0d1117",margin:"0 0 6px"}}>No offers yet</p>
          <p style={{fontSize:13,color:"#AAAAAA",margin:0}}>Browse stock and click "Make an Offer" on any product</p>
        </div>
      ) : offers.map((offer: any) => {
        const sc = STATUS[offer.status] ?? {bg:"#F4F5F7",color:"#8888AA",label:offer.status}
        const agreedPrice = offer.counterPricePence ?? offer.offeredPricePence
        const isAdded = addedToBasket.has(offer.id)
        const expires = offer.expiresAt ? timeLeft(offer.expiresAt) : null
        const isUrgent = expires && expires.includes("m left") && !expires.includes("h")

        return (
          <div key={offer.id} className="offer-card">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
              <span className="offer-badge" style={{background:sc.bg,color:sc.color}}>{sc.label}</span>
              <span style={{fontSize:11,color:"#AAAAAA"}}>{new Date(offer.createdAt).toLocaleDateString("en-GB")}</span>
            </div>

            <p className="offer-product">{offer.product?.name ?? "Product"}</p>
            <p className="offer-sku">{offer.product?.sku} · {offer.quantity} units</p>

            {expires && (
              <div className={"expiry"+(isUrgent?" urgent":"")}>
                ⏱ {expires} to add to basket
              </div>
            )}

            <div className="offer-prices">
              <div className="price-box">
                <p className="price-lbl">Listed Price</p>
                <p className="price-val">{fmt(offer.product?.unitCostPence ?? 0)}</p>
              </div>
              <div className="price-box">
                <p className="price-lbl">Your Offer</p>
                <p className="price-val green">{fmt(offer.offeredPricePence)}</p>
              </div>
              {offer.counterPricePence && (
                <div className="price-box" style={{background:"#f0fafb",border:"1px solid rgba(136,221,225,.3)"}}>
                  <p className="price-lbl">Counter</p>
                  <p className="price-val cyan">{fmt(offer.counterPricePence)}</p>
                </div>
              )}
            </div>

            {offer.adminNote && (
              <div className="note-box">💬 {offer.adminNote}</div>
            )}

            {/* ACCEPTED — show Add to Basket */}
            {offer.status === "ACCEPTED" && (
              <button
                className={"btn-add"+(isAdded?" done":"")}
                onClick={()=>addToBasketMutation.mutate(offer)}
                disabled={isAdded || addToBasketMutation.isPending}
              >
                {isAdded ? "✓ Added to Basket" : `+ Add to Basket at ${fmt(agreedPrice)}/unit`}
              </button>
            )}

            {/* COUNTERED — accept or decline */}
            {offer.status === "COUNTERED" && (
              <div className="counter-btns">
                <button className="btn-decline" onClick={()=>declineCounterMutation.mutate(offer.id)}
                  disabled={declineCounterMutation.isPending}>
                  Decline
                </button>
                <button className="btn-accept" onClick={()=>acceptCounterMutation.mutate(offer.id)}
                  disabled={acceptCounterMutation.isPending}>
                  Accept {fmt(offer.counterPricePence!)}/unit
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
    </>
  )
}
