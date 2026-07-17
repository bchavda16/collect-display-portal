"use client"
import { useState, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

const fmt = (p: number) => new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(p/100)

export default function StockPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [brandId, setBrandId] = useState("")
  const [inStock, setInStock] = useState(false)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(12)
  const [added, setAdded] = useState<Record<string,boolean>>({})
  const [qtys, setQtys] = useState<Record<string,number>>({})
  const [toast, setToast] = useState<string|null>(null)
  const [offerModal, setOfferModal] = useState<any>(null)
  const [offerPrice, setOfferPrice] = useState("")
  const [offerQty, setOfferQty] = useState(0)
  const [offerNote, setOfferNote] = useState("")
  const [offerSubmitting, setOfferSubmitting] = useState(false)

  const { data: brandsData } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => { const r = await fetch("/api/brands"); return r.json() },
  })

  const { data, isLoading } = useQuery({
    queryKey: ["products", search, brandId, inStock, page, perPage],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), limit: String(perPage), ...(search&&{search}), ...(brandId&&{brandId}), ...(inStock&&{inStock:"true"}) })
      const r = await fetch("/api/products?"+p); return r.json()
    },
  })

  const addMutation = useMutation({
    mutationFn: async ({ productId, quantity }: any) => {
      const r = await fetch("/api/basket", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({productId,quantity}) })
      return r.json()
    },
    onMutate: async ({ productId, quantity }) => {
      await qc.cancelQueries({ queryKey: ["basket"] })
      const prev = qc.getQueryData(["basket"]) as any
      if (prev) {
        const existing = prev.items?.find((i: any) => i.productId === productId)
        const newItems = existing
          ? prev.items.map((i: any) => i.productId===productId ? {...i,quantity:i.quantity+quantity,lineTotalPence:i.unitCostPence*(i.quantity+quantity)} : i)
          : [...(prev.items??[]),{id:"temp-"+productId,productId,productName:"...",sku:"",quantity,unitCostPence:0,lineTotalPence:0,cduSize:6,imageUrl:null}]
        qc.setQueryData(["basket"], {...prev,items:newItems})
      }
      return { prev }
    },
    onSuccess: (data, { productId }) => {
      qc.setQueryData(["basket"], data)
      setAdded(a=>({...a,[productId]:true}))
      setTimeout(()=>setAdded(a=>({...a,[productId]:false})),1500)
    },
    onError: (_e,_v,ctx:any) => { if(ctx?.prev) qc.setQueryData(["basket"],ctx.prev) },
  })

  const handleAdd = useCallback((productId: string, qty: number, name: string) => {
    addMutation.mutate({productId,quantity:qty})
    setToast(name+" added to basket")
    setTimeout(()=>setToast(null),2000)
  },[addMutation])

  const handleOffer = async () => {
    if (!offerModal||!offerPrice||!offerQty) return
    const pricePence = Math.round(parseFloat(offerPrice)*100)
    if (pricePence>=offerModal.unitCostPence){setToast("Offer must be below listed price");return}
    setOfferSubmitting(true)
    const r = await fetch("/api/offers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId:offerModal.id,offeredPricePence:pricePence,quantity:offerQty,note:offerNote||undefined})})
    const d = await r.json()
    setOfferSubmitting(false)
    if(d.success){setOfferModal(null);setOfferPrice("");setOfferQty(0);setOfferNote("");setToast("Offer submitted!")}
    else{setToast(d.error??"Failed to submit offer")}
  }

  const products = data?.data ?? []
  const brands = brandsData?.data ?? brandsData ?? []
  const totalPages = data?.totalPages ?? 1
  const getQty = (p: any) => qtys[p.id] ?? p.cduSize
  const maxQty = (p: any) => Math.floor(p.stockUnits/p.cduSize)*p.cduSize
  const setQtyVal = (id: string, v: number, max: number) => setQtys(q=>({...q,[id]:Math.min(Math.max(0,v),max)}))

  return (
    <div style={{padding:24,fontFamily:"'Inter',system-ui,sans-serif",background:"#f8fafb",minHeight:"100vh"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        .stock-card{background:white;border-radius:18px;overflow:hidden;border:1px solid rgba(0,0,0,.06);transition:all .25s cubic-bezier(.4,0,.2,1);cursor:default}
        .stock-card:hover{transform:translateY(-4px);box-shadow:0 20px 40px rgba(136,221,225,.15),0 4px 12px rgba(0,0,0,.08);border-color:rgba(136,221,225,.4)}
        .add-btn-main{flex:1;padding:9px 0;background:#88dde1;color:white;border:none;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;transition:all .15s;letter-spacing:.02em}
        .add-btn-main:hover{background:#5ecfd4;transform:scale(1.02)}
        .add-btn-main.done{background:#22c55e}
        .offer-btn{width:100%;margin-top:7px;padding:8px 0;background:transparent;border:1.5px solid #88dde1;border-radius:10px;font-size:11.5px;font-weight:600;color:#1a9da3;cursor:pointer;transition:all .15s;letter-spacing:.03em}
        .offer-btn:hover{background:#88dde1;color:white}
        .stepper-btn{background:#f0fafb;border:none;padding:7px 11px;font-size:15px;cursor:pointer;color:#4A4A6A;transition:background .15s}
        .stepper-btn:hover:not(:disabled){background:#e0f7f8;color:#1a9da3}
        .stepper-btn:disabled{color:#D0D0D0;cursor:not-allowed}
        .filter-chip{padding:7px 16px;border-radius:99px;font-size:12.5px;font-weight:500;border:1.5px solid rgba(0,0,0,.1);cursor:pointer;transition:all .15s;background:white;color:#4A4A6A}
        .filter-chip:hover{border-color:#88dde1;color:#1a9da3}
        .filter-chip.on{background:#88dde1;color:white;border-color:#88dde1;font-weight:600}
        .brand-select{padding:7px 14px;border-radius:99px;font-size:12.5px;font-weight:500;border:1.5px solid rgba(0,0,0,.1);cursor:pointer;background:white;color:#4A4A6A;outline:none;transition:all .15s;appearance:none;padding-right:28px}
        .brand-select:focus,.brand-select:hover{border-color:#88dde1;color:#1a9da3}
        .brand-select.active{background:#88dde1;color:white;border-color:#88dde1;font-weight:600}
        .toast-pill{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#1A1A2E;color:white;padding:11px 22px;border-radius:99px;font-size:13px;font-weight:500;z-index:100;box-shadow:0 8px 32px rgba(0,0,0,.25);white-space:nowrap;animation:fadeup .2s ease}
        @keyframes fadeup{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        .page-btn{padding:7px 13px;border:1.5px solid rgba(0,0,0,.1);border-radius:8px;font-size:12px;background:white;color:#4A4A6A;cursor:pointer;transition:all .15s;font-weight:500}
        .page-btn:hover:not(:disabled){border-color:#88dde1;color:#1a9da3}
        .page-btn.active{background:#88dde1;color:white;border-color:#88dde1;font-weight:600}
        .page-btn:disabled{opacity:.35;cursor:not-allowed}
        .search-wrap{display:flex;align-items:center;gap:10px;padding:12px 16px;background:white;border:1.5px solid rgba(0,0,0,.08);border-radius:14px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,.04);transition:border-color .15s}
        .search-wrap:focus-within{border-color:#88dde1;box-shadow:0 0 0 3px rgba(136,221,225,.15)}
        .price-cell{text-align:center;padding:8px 6px}
        .price-cell .lbl{font-size:9px;color:#8888AA;margin:0 0 3px;font-weight:600;text-transform:uppercase;letter-spacing:.06em}
        .price-cell .val{font-size:12.5px;font-weight:700;margin:0;color:#1A1A2E}
        .price-cell .val.accent{color:#1a9da3}
        .price-cell .val.muted{color:#AAAAAA;font-weight:500}
      `}</style>

      {toast && <div className="toast-pill">✓ {toast}</div>}

      {/* Header */}
      <div style={{marginBottom:22}}>
        <h1 style={{fontSize:26,fontWeight:800,color:"#0d1117",margin:"0 0 4px",letterSpacing:"-.5px"}}>Live Stock</h1>
        <p style={{fontSize:13,color:"#8888AA",margin:0,fontWeight:400}}>{data?.total??0} products available to order</p>
      </div>

      {/* Search */}
      <div className="search-wrap">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#AAAAAA" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input style={{border:"none",outline:"none",fontSize:13.5,color:"#1A1A2E",background:"transparent",flex:1,fontFamily:"inherit"}} placeholder="Search products, SKU, brand…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} />
        {search && <button onClick={()=>{setSearch("");setPage(1)}} style={{background:"none",border:"none",cursor:"pointer",color:"#AAAAAA",fontSize:18,lineHeight:1,padding:0}}>×</button>}
      </div>

      {/* Filters */}
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" as const,marginBottom:24}}>
        <button className={"filter-chip"+(inStock?" on":"")} onClick={()=>{setInStock(v=>!v);setPage(1)}}>
          {inStock ? "✓ " : ""}In stock only
        </button>

        {/* Brand dropdown */}
        <div style={{position:"relative" as const}}>
          <select className={"brand-select"+(brandId?" active":"")} value={brandId} onChange={e=>{setBrandId(e.target.value);setPage(1)}}>
            <option value="">All Brands</option>
            {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <svg style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={brandId?"white":"#888"} strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
        </div>

        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:12,color:"#AAAAAA",fontWeight:500}}>Show</span>
          <select value={perPage} onChange={e=>{setPerPage(Number(e.target.value));setPage(1)}}
            style={{padding:"6px 10px",border:"1.5px solid rgba(0,0,0,.1)",borderRadius:8,fontSize:12,color:"#4A4A6A",background:"white",outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
            {[12,24,48].map(n=><option key={n} value={n}>{n} per page</option>)}
          </select>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:18}}>
          {Array.from({length:6}).map((_,i)=>(
            <div key={i} style={{background:"white",borderRadius:18,height:400,animation:"pulse 1.5s ease-in-out infinite alternate",opacity:.7}} />
          ))}
        </div>
      ) : products.length===0 ? (
        <div style={{textAlign:"center",padding:"80px 16px",background:"white",borderRadius:20,border:"1px solid rgba(0,0,0,.06)"}}>
          <div style={{fontSize:52,marginBottom:14}}>📦</div>
          <p style={{fontWeight:700,color:"#1A1A2E",fontSize:16,margin:"0 0 6px"}}>No products found</p>
          <p style={{fontSize:13,color:"#8888AA",margin:0}}>Try adjusting your search or filters</p>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:18,marginBottom:24}}>
          {products.map((p:any)=>{
            const qty=getQty(p), max=maxQty(p), isAdded=added[p.id]
            const unavailable=p.status==="OUT_OF_STOCK"||p.stockUnits===0
            const comingSoon=p.status==="COMING_SOON"
            const imgUrl=p.images?.[0]?.url
            const stockColor = p.stockUnits===0?"#ef4444":p.stockUnits<=10?"#f59e0b":"#22c55e"
            return (
              <div key={p.id} className="stock-card" style={{opacity:(unavailable||comingSoon)?.65:1}}>
                {/* Product Image */}
                <div style={{height:185,background:imgUrl?"transparent":"linear-gradient(135deg,#e6f9fa 0%,#f0f9ff 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:46,position:"relative",overflow:"hidden"}}>
                  {imgUrl && <img src={imgUrl} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0}} />}
                  {!imgUrl && <span style={{opacity:.5}}>🎁</span>}
                  {/* Badges */}
                  {p.badges?.includes("BEST_SELLER") && <span style={{position:"absolute",top:10,left:10,background:"rgba(255,255,255,.95)",backdropFilter:"blur(8px)",color:"#1a9da3",border:"1px solid rgba(136,221,225,.4)",borderRadius:7,padding:"3px 9px",fontSize:10,fontWeight:700,letterSpacing:".03em"}}>⭐ BEST SELLER</span>}
                  {p.badges?.includes("NEW") && !p.badges?.includes("BEST_SELLER") && <span style={{position:"absolute",top:10,left:10,background:"rgba(255,255,255,.95)",backdropFilter:"blur(8px)",color:"#1a9da3",border:"1px solid rgba(136,221,225,.4)",borderRadius:7,padding:"3px 9px",fontSize:10,fontWeight:700,letterSpacing:".03em"}}>✦ NEW</span>}
                  {p.badges?.includes("EXCLUSIVE") && <span style={{position:"absolute",top:10,left:10,background:"rgba(26,157,163,.9)",color:"white",borderRadius:7,padding:"3px 9px",fontSize:10,fontWeight:700,letterSpacing:".03em"}}>💎 EXCLUSIVE</span>}
                  {(unavailable||comingSoon) && <div style={{position:"absolute",inset:0,background:"rgba(255,255,255,.75)",backdropFilter:"blur(3px)",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{background:"rgba(255,255,255,.95)",border:"1px solid rgba(0,0,0,.1)",borderRadius:10,padding:"5px 14px",fontSize:12,fontWeight:600,color:"#666"}}>{comingSoon?"Coming Soon":"Out of Stock"}</span></div>}
                  {/* Stock indicator dot */}
                  {!unavailable && !comingSoon && <div style={{position:"absolute",top:10,right:10,width:8,height:8,borderRadius:"50%",background:stockColor,boxShadow:`0 0 0 2px white`}} />}
                </div>

                {/* Body */}
                <div style={{padding:"14px 16px 16px"}}>
                  <div style={{fontSize:9.5,fontWeight:700,textTransform:"uppercase" as const,letterSpacing:".12em",color:"#88dde1",margin:"0 0 4px"}}>{p.brand?.name}</div>
                  <div style={{fontSize:13.5,fontWeight:700,color:"#0d1117",lineHeight:1.3,margin:"0 0 3px"}}>{p.name}</div>
                  <div style={{fontSize:10,fontFamily:"'SF Mono',monospace",color:"#BBBBCC",margin:"0 0 12px"}}>{p.sku}</div>

                  {/* Price grid */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",background:"#f8fafb",border:"1px solid rgba(0,0,0,.06)",borderRadius:10,marginBottom:10,overflow:"hidden"}}>
                    <div className="price-cell"><p className="lbl">Unit</p><p className="val">{fmt(p.unitCostPence)}</p></div>
                    <div className="price-cell" style={{borderLeft:"1px solid rgba(0,0,0,.06)",borderRight:"1px solid rgba(0,0,0,.06)"}}><p className="lbl">CDU ×{p.cduSize}</p><p className="val accent">{fmt(p.unitCostPence*p.cduSize)}</p></div>
                    <div className="price-cell"><p className="lbl">RRP</p><p className="val muted">{fmt(p.rrpPence)}</p></div>
                  </div>

                  {/* Stock */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11.5,marginBottom:12}}>
                    <span style={{color:"#AAAAAA",fontWeight:500}}>Stock</span>
                    <span style={{fontWeight:700,color:stockColor,fontSize:12}}>{p.stockUnits.toLocaleString()} units</span>
                  </div>

                  {!unavailable && !comingSoon && (
                    <>
                      <div style={{display:"flex",gap:8,marginBottom:0}}>
                        <div style={{display:"flex",alignItems:"center",border:"1.5px solid rgba(0,0,0,.09)",borderRadius:10,overflow:"hidden",background:"white"}}>
                          <button className="stepper-btn" onClick={()=>setQtyVal(p.id,qty-p.cduSize,max)} disabled={qty<=p.cduSize}>−</button>
                          <span style={{fontSize:13,fontWeight:700,padding:"0 10px",color:"#0d1117",minWidth:34,textAlign:"center"}}>{qty}</span>
                          <button className="stepper-btn" onClick={()=>setQtyVal(p.id,qty+p.cduSize,max)} disabled={qty>=max}>+</button>
                        </div>
                        <button className={"add-btn-main"+(isAdded?" done":"")} onClick={()=>handleAdd(p.id,qty,p.name)} disabled={isAdded}>
                          {isAdded ? "✓ Added" : "+ Add to Basket"}
                        </button>
                      </div>
                      <button className="offer-btn" onClick={()=>{setOfferModal(p);setOfferPrice(((p.unitCostPence*0.85)/100).toFixed(2));setOfferQty(p.cduSize);setOfferNote("")}}>
                        Make an Offer
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 0 && (
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap" as const,gap:10}}>
          <span style={{fontSize:12,color:"#AAAAAA",fontWeight:500}}>
            {data?.total??0} products · Page {page} of {totalPages}
          </span>
          {totalPages > 1 && (
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <button className="page-btn" onClick={()=>setPage(1)} disabled={page===1}>«</button>
              <button className="page-btn" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>‹ Prev</button>
              {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
                let pg=page<=3?i+1:page>=totalPages-2?totalPages-4+i:page-2+i
                pg=Math.max(1,Math.min(totalPages,pg))
                return <button key={pg} className={"page-btn"+(page===pg?" active":"")} onClick={()=>setPage(pg)}>{pg}</button>
              })}
              <button className="page-btn" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>Next ›</button>
              <button className="page-btn" onClick={()=>setPage(totalPages)} disabled={page===totalPages}>»</button>
            </div>
          )}
        </div>
      )}

      {/* Offer Modal */}
      {offerModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(10,15,20,.5)",backdropFilter:"blur(6px)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>e.target===e.currentTarget&&setOfferModal(null)}>
          <div style={{background:"white",borderRadius:20,padding:30,maxWidth:430,width:"100%",boxShadow:"0 32px 80px rgba(0,0,0,.2)",fontFamily:"inherit"}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
              <div>
                <div style={{fontSize:17,fontWeight:800,color:"#0d1117",letterSpacing:"-.3px"}}>Make an Offer</div>
                <div style={{fontSize:12,color:"#AAAAAA",marginTop:3}}>{offerModal.name}</div>
              </div>
              <button onClick={()=>setOfferModal(null)} style={{background:"#f4f4f4",border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",fontSize:16,color:"#888",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>

            <div style={{background:"#f8fafb",borderRadius:12,padding:"12px 16px",marginBottom:18,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:12,color:"#888",fontWeight:500}}>Listed price</span>
              <span style={{fontSize:15,fontWeight:700,color:"#0d1117"}}>{fmt(offerModal.unitCostPence)}<span style={{fontSize:11,fontWeight:400,color:"#888"}}>/unit</span></span>
            </div>

            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:"#4A4A6A",marginBottom:7,textTransform:"uppercase" as const,letterSpacing:".07em"}}>Your Offer Price (£/unit)</label>
              <input type="number" step="0.01" value={offerPrice} onChange={e=>setOfferPrice(e.target.value)} autoFocus
                style={{width:"100%",padding:"13px 16px",border:"2px solid #88dde1",borderRadius:12,fontSize:16,fontWeight:700,color:"#1a9da3",outline:"none",boxSizing:"border-box" as const,background:"#f0fafb"}} />
              {offerPrice && parseFloat(offerPrice)>0 && (
                <div style={{fontSize:11.5,color:"#1a9da3",marginTop:6,fontWeight:500}}>
                  Saving {fmt(offerModal.unitCostPence-Math.round(parseFloat(offerPrice)*100))}/unit · {Math.round(((offerModal.unitCostPence/100-parseFloat(offerPrice))/(offerModal.unitCostPence/100))*100)}% off
                </div>
              )}
            </div>

            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:"#4A4A6A",marginBottom:7,textTransform:"uppercase" as const,letterSpacing:".07em"}}>Quantity</label>
              <div style={{display:"flex",alignItems:"center",border:"2px solid rgba(0,0,0,.1)",borderRadius:12,overflow:"hidden"}}>
                <button onClick={()=>setOfferQty(q=>Math.max(offerModal.cduSize,q-offerModal.cduSize))} style={{padding:"13px 20px",background:"#f8fafb",border:"none",fontSize:20,cursor:"pointer",color:"#4A4A6A",fontWeight:300}}>−</button>
                <div style={{flex:1,textAlign:"center" as const}}>
                  <div style={{fontSize:20,fontWeight:700,color:"#0d1117"}}>{offerQty}</div>
                  <div style={{fontSize:10,color:"#AAAAAA",fontWeight:500}}>CDU size ×{offerModal.cduSize}</div>
                </div>
                <button onClick={()=>setOfferQty(q=>q+offerModal.cduSize)} style={{padding:"13px 20px",background:"#f8fafb",border:"none",fontSize:20,cursor:"pointer",color:"#4A4A6A",fontWeight:300}}>+</button>
              </div>
              {offerPrice && offerQty > 0 && <div style={{fontSize:11.5,color:"#AAAAAA",marginTop:5,textAlign:"center" as const}}>Total offer: <strong style={{color:"#0d1117"}}>{fmt(Math.round(parseFloat(offerPrice)*100)*offerQty)}</strong></div>}
            </div>

            <div style={{marginBottom:22}}>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:"#4A4A6A",marginBottom:7,textTransform:"uppercase" as const,letterSpacing:".07em"}}>Note <span style={{fontWeight:400,textTransform:"none" as const,letterSpacing:0}}>(optional)</span></label>
              <input type="text" value={offerNote} onChange={e=>setOfferNote(e.target.value)} placeholder="e.g. ordering in bulk this month…"
                style={{width:"100%",padding:"12px 14px",border:"2px solid rgba(0,0,0,.08)",borderRadius:12,fontSize:13,color:"#0d1117",outline:"none",boxSizing:"border-box" as const,fontFamily:"inherit"}} />
            </div>

            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setOfferModal(null)} style={{flex:1,padding:"12px 0",background:"#f4f4f4",color:"#4A4A6A",border:"none",borderRadius:12,fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
              <button onClick={handleOffer} disabled={offerSubmitting||!offerPrice||!offerQty}
                style={{flex:2,padding:"12px 0",background:"#88dde1",color:"white",border:"none",borderRadius:12,fontSize:13,fontWeight:700,cursor:"pointer",opacity:offerSubmitting?.6:1,letterSpacing:".02em"}}>
                {offerSubmitting?"Submitting…":"Submit Offer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
