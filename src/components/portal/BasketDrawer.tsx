"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { formatCurrency } from "@/lib/utils"

export function BasketDrawer() {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()

  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener("open-basket", handler)
    return () => window.removeEventListener("open-basket", handler)
  }, [])

  const { data: basket, isLoading } = useQuery({
    queryKey: ["basket"],
    queryFn: async () => { const r = await fetch("/api/basket"); return r.json() },
    enabled: open,
  })

  const updateMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: any) => {
      const r = await fetch("/api/basket", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({itemId,quantity}) })
      return r.json()
    },
    onSuccess: () => qc.invalidateQueries({queryKey:["basket"]}),
  })

  const clearMutation = useMutation({
    mutationFn: async () => { const r = await fetch("/api/basket", {method:"DELETE"}); return r.json() },
    onSuccess: () => qc.invalidateQueries({queryKey:["basket"]}),
  })

  const items = basket?.items ?? []
  const subtotal = basket?.subtotalPence ?? 0
  const vat = basket?.vatPence ?? 0
  const total = basket?.totalPence ?? 0

  if (!open) return null

  return (
    <>
    <style>{`
      .drawer{position:fixed;inset-y:0;right:0;width:380px;background:white;border-left:1px solid rgba(0,0,0,.09);z-index:50;display:flex;flex-direction:column;box-shadow:-4px 0 24px rgba(0,0,0,.1)}
      .drawer-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(0,0,0,.08)}
      .drawer-body{flex:1;overflow-y:auto;padding:16px}
      .drawer-footer{border-top:1px solid rgba(0,0,0,.08);padding:16px}
      .backdrop{position:fixed;inset:0;background:rgba(0,0,0,.25);z-index:49}
      .basket-item{display:flex;gap:12px;padding:12px;background:#FAFBFC;border:1px solid rgba(0,0,0,.07);border-radius:10px;margin-bottom:8px}
      .stepper{display:flex;align-items:center;border:1px solid rgba(0,0,0,.12);border-radius:6px;overflow:hidden}
      .stepper button{background:#F4F5F7;border:none;padding:4px 8px;font-size:14px;cursor:pointer;color:#4A4A6A}
      .stepper span{font-size:12px;font-weight:600;padding:0 6px;color:#1A1A2E;min-width:26px;text-align:center}
      .checkout-btn{display:block;width:100%;padding:12px;background:#F0A3BC;color:white;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;text-align:center;text-decoration:none;margin-top:12px}
      .checkout-btn:hover{background:#E88BAA}
      .close-btn{background:none;border:none;cursor:pointer;color:#8888AA;font-size:20px;padding:0}
      .clear-btn{background:none;border:none;cursor:pointer;color:#8888AA;font-size:12px;text-decoration:underline;padding:0}
      .summary-row{display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px}
      .summary-total{display:flex;justify-content:space-between;font-size:15px;font-weight:700;color:#C4638A;border-top:1px solid rgba(0,0,0,.08);padding-top:10px;margin-top:6px}
    `}</style>
    <div className="backdrop" onClick={()=>setOpen(false)} />
    <div className="drawer">
      <div className="drawer-header">
        <div>
          <span style={{fontWeight:700,fontSize:15,color:"#1A1A2E"}}>🛒 Basket</span>
          {items.length>0&&<span style={{fontSize:12,color:"#8888AA",marginLeft:8}}>({items.length} line{items.length!==1?"s":""})</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {items.length>0&&<button className="clear-btn" onClick={()=>clearMutation.mutate()}>Clear all</button>}
          <button className="close-btn" onClick={()=>setOpen(false)}>×</button>
        </div>
      </div>
      <div className="drawer-body">
        {isLoading ? <p style={{color:"#8888AA",fontSize:13,textAlign:"center",paddingTop:32}}>Loading…</p>
        : items.length===0 ? (
          <div style={{textAlign:"center",paddingTop:48}}>
            <div style={{fontSize:40,marginBottom:12}}>🛒</div>
            <p style={{fontWeight:600,color:"#1A1A2E",margin:"0 0 4px"}}>Your basket is empty</p>
            <p style={{fontSize:13,color:"#8888AA",margin:0}}>Add items from Live Stock</p>
          </div>
        ) : items.map((item: any) => (
          <div key={item.id} className="basket-item">
            
            <div style={{flex:1,minWidth:0}}>
              <p style={{fontSize:12,fontWeight:600,color:"#1A1A2E",margin:"0 0 2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.productName}</p>
              <p style={{fontSize:11,color:"#8888AA",fontFamily:"monospace",margin:"0 0 6px"}}>{item.sku}</p>
              <p style={{fontSize:12,fontWeight:600,color:"#C4638A",margin:0}}>{formatCurrency(item.lineTotalPence)}</p>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8,flexShrink:0}}>
              <div className="stepper">
                <button onClick={()=>updateMutation.mutate({itemId:item.id,quantity:item.quantity-item.cduSize})}>−</button>
                <span>{item.quantity}</span>
                <button onClick={()=>updateMutation.mutate({itemId:item.id,quantity:item.quantity+item.cduSize})}>+</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {items.length>0&&(
        <div className="drawer-footer">
          <div className="summary-row"><span style={{color:"#8888AA"}}>Subtotal (ex. VAT)</span><span style={{fontWeight:500}}>{formatCurrency(subtotal)}</span></div>
          <div className="summary-row"><span style={{color:"#8888AA"}}>VAT (20%)</span><span style={{color:"#8888AA"}}>{formatCurrency(vat)}</span></div>
          <div className="summary-total"><span>Total (inc. VAT)</span><span>{formatCurrency(total)}</span></div>
          <Link href="/checkout" className="checkout-btn" onClick={()=>setOpen(false)}>Proceed to Checkout →</Link>
        </div>
      )}
    </div>
    </>
  )
}
