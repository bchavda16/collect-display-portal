"use client"
import { useEffect, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"

const fmt = (p: number) => new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(p/100)

export function BasketDrawer() {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const router = useRouter()

  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener("open-basket", handler)
    return () => window.removeEventListener("open-basket", handler)
  }, [])

  const { data: basket } = useQuery({
    queryKey: ["basket"],
    queryFn: async () => { const r = await fetch("/api/basket"); return r.json() },
  })

  const removeMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const r = await fetch("/api/basket", {
        method: "DELETE",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ itemId })
      })
      return r.json()
    },
    onSuccess: (data) => { qc.setQueryData(["basket"], data) },
  })

  const clearMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/basket", {
        method: "DELETE",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ clearAll: true })
      })
      return r.json()
    },
    onSuccess: (data) => { qc.setQueryData(["basket"], data) },
  })

  const items = basket?.items ?? []
  const subtotal = basket?.subtotalPence ?? 0
  const vat = basket?.vatPence ?? 0
  const total = basket?.totalPence ?? 0

  if (!open) return null

  return (
    <>
    <style>{`
      .drawer{position:fixed;inset-y:0;right:0;width:380px;background:white;border-left:1px solid rgba(0,0,0,.09);z-index:50;display:flex;flex-direction:column;box-shadow:-4px 0 24px rgba(0,0,0,.1);max-height:100vh}
      .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:49;backdrop-filter:blur(2px)}
      .drawer-header{padding:16px 20px;border-bottom:1px solid rgba(0,0,0,.08);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;background:white}
      .drawer-body{flex:1;overflow-y:auto;padding:12px}
      .drawer-footer{padding:16px 20px;border-top:1px solid rgba(0,0,0,.08);flex-shrink:0;background:white}
      .basket-item{display:flex;align-items:center;gap:10px;padding:10px;background:#f8fafb;border-radius:10px;margin-bottom:8px}
      .item-img{width:52px;height:52px;border-radius:8px;background:#e6f9fa;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0}
      .item-img img{width:100%;height:100%;object-fit:contain}
      .remove-btn{width:28px;height:28px;border-radius:99px;background:#fff1f4;border:none;color:#e11d48;font-size:16px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;font-weight:700;line-height:1}
      .remove-btn:hover{background:#ffd6de}
      .checkout-btn{width:100%;padding:13px;background:#88dde1;color:#0a1420;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;transition:background .15s}
      .checkout-btn:hover{background:#5ecfd4}
      .clear-btn{background:none;border:none;cursor:pointer;color:#e11d48;font-size:12px;font-weight:600;padding:0}
      .clear-btn:hover{text-decoration:underline}
      @media(max-width:768px){
        .drawer{width:100%;left:0;right:0;top:auto;bottom:0;height:90vh;border-radius:20px 20px 0 0;border-left:none;border-top:1px solid rgba(0,0,0,.09)}
      }
    `}</style>

    <div className="drawer-overlay" onClick={()=>setOpen(false)} />
    <div className="drawer">
      <div className="drawer-header">
        <div style={{fontFamily:"system-ui,sans-serif"}}>
          <div style={{fontSize:16,fontWeight:700,color:"#0d1117"}}>Basket</div>
          <div style={{fontSize:12,color:"#8888AA"}}>{items.length} item{items.length!==1?"s":""}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {items.length > 0 && (
            <button className="clear-btn" onClick={()=>clearMutation.mutate()} disabled={clearMutation.isPending}>
              {clearMutation.isPending ? "Clearing…" : "Clear all"}
            </button>
          )}
          <button onClick={()=>setOpen(false)} style={{background:"#f4f4f4",border:"none",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:18,color:"#666",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"system-ui"}}>×</button>
        </div>
      </div>

      <div className="drawer-body">
        {items.length === 0 ? (
          <div style={{textAlign:"center",padding:"48px 16px",fontFamily:"system-ui,sans-serif"}}>
            <div style={{fontSize:40,marginBottom:12}}>🛒</div>
            <div style={{fontWeight:600,color:"#0d1117",marginBottom:4}}>Your basket is empty</div>
            <div style={{fontSize:13,color:"#8888AA"}}>Add products from the stock page</div>
          </div>
        ) : items.map((item: any) => (
          <div key={item.id} className="basket-item">
            <div className="item-img">
              {item.imageUrl ? <img src={item.imageUrl} alt={item.productName} /> : <span style={{fontSize:22}}>🎁</span>}
            </div>
            <div style={{flex:1,minWidth:0,fontFamily:"system-ui,sans-serif"}}>
              <div style={{fontSize:12,fontWeight:600,color:"#0d1117",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.productName}</div>
              <div style={{fontSize:11,color:"#8888AA",marginTop:2}}>×{item.quantity} units · CDU {item.cduSize}</div>
              <div style={{fontSize:13,fontWeight:700,color:"#1a9da3",marginTop:3}}>{fmt(item.lineTotalPence)}</div>
            </div>
            <button className="remove-btn" onClick={()=>removeMutation.mutate(item.id)} disabled={removeMutation.isPending} aria-label="Remove item">×</button>
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <div className="drawer-footer" style={{fontFamily:"system-ui,sans-serif"}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#8888AA",marginBottom:4}}>
            <span>Subtotal (ex. VAT)</span><span>{fmt(subtotal)}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#8888AA",marginBottom:10}}>
            <span>VAT (20%)</span><span>{fmt(vat)}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:16,fontWeight:700,color:"#0d1117",marginBottom:14}}>
            <span>Total</span><span style={{color:"#1a9da3"}}>{fmt(total)}</span>
          </div>
          <button className="checkout-btn" onClick={()=>{setOpen(false);router.push("/checkout")}}>
            Proceed to checkout →
          </button>
        </div>
      )}
    </div>
    </>
  )
}
