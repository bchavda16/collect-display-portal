"use client"
import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"

const fmt = (p: number) => `£${(p / 100).toFixed(2)}`

export default function StockAlertPage() {
  const [search, setSearch] = useState("")
  const [brandId, setBrandId] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState("")
  const [result, setResult] = useState<any>(null)

  const { data: brandsData } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => { const r = await fetch("/api/brands"); return r.json() },
  })

  const { data: productsData, isLoading } = useQuery({
    queryKey: ["products-alert", search, brandId],
    queryFn: async () => {
      const p = new URLSearchParams({ limit: "24", ...(search&&{search}), ...(brandId&&{brandId}) })
      const r = await fetch("/api/products?"+p); return r.json()
    },
  })

  const sendMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/stock-alert", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ productIds: Array.from(selected), message: message || undefined }),
      })
      return r.json()
    },
    onSuccess: (d) => { setResult(d); setSelected(new Set()); setMessage("") },
  })

  const products = productsData?.data ?? []
  const brands = brandsData?.data ?? brandsData ?? []

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else if (next.size < 3) next.add(id)
    setSelected(next)
  }

  const S: any = {
    wrap: {padding:24,fontFamily:"system-ui,sans-serif",maxWidth:900},
    title: {fontSize:22,fontWeight:700,color:"#1A1A2E",margin:"0 0 4px"},
    sub: {fontSize:13,color:"#8888AA",margin:"0 0 24px"},
    card: {background:"white",border:"1.5px solid rgba(0,0,0,.08)",borderRadius:12,overflow:"hidden",cursor:"pointer",transition:"all .2s",position:"relative" as const},
    cardSel: {borderColor:"#88dde1",boxShadow:"0 0 0 3px rgba(136,221,225,.2)"},
    inp: {width:"100%",padding:"10px 12px",border:"1.5px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:13,color:"#1A1A2E",outline:"none",boxSizing:"border-box" as const,background:"white"},
    btnPink: {display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"11px 24px",background:"#88dde1",color:"#0a1420",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer"},
    select: {padding:"9px 12px",border:"1.5px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:13,color:"#4A4A6A",background:"white",outline:"none"},
  }

  return (
    <div style={S.wrap}>
      <h1 style={S.title}>Send Stock Alert</h1>
      <p style={S.sub}>Select up to 3 products to feature in the email, then send to all active retailers.</p>

      {result && (
        <div style={{background:"#EAFAF3",border:"1px solid rgba(14,165,114,.2)",borderRadius:10,padding:"14px 18px",marginBottom:20,fontSize:13}}>
          <div style={{fontWeight:700,color:"#0EA572",marginBottom:4}}>✓ Alert sent successfully</div>
          <div style={{color:"#4A4A6A"}}>Sent to {result.sent} retailers{result.failed>0?`, ${result.failed} failed`:""}</div>
          <button onClick={()=>setResult(null)} style={{marginTop:8,background:"none",border:"none",cursor:"pointer",color:"#0EA572",fontSize:12,padding:0,fontWeight:500}}>Send another →</button>
        </div>
      )}

      {/* Custom message */}
      <div style={{marginBottom:20}}>
        <label style={{display:"block",fontSize:11,fontWeight:600,color:"#4A4A6A",marginBottom:6,textTransform:"uppercase" as const,letterSpacing:".05em"}}>Custom message (optional)</label>
        <input style={S.inp} value={message} onChange={e=>setMessage(e.target.value)}
          placeholder="e.g. Fresh stock just in for the festive season — order early to avoid missing out!" />
      </div>

      {/* Selected summary */}
      {selected.size > 0 && (
        <div style={{background:"#f0fafb",border:"1.5px solid #88dde1",borderRadius:10,padding:"12px 16px",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
          <span style={{fontSize:13,fontWeight:600,color:"#1a9da3"}}>{selected.size}/3 products selected</span>
          <div style={{display:"flex",gap:10}}>
            <button style={{...S.btnPink,padding:"8px 16px",fontSize:13}} onClick={()=>sendMutation.mutate()} disabled={sendMutation.isPending}>
              {sendMutation.isPending?"Sending…":`Send to all retailers →`}
            </button>
            <button onClick={()=>setSelected(new Set())} style={{padding:"8px 14px",background:"white",border:"1px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:12,cursor:"pointer",color:"#4A4A6A"}}>Clear</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap" as const}}>
        <input style={{...S.inp,maxWidth:260}} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products…" />
        <select style={S.select} value={brandId} onChange={e=>setBrandId(e.target.value)}>
          <option value="">All brands</option>
          {brands.map((b:any)=><option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        {(search||brandId) && <button onClick={()=>{setSearch("");setBrandId("")}} style={{padding:"9px 14px",background:"white",border:"1px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:13,cursor:"pointer",color:"#4A4A6A"}}>Clear</button>}
      </div>

      {/* Product grid */}
      {isLoading ? <p style={{color:"#8888AA",fontSize:13}}>Loading products…</p> : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
          {products.map((p:any) => {
            const isSel = selected.has(p.id)
            const isDisabled = !isSel && selected.size >= 3
            const imgUrl = p.images?.[0]?.url
            return (
              <div key={p.id} style={{...S.card,...(isSel?S.cardSel:{}),opacity:isDisabled?.4:1}}
                onClick={()=>!isDisabled&&toggle(p.id)}>
                {isSel && (
                  <div style={{position:"absolute",top:8,right:8,background:"#88dde1",color:"#0a1420",borderRadius:"50%",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,zIndex:1}}>✓</div>
                )}
                <div style={{height:120,background:"#f0fafb",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                  {imgUrl
                    ? <img src={imgUrl} alt={p.name} style={{width:"100%",height:"100%",objectFit:"contain",padding:4}} />
                    : <span style={{fontSize:36}}>🎁</span>
                  }
                </div>
                <div style={{padding:"10px 12px 12px"}}>
                  <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase" as const,letterSpacing:".08em",color:"#88dde1",marginBottom:3}}>{p.brand?.name}</div>
                  <div style={{fontSize:12,fontWeight:600,color:"#0d1117",lineHeight:1.3,marginBottom:6}}>{p.name}</div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:12,fontWeight:700,color:"#1a9da3"}}>{fmt(p.unitCostPence)}</span>
                    <span style={{fontSize:10,color:"#0EA572"}}>{p.stockUnits} units</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
