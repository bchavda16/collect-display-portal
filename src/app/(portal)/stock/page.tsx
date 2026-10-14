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
  const [perPage] = useState(24)
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
          ? prev.items.map((i: any) => i.productId===productId ? {...i,quantity:i.quantity+quantity} : i)
          : [...(prev.items??[]),{id:"temp-"+productId,productId,productName:"...",quantity,unitCostPence:0,lineTotalPence:0,cduSize:6}]
        qc.setQueryData(["basket"], {...prev,items:newItems})
      }
      return { prev }
    },
    onSuccess: (data, { productId }) => {
      qc.setQueryData(["basket"], data)
      setAdded(a=>({...a,[productId]:true}))
      setTimeout(()=>setAdded(a=>({...a,[productId]:false})),1800)
    },
    onError: (_e,_v,ctx:any) => { if(ctx?.prev) qc.setQueryData(["basket"],ctx.prev) },
  })

  const handleAdd = useCallback((productId: string, qty: number, name: string) => {
    addMutation.mutate({productId,quantity:qty})
    setToast(name)
    setTimeout(()=>setToast(null),2000)
  },[addMutation])

  const handleOffer = async () => {
    if (!offerModal||!offerPrice||!offerQty) return
    const pricePence = Math.round(parseFloat(offerPrice)*100)
    setOfferSubmitting(true)
    const r = await fetch("/api/offers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId:offerModal.id,offeredPricePence:pricePence,quantity:offerQty,note:offerNote||undefined})})
    const d = await r.json()
    setOfferSubmitting(false)
    if(d.success){setOfferModal(null);setOfferPrice("");setOfferQty(0);setOfferNote("");setToast("Offer submitted!")}
  }

  const products = data?.data ?? []
  const brands = brandsData?.data ?? brandsData ?? []
  const totalPages = data?.totalPages ?? 1
  const getQty = (p: any) => qtys[p.id] ?? p.cduSize
  const maxQty = (p: any) => Math.floor(p.stockUnits/p.cduSize)*p.cduSize

  return (
    <>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      .sp{padding:16px;font-family:'Inter',system-ui,sans-serif;background:#f2f2f7;min-height:100vh}
      .sp-search{display:flex;align-items:center;gap:10px;padding:11px 14px;background:white;border-radius:12px;margin-bottom:12px;border:none}
      .sp-search input{border:none;outline:none;font-size:16px;color:#1c1c1e;background:transparent;flex:1;font-family:inherit}
      .sp-search input::placeholder{color:#8e8e93}
      .sp-filters{display:flex;gap:8px;overflow-x:auto;padding-bottom:2px;margin-bottom:16px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
      .sp-filters::-webkit-scrollbar{display:none}
      .sp-chip{padding:7px 14px;border-radius:99px;font-size:13px;font-weight:500;border:none;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:all .15s;-webkit-tap-highlight-color:transparent}
      .sp-chip-off{background:white;color:#1c1c1e}
      .sp-chip-on{background:#88dde1;color:#0a1420}
      .sp-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
      @media(min-width:600px){.sp-grid{grid-template-columns:repeat(3,1fr)}}
      @media(min-width:900px){.sp-grid{grid-template-columns:repeat(4,1fr)}}
      .sp-card{background:white;border-radius:16px;overflow:hidden;-webkit-tap-highlight-color:transparent}
      .sp-card-img{aspect-ratio:1;background:#f2f2f7;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
      .sp-card-img img{width:100%;height:100%;object-fit:contain;padding:8px}
      .sp-card-body{padding:10px 12px 12px}
      .sp-brand{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#1a9da3;margin-bottom:2px}
      .sp-name{font-size:13px;font-weight:600;color:#1c1c1e;line-height:1.3;margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      .sp-price-row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px}
      .sp-price{font-size:15px;font-weight:700;color:#1c1c1e}
      .sp-stock-ok{font-size:11px;color:#34c759;font-weight:500}
      .sp-stock-low{font-size:11px;color:#ff9500;font-weight:500}
      .sp-stepper{display:flex;align-items:center;justify-content:space-between;background:#f2f2f7;border-radius:10px;padding:4px;margin-bottom:8px}
      .sp-step-btn{width:32px;height:32px;border:none;background:white;border-radius:8px;font-size:18px;cursor:pointer;color:#88dde1;display:flex;align-items:center;justify-content:center;font-weight:600;-webkit-tap-highlight-color:transparent}
      .sp-step-btn:disabled{color:#c7c7cc;background:transparent}.sp-step-btn{color:#1a9da3}
      .sp-step-val{font-size:14px;font-weight:600;color:#1c1c1e}
      .sp-add{width:100%;padding:10px;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;transition:all .15s;font-family:inherit;-webkit-tap-highlight-color:transparent}
      .sp-add-default{background:#88dde1;color:#0a1420}
      .sp-add-default:active{background:#5ecfd4}
      .sp-add-done{background:#22c55e;color:white}
      .sp-offer{width:100%;margin-top:6px;padding:9px;border:1.5px solid #88dde1;border-radius:10px;font-size:13px;font-weight:600;color:#1a9da3;background:transparent;cursor:pointer;font-family:inherit;-webkit-tap-highlight-color:transparent}
      .sp-offer:active{background:#e8f0fe}
      .sp-badge{position:absolute;top:8px;left:8px;background:#88dde1;color:white;font-size:9px;font-weight:700;padding:3px 7px;border-radius:99px;letter-spacing:.04em}
      .sp-badge-new{background:#88dde1;color:#0a1420}
      .sp-badge-sold{background:#8e8e93}
      .sp-toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#1c1c1e;color:white;padding:11px 20px;border-radius:99px;font-size:13px;font-weight:500;z-index:200;white-space:nowrap;animation:toastin .2s ease;font-family:'Inter',system-ui}
      @keyframes toastin{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
      .sp-pag{display:flex;align-items:center;justify-content:center;gap:8px;padding:20px 0}
      .sp-pag-btn{padding:9px 18px;border:1.5px solid #c7c7cc;border-radius:10px;font-size:13px;background:white;color:#1c1c1e;cursor:pointer;font-weight:500;font-family:inherit}
      .sp-pag-btn:disabled{opacity:.35;cursor:not-allowed}
      .sp-empty{text-align:center;padding:60px 16px;background:white;border-radius:16px}
      .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:300;display:flex;align-items:flex-end;justify-content:center}
      @media(min-width:500px){.modal-overlay{align-items:center}}
      .modal-sheet{background:white;border-radius:20px 20px 0 0;padding:24px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;font-family:'Inter',system-ui}
      @media(min-width:500px){.modal-sheet{border-radius:20px;margin:16px}}
      .modal-input{width:100%;padding:13px 16px;border:1.5px solid #e5e5ea;border-radius:12px;font-size:16px;color:#1c1c1e;outline:none;font-family:inherit;background:white;transition:border-color .15s}
      .modal-input:focus{border-color:#88dde1}
      .modal-btn-primary{width:100%;padding:14px;background:#88dde1;color:#0a1420;border:none;border-radius:14px;font-size:16px;font-weight:600;cursor:pointer;font-family:inherit}
      .modal-btn-primary:disabled{opacity:.4}
      .modal-btn-secondary{width:100%;padding:14px;background:#f2f2f7;color:#1c1c1e;border:none;border-radius:14px;font-size:16px;font-weight:500;cursor:pointer;font-family:inherit;margin-top:8px}
    `}</style>

    {toast && <div className="sp-toast">✓ {toast} added</div>}

    <div className="sp">
      {/* Search */}
      <div className="sp-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input placeholder="Search products…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} />
        {search && <button onClick={()=>{setSearch("");setPage(1)}} style={{background:"#e5e5ea",border:"none",borderRadius:"50%",width:20,height:20,cursor:"pointer",color:"#8e8e93",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>}
      </div>

      {/* Filters */}
      <div className="sp-filters">
        <button className={"sp-chip "+(inStock?"sp-chip-off":"sp-chip-on")} onClick={()=>{setInStock(false);setPage(1)}}>All</button>
        <button className={"sp-chip "+(inStock?"sp-chip-on":"sp-chip-off")} onClick={()=>{setInStock(true);setPage(1)}}>In stock</button>
        <div style={{width:1,background:"#e5e5ea",flexShrink:0}} />
        {brands.map((b:any)=>(
          <button key={b.id} className={"sp-chip "+(brandId===b.id?"sp-chip-on":"sp-chip-off")} onClick={()=>{setBrandId(brandId===b.id?"":b.id);setPage(1)}}>{b.name}</button>
        ))}
      </div>

      {/* Count */}
      {!isLoading && <p style={{fontSize:12,color:"#8e8e93",marginBottom:12,fontFamily:"'Inter',system-ui"}}>{data?.total??0} products</p>}

      {/* Grid */}
      {isLoading ? (
        <div className="sp-grid">
          {Array.from({length:8}).map((_,i)=>(
            <div key={i} style={{background:"white",borderRadius:16,aspectRatio:"0.75",opacity:.5}} />
          ))}
        </div>
      ) : products.length===0 ? (
        <div className="sp-empty">
          <div style={{fontSize:44,marginBottom:12}}>📦</div>
          <p style={{fontWeight:600,color:"#1c1c1e",margin:"0 0 4px",fontFamily:"'Inter',system-ui"}}>No products found</p>
          <p style={{fontSize:13,color:"#8e8e93",fontFamily:"'Inter',system-ui"}}>Try adjusting your search</p>
        </div>
      ) : (
        <div className="sp-grid">
          {products.map((p:any)=>{
            const qty = getQty(p)
            const max = maxQty(p)
            const isAdded = added[p.id]
            const unavailable = p.status==="OUT_OF_STOCK"||p.stockUnits===0
            const imgUrl = p.images?.[0]?.url
            const lowStock = p.stockUnits > 0 && p.stockUnits <= 12
            return (
              <div key={p.id} className="sp-card">
                <div className="sp-card-img">
                  {imgUrl ? <img src={imgUrl} alt={p.name} /> : <span style={{fontSize:36,opacity:.4}}>🎁</span>}
                  {p.badges?.includes("NEW") && <span className="sp-badge sp-badge-new">NEW</span>}
                  {unavailable && <div style={{position:"absolute",inset:0,background:"rgba(255,255,255,.75)",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{background:"#f2f2f7",borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:600,color:"#8e8e93"}}>Out of stock</span></div>}
                </div>
                <div className="sp-card-body">
                  <div className="sp-brand">{p.brand?.name}</div>
                  <div className="sp-name">{p.name}</div>
                  <div className="sp-price-row">
                    <span className="sp-price">{fmt(p.unitCostPence)}<span style={{fontSize:11,fontWeight:400,color:"#8e8e93"}}>/unit</span></span>
                    {!unavailable && <span className={lowStock?"sp-stock-low":"sp-stock-ok"}>{lowStock?`${p.stockUnits} left`:"In stock"}</span>}
                  </div>
                  {!unavailable && (
                    <>
                      <div className="sp-stepper">
                        <button className="sp-step-btn" onClick={()=>setQtys(q=>({...q,[p.id]:Math.max(p.cduSize,qty-p.cduSize)}))} disabled={qty<=p.cduSize}>−</button>
                        <span className="sp-step-val">{qty}</span>
                        <button className="sp-step-btn" onClick={()=>setQtys(q=>({...q,[p.id]:Math.min(max,qty+p.cduSize)}))} disabled={qty>=max}>+</button>
                      </div>
                      <button className={"sp-add "+(isAdded?"sp-add-done":"sp-add-default")} onClick={()=>handleAdd(p.id,qty,p.name)} disabled={isAdded}>
                        {isAdded?"✓ Added":"Add to basket"}
                      </button>
                      <button className="sp-offer" onClick={()=>{setOfferModal(p);setOfferPrice(((p.unitCostPence*0.85)/100).toFixed(2));setOfferQty(p.cduSize)}}>
                        Make an offer
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
      {totalPages > 1 && (
        <div className="sp-pag">
          <button className="sp-pag-btn" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>← Previous</button>
          <span style={{fontSize:13,color:"#8e8e93",fontFamily:"'Inter',system-ui"}}>Page {page} of {totalPages}</span>
          <button className="sp-pag-btn" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>Next →</button>
        </div>
      )}
    </div>

    {/* Offer Modal */}
    {offerModal && (
      <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setOfferModal(null)}>
        <div className="modal-sheet">
          <div style={{width:36,height:4,background:"#e5e5ea",borderRadius:99,margin:"0 auto 20px"}} />
          <h3 style={{fontSize:18,fontWeight:700,color:"#1c1c1e",margin:"0 0 4px"}}>Make an offer</h3>
          <p style={{fontSize:14,color:"#8e8e93",margin:"0 0 20px"}}>{offerModal.name}</p>

          <div style={{background:"#f2f2f7",borderRadius:12,padding:"12px 16px",marginBottom:20,display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:13,color:"#8e8e93"}}>Listed price</span>
            <span style={{fontSize:14,fontWeight:600,color:"#1c1c1e"}}>{fmt(offerModal.unitCostPence)}/unit</span>
          </div>

          <label style={{display:"block",fontSize:13,fontWeight:600,color:"#1c1c1e",marginBottom:6}}>Your offer price (£/unit)</label>
          <input className="modal-input" type="number" step="0.01" value={offerPrice} onChange={e=>setOfferPrice(e.target.value)} placeholder="0.00" style={{marginBottom:16}} />

          <label style={{display:"block",fontSize:13,fontWeight:600,color:"#1c1c1e",marginBottom:6}}>Quantity</label>
          <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:16}}>
            <button onClick={()=>setOfferQty(q=>Math.max(offerModal.cduSize,q-offerModal.cduSize))} style={{width:44,height:44,borderRadius:99,background:"#f2f2f7",border:"none",fontSize:22,cursor:"pointer",color:"#88dde1"}}>−</button>
            <span style={{fontSize:18,fontWeight:600,color:"#1c1c1e",flex:1,textAlign:"center"}}>{offerQty}</span>
            <button onClick={()=>setOfferQty(q=>q+offerModal.cduSize)} style={{width:44,height:44,borderRadius:99,background:"#f2f2f7",border:"none",fontSize:22,cursor:"pointer",color:"#88dde1"}}>+</button>
          </div>

          <label style={{display:"block",fontSize:13,fontWeight:600,color:"#1c1c1e",marginBottom:6}}>Note (optional)</label>
          <input className="modal-input" type="text" value={offerNote} onChange={e=>setOfferNote(e.target.value)} placeholder="e.g. ordering in bulk…" style={{marginBottom:20}} />

          <button className="modal-btn-primary" onClick={handleOffer} disabled={offerSubmitting||!offerPrice||!offerQty}>
            {offerSubmitting?"Submitting…":"Submit offer"}
          </button>
          <button className="modal-btn-secondary" onClick={()=>setOfferModal(null)}>Cancel</button>
        </div>
      </div>
    )}
    </>
  )
}
