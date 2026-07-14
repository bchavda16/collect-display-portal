"use client"
import { useState, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

const formatCurrency = (p: number) => new Intl.NumberFormat("en-GB", { style:"currency", currency:"GBP" }).format(p/100)
const TYPES = ["ALL","BLIND_BOX","FIGURE","PLUSH","ACCESSORY","BUNDLE"]

export default function StockPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [type, setType] = useState("ALL")
  const [inStock, setInStock] = useState(false)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(12)
  const [added, setAdded] = useState<Record<string,boolean>>({})
  const [qtys, setQtys] = useState<Record<string,number>>({})
  const [toast, setToast] = useState<string|null>(null)
  const [offerModal, setOfferModal] = useState<any>(null)
  const [offerPrice, setOfferPrice] = useState("")
  const [offerQty, setOfferQty] = useState("")
  const [offerNote, setOfferNote] = useState("")
  const [offerSubmitting, setOfferSubmitting] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["products", search, type, inStock, page, perPage],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), limit: String(perPage), ...(search&&{search}), ...(type!=="ALL"&&{type}), ...(inStock&&{inStock:"true"}) })
      const r = await fetch("/api/products?"+p); return r.json()
    },
  })

  const addMutation = useMutation({
    mutationFn: async ({ productId, quantity }: any) => {
      const r = await fetch("/api/basket", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({productId, quantity}) })
      return r.json()
    },
    onMutate: async ({ productId, quantity }) => {
      await qc.cancelQueries({ queryKey: ["basket"] })
      const prev = qc.getQueryData(["basket"]) as any
      if (prev) {
        const existing = prev.items?.find((i: any) => i.productId === productId)
        const newItems = existing
          ? prev.items.map((i: any) => i.productId === productId ? {...i, quantity: i.quantity + quantity, lineTotalPence: i.unitCostPence * (i.quantity + quantity)} : i)
          : [...(prev.items??[]), { id:"temp-"+productId, productId, productName:"...", sku:"", quantity, unitCostPence:0, lineTotalPence:0, cduSize:6, imageUrl:null }]
        qc.setQueryData(["basket"], { ...prev, items: newItems })
      }
      return { prev }
    },
    onSuccess: (data, { productId }) => {
      qc.setQueryData(["basket"], data)
      setAdded(a => ({...a, [productId]: true}))
      setTimeout(() => setAdded(a => ({...a, [productId]: false})), 1500)
    },
    onError: (_err, _vars, ctx: any) => { if (ctx?.prev) qc.setQueryData(["basket"], ctx.prev) },
  })

  const handleAdd = useCallback((productId: string, qty: number, name: string) => {
    addMutation.mutate({ productId, quantity: qty })
    setToast(name + " added to basket")
    setTimeout(() => setToast(null), 2000)
  }, [addMutation])

  const handleOffer = async () => {
    if (!offerModal || !offerPrice || !offerQty) return
    const pricePence = Math.round(parseFloat(offerPrice) * 100)
    if (pricePence >= offerModal.unitCostPence) { setToast("Offer must be below the listed price"); return }
    setOfferSubmitting(true)
    const r = await fetch("/api/offers", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ productId: offerModal.id, offeredPricePence: pricePence, quantity: parseInt(offerQty), note: offerNote || undefined }) })
    const d = await r.json()
    setOfferSubmitting(false)
    if (d.success) { setOfferModal(null); setOfferPrice(""); setOfferQty(""); setOfferNote(""); setToast("Offer submitted!") }
    else { setToast(d.error ?? "Failed to submit offer") }
  }

  const products = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const getQty = (p: any) => qtys[p.id] ?? p.cduSize
  const maxQty = (p: any) => Math.floor(p.stockUnits / p.cduSize) * p.cduSize
  const setQty = (id: string, v: number, max: number) => setQtys(q => ({...q, [id]: Math.min(Math.max(0, v), max)}))

  const S: any = {
    wrap: {padding:24,fontFamily:"system-ui,sans-serif"},
    title: {fontSize:22,fontWeight:700,color:"#1A1A2E",margin:"0 0 4px"},
    sub: {fontSize:13,color:"#8888AA",margin:"0 0 20px"},
    searchBox: {display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"white",border:"1px solid rgba(0,0,0,.09)",borderRadius:10,marginBottom:14},
    chipRow: {display:"flex",gap:6,flexWrap:"wrap",marginBottom:20},
    chip: (active:boolean) => ({padding:"5px 14px",borderRadius:99,fontSize:12,fontWeight:500,background:active?"#F0A3BC":"#F4F5F7",color:active?"white":"#4A4A6A",border:"none",cursor:"pointer"}),
    grid: {display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:20},
    card: {background:"white",border:"1px solid rgba(0,0,0,.09)",borderRadius:14,overflow:"hidden",transition:"all .2s"},
    imgBox: (url:string) => ({height:175,background:url?"transparent":"linear-gradient(135deg,#FDE8EF,#E8F8F7)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:42,position:"relative",overflow:"hidden"}),
    body: {padding:14},
    brand: {fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".1em",color:"#3A9E9B",margin:"0 0 3px"},
    name: {fontSize:13,fontWeight:600,color:"#1A1A2E",lineHeight:1.35,margin:"0 0 4px"},
    sku: {fontSize:10,fontFamily:"monospace",color:"#BBBBCC",margin:"0 0 10px"},
    priceGrid: {display:"grid",gridTemplateColumns:"repeat(3,1fr)",background:"#F9FAFB",border:"1px solid rgba(0,0,0,.07)",borderRadius:8,padding:"8px 6px",marginBottom:10},
    priceCol: {textAlign:"center"},
    stockRow: {display:"flex",justifyContent:"space-between",fontSize:11,color:"#8888AA",marginBottom:10},
    addRow: {display:"flex",gap:8},
    stepper: {display:"flex",alignItems:"center",border:"1px solid rgba(0,0,0,.12)",borderRadius:8,overflow:"hidden",background:"white"},
    stepBtn: (disabled:boolean) => ({background:disabled?"#F9FAFB":"#F4F5F7",border:"none",padding:"7px 10px",fontSize:14,cursor:disabled?"not-allowed":"pointer",color:disabled?"#CCCCCC":"#4A4A6A"}),
    addBtn: (done:boolean) => ({flex:1,padding:"8px 0",background:done?"#0EA572":"#F0A3BC",color:"white",border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}),
    offerBtn: {width:"100%",marginTop:6,padding:"6px 0",background:"none",border:"1px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:11,fontWeight:500,color:"#8888AA",cursor:"pointer"},
    badge: (col:string,bg:string) => ({position:"absolute",top:8,left:8,background:bg,color:col,border:"1px solid rgba(0,0,0,.08)",borderRadius:6,padding:"2px 8px",fontSize:9.5,fontWeight:700}),
    overlay: {position:"fixed",inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(2px)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:16},
    modal: {background:"white",borderRadius:16,padding:28,maxWidth:420,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,.15)"},
    inp: {width:"100%",padding:"10px 12px",border:"1.5px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:13,color:"#1A1A2E",outline:"none",boxSizing:"border-box",background:"white",marginTop:6},
    lbl: {fontSize:11,fontWeight:600,color:"#4A4A6A",textTransform:"uppercase",letterSpacing:".05em"},
    btnPink: {flex:2,padding:"10px 0",background:"#F0A3BC",color:"white",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer"},
    btnGhost: {flex:1,padding:"10px 0",background:"white",color:"#4A4A6A",border:"1px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer"},
    toast: {position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#1A1A2E",color:"white",padding:"10px 20px",borderRadius:99,fontSize:13,fontWeight:500,zIndex:100,boxShadow:"0 4px 16px rgba(0,0,0,.2)",whiteSpace:"nowrap"},
  }

  return (
    <div style={S.wrap}>
      {toast && <div style={S.toast}>✓ {toast}</div>}
      <h1 style={S.title}>Live Stock</h1>
      <p style={S.sub}>{data?.total ?? 0} products available</p>

      <div style={S.searchBox}>
        <span style={{color:"#8888AA",fontSize:16}}>🔍</span>
        <input style={{border:"none",outline:"none",fontSize:13,color:"#1A1A2E",background:"transparent",flex:1}} placeholder="Search by name, SKU or brand…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} />
        {search && <button onClick={()=>{setSearch("");setPage(1)}} style={{background:"none",border:"none",cursor:"pointer",color:"#8888AA",fontSize:16}}>×</button>}
      </div>

      <div style={S.chipRow}>
        {TYPES.map(t=><button key={t} style={S.chip(type===t)} onClick={()=>{setType(t);setPage(1)}}>{t==="ALL"?"All Types":t.replace(/_/g," ")}</button>)}
        <button style={{...S.chip(inStock),marginLeft:"auto"}} onClick={()=>{setInStock(v=>!v);setPage(1)}}>✓ In stock only</button>
      </div>

      {isLoading ? (
        <div style={{...S.grid}}>{Array.from({length:6}).map((_,i)=><div key={i} style={{background:"white",border:"1px solid rgba(0,0,0,.08)",borderRadius:14,height:340}} />)}</div>
      ) : products.length===0 ? (
        <div style={{textAlign:"center",padding:"64px 16px"}}>
          <div style={{fontSize:48,marginBottom:12}}>📦</div>
          <p style={{fontWeight:600,color:"#1A1A2E",margin:"0 0 4px"}}>No products found</p>
          <p style={{fontSize:13,color:"#8888AA",margin:0}}>Try adjusting your filters</p>
        </div>
      ) : (
        <div style={S.grid}>
          {products.map((p: any) => {
            const qty = getQty(p)
            const max = maxQty(p)
            const isAdded = added[p.id]
            const unavailable = p.status==="OUT_OF_STOCK" || p.stockUnits===0
            const comingSoon = p.status==="COMING_SOON"
            const imgUrl = p.images?.[0]?.url
            return (
              <div key={p.id} style={{...S.card,opacity:(unavailable||comingSoon)?.7:1}}>
                <div style={S.imgBox(imgUrl)}>
                  {imgUrl ? <img src={imgUrl} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0}} /> : <span>🎁</span>}
                  {p.badges?.includes("BEST_SELLER") && <span style={S.badge("#C4638A","#FDE8EF")}>⭐ Best Seller</span>}
                  {p.badges?.includes("NEW") && !p.badges?.includes("BEST_SELLER") && <span style={S.badge("#3A9E9B","#E8F8F7")}>✨ New</span>}
                  {p.badges?.includes("EXCLUSIVE") && <span style={S.badge("#7C3AED","#F3EEFF")}>💎 Exclusive</span>}
                  {(unavailable||comingSoon) && <div style={{position:"absolute",inset:0,background:"rgba(255,255,255,.8)",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{background:"white",border:"1px solid rgba(0,0,0,.1)",borderRadius:8,padding:"4px 12px",fontSize:12,fontWeight:600,color:"#8888AA"}}>{comingSoon?"Coming Soon":"Out of Stock"}</span></div>}
                </div>
                <div style={S.body}>
                  <p style={S.brand}>{p.brand?.name}</p>
                  <p style={S.name}>{p.name}</p>
                  <p style={S.sku}>{p.sku}</p>
                  <div style={S.priceGrid}>
                    <div style={S.priceCol}><p style={{fontSize:9,color:"#8888AA",margin:"0 0 2px"}}>Unit</p><p style={{fontSize:12,fontWeight:600,color:"#1A1A2E",margin:0}}>{formatCurrency(p.unitCostPence)}</p></div>
                    <div style={S.priceCol}><p style={{fontSize:9,color:"#8888AA",margin:"0 0 2px"}}>CDU ×{p.cduSize}</p><p style={{fontSize:12,fontWeight:600,color:"#C4638A",margin:0}}>{formatCurrency(p.unitCostPence*p.cduSize)}</p></div>
                    <div style={S.priceCol}><p style={{fontSize:9,color:"#8888AA",margin:"0 0 2px"}}>RRP</p><p style={{fontSize:12,fontWeight:600,color:"#8888AA",margin:0}}>{formatCurrency(p.rrpPence)}</p></div>
                  </div>
                  <div style={S.stockRow}>
                    <span>Stock</span>
                    <span style={{fontWeight:600,color:p.stockUnits===0?"#E11D48":p.stockUnits<=10?"#D97706":"#0EA572"}}>{p.stockUnits.toLocaleString()} units</span>
                  </div>
                  {!unavailable && !comingSoon && (
                    <>
                    <div style={S.addRow}>
                      <div style={S.stepper}>
                        <button style={S.stepBtn(qty<=p.cduSize)} onClick={()=>setQty(p.id,qty-p.cduSize,max)} disabled={qty<=p.cduSize}>−</button>
                        <span style={{fontSize:13,fontWeight:600,padding:"0 8px",color:"#1A1A2E",minWidth:32,textAlign:"center"}}>{qty}</span>
                        <button style={S.stepBtn(qty>=max)} onClick={()=>setQty(p.id,qty+p.cduSize,max)} disabled={qty>=max}>+</button>
                      </div>
                      <button style={S.addBtn(isAdded)} onClick={()=>handleAdd(p.id,qty,p.name)} disabled={isAdded}>
                        {isAdded ? "✓ Added!" : "🛒 Add"}
                      </button>
                    </div>
                    <button style={S.offerBtn} onClick={()=>{setOfferModal(p);setOfferPrice(((p.unitCostPence*0.85)/100).toFixed(2));setOfferQty(String(p.cduSize))}}>
                      💬 Make an Offer
                    </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:12,color:"#8888AA"}}>Show</span>
          <select value={perPage} onChange={e=>{setPerPage(Number(e.target.value));setPage(1)}} style={{padding:"5px 10px",border:"1px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:12,color:"#1A1A2E",background:"white",outline:"none",cursor:"pointer"}}>
            {[12,24,48,96].map(n=><option key={n} value={n}>{n} per page</option>)}
          </select>
          <span style={{fontSize:12,color:"#8888AA"}}>· {data?.total ?? 0} total</span>
        </div>
        {totalPages>1 && (
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <button onClick={()=>setPage(1)} disabled={page===1} style={{padding:"6px 10px",border:"1px solid rgba(0,0,0,.12)",borderRadius:7,fontSize:12,background:"white",color:page===1?"#CCCCCC":"#4A4A6A",cursor:page===1?"default":"pointer"}}>«</button>
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{padding:"6px 12px",border:"1px solid rgba(0,0,0,.12)",borderRadius:7,fontSize:12,background:"white",color:page===1?"#CCCCCC":"#4A4A6A",cursor:page===1?"default":"pointer"}}>← Prev</button>
            {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
              let pg = page<=3?i+1:page>=totalPages-2?totalPages-4+i:page-2+i
              pg = Math.max(1,Math.min(totalPages,pg))
              return <button key={pg} onClick={()=>setPage(pg)} style={{padding:"6px 12px",border:"1px solid",borderColor:page===pg?"#F0A3BC":"rgba(0,0,0,.12)",borderRadius:7,fontSize:12,background:page===pg?"#F0A3BC":"white",color:page===pg?"white":"#4A4A6A",cursor:"pointer",fontWeight:page===pg?600:400}}>{pg}</button>
            })}
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} style={{padding:"6px 12px",border:"1px solid rgba(0,0,0,.12)",borderRadius:7,fontSize:12,background:"white",color:page===totalPages?"#CCCCCC":"#4A4A6A",cursor:page===totalPages?"default":"pointer"}}>Next →</button>
            <button onClick={()=>setPage(totalPages)} disabled={page===totalPages} style={{padding:"6px 10px",border:"1px solid rgba(0,0,0,.12)",borderRadius:7,fontSize:12,background:"white",color:page===totalPages?"#CCCCCC":"#4A4A6A",cursor:page===totalPages?"default":"pointer"}}>»</button>
          </div>
        )}
      </div>

      {offerModal && (
        <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setOfferModal(null)}>
          <div style={S.modal}>
            <div style={{fontSize:17,fontWeight:700,color:"#1A1A2E",margin:"0 0 4px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              Make an Offer
              <button onClick={()=>setOfferModal(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:"#8888AA",padding:0}}>×</button>
            </div>
            <p style={{fontSize:12,color:"#8888AA",margin:"0 0 16px"}}>{offerModal.name}</p>
            <div style={{background:"#F9FAFB",borderRadius:10,padding:"10px 14px",marginBottom:16,display:"flex",justifyContent:"space-between",fontSize:13}}>
              <span style={{color:"#8888AA"}}>Listed price</span>
              <span style={{fontWeight:600,color:"#1A1A2E"}}>{formatCurrency(offerModal.unitCostPence)}/unit</span>
            </div>
            <div style={{marginBottom:14}}>
              <label style={S.lbl}>Your offer price (£/unit)</label>
              <input type="number" step="0.01" value={offerPrice} onChange={e=>setOfferPrice(e.target.value)} style={{...S.inp,border:"1.5px solid #F0A3BC",fontSize:14,fontWeight:600,color:"#C4638A"}} autoFocus />
              {offerPrice && parseFloat(offerPrice)>0 && (
                <div style={{fontSize:11,color:"#8888AA",marginTop:4}}>
                  Saving {formatCurrency(offerModal.unitCostPence - Math.round(parseFloat(offerPrice)*100))}/unit · {Math.round(((offerModal.unitCostPence/100 - parseFloat(offerPrice))/(offerModal.unitCostPence/100))*100)}% off
                </div>
              )}
            </div>
            <div style={{marginBottom:14}}>
              <label style={S.lbl}>Quantity (units)</label>
              <input type="number" min="1" value={offerQty} onChange={e=>setOfferQty(e.target.value)} style={S.inp} />
            </div>
            <div style={{marginBottom:20}}>
              <label style={S.lbl}>Note (optional)</label>
              <input type="text" value={offerNote} onChange={e=>setOfferNote(e.target.value)} placeholder="e.g. ordering in bulk this month…" style={S.inp} />
            </div>
            <div style={{display:"flex",gap:10}}>
              <button style={S.btnGhost} onClick={()=>setOfferModal(null)}>Cancel</button>
              <button style={{...S.btnPink,opacity:offerSubmitting?.6:1}} onClick={handleOffer} disabled={offerSubmitting||!offerPrice||!offerQty}>
                {offerSubmitting?"Submitting…":"Submit Offer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
