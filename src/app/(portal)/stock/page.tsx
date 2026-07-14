"use client"
import { useState, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

const fmt = (p: number) => new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(p/100)
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
  const [offerQty, setOfferQty] = useState(0)
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
  const totalPages = data?.totalPages ?? 1
  const getQty = (p: any) => qtys[p.id] ?? p.cduSize
  const maxQty = (p: any) => Math.floor(p.stockUnits/p.cduSize)*p.cduSize
  const setQtyVal = (id: string, v: number, max: number) => setQtys(q=>({...q,[id]:Math.min(Math.max(0,v),max)}))

  return (
    <div style={{padding:24,fontFamily:"system-ui,sans-serif"}}>
      {toast&&<div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#1A1A2E",color:"white",padding:"10px 20px",borderRadius:99,fontSize:13,fontWeight:500,zIndex:100,boxShadow:"0 4px 16px rgba(0,0,0,.2)",whiteSpace:"nowrap"}}>✓ {toast}</div>}

      <h1 style={{fontSize:22,fontWeight:700,color:"#1A1A2E",margin:"0 0 4px"}}>Live Stock</h1>
      <p style={{fontSize:13,color:"#8888AA",margin:"0 0 20px"}}>{data?.total??0} products available</p>

      <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"white",border:"1px solid rgba(0,0,0,.09)",borderRadius:10,marginBottom:14}}>
        <span style={{color:"#8888AA",fontSize:16}}>🔍</span>
        <input style={{border:"none",outline:"none",fontSize:13,color:"#1A1A2E",background:"transparent",flex:1}} placeholder="Search by name, SKU or brand…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} />
        {search&&<button onClick={()=>{setSearch("");setPage(1)}} style={{background:"none",border:"none",cursor:"pointer",color:"#8888AA",fontSize:16}}>×</button>}
      </div>

      <div style={{display:"flex",gap:6,flexWrap:"wrap" as const,marginBottom:20}}>
        {TYPES.map(t=>(
          <button key={t} onClick={()=>{setType(t);setPage(1)}} style={{padding:"5px 14px",borderRadius:99,fontSize:12,fontWeight:500,background:type===t?"#F0A3BC":"#F4F5F7",color:type===t?"white":"#4A4A6A",border:"none",cursor:"pointer"}}>
            {t==="ALL"?"All Types":t.replace(/_/g," ")}
          </button>
        ))}
        <button onClick={()=>{setInStock(v=>!v);setPage(1)}} style={{padding:"5px 14px",borderRadius:99,fontSize:12,fontWeight:500,background:inStock?"#F0A3BC":"#F4F5F7",color:inStock?"white":"#4A4A6A",border:"none",cursor:"pointer",marginLeft:"auto"}}>
          ✓ In stock only
        </button>
      </div>

      {isLoading?(
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
          {Array.from({length:6}).map((_,i)=><div key={i} style={{background:"white",border:"1px solid rgba(0,0,0,.08)",borderRadius:14,height:380}} />)}
        </div>
      ):products.length===0?(
        <div style={{textAlign:"center",padding:"64px 16px"}}>
          <div style={{fontSize:48,marginBottom:12}}>📦</div>
          <p style={{fontWeight:600,color:"#1A1A2E",margin:"0 0 4px"}}>No products found</p>
          <p style={{fontSize:13,color:"#8888AA",margin:0}}>Try adjusting your filters</p>
        </div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:20}}>
          {products.map((p:any)=>{
            const qty=getQty(p), max=maxQty(p), isAdded=added[p.id]
            const unavailable=p.status==="OUT_OF_STOCK"||p.stockUnits===0
            const comingSoon=p.status==="COMING_SOON"
            const imgUrl=p.images?.[0]?.url
            return (
              <div key={p.id} style={{background:"white",border:"1px solid rgba(0,0,0,.09)",borderRadius:14,overflow:"hidden",opacity:(unavailable||comingSoon)?.7:1}}>
                <div style={{height:175,background:imgUrl?"transparent":"linear-gradient(135deg,#FDE8EF,#E8F8F7)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:42,position:"relative",overflow:"hidden"}}>
                  {imgUrl&&<img src={imgUrl} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0}} />}
                  {!imgUrl&&<span>🎁</span>}
                  {p.badges?.includes("BEST_SELLER")&&<span style={{position:"absolute",top:8,left:8,background:"#FDE8EF",color:"#C4638A",border:"1px solid rgba(240,163,188,.3)",borderRadius:6,padding:"2px 8px",fontSize:9.5,fontWeight:700}}>⭐ Best Seller</span>}
                  {p.badges?.includes("NEW")&&!p.badges?.includes("BEST_SELLER")&&<span style={{position:"absolute",top:8,left:8,background:"#E8F8F7",color:"#3A9E9B",borderRadius:6,padding:"2px 8px",fontSize:9.5,fontWeight:700}}>✨ New</span>}
                  {(unavailable||comingSoon)&&<div style={{position:"absolute",inset:0,background:"rgba(255,255,255,.8)",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{background:"white",border:"1px solid rgba(0,0,0,.1)",borderRadius:8,padding:"4px 12px",fontSize:12,fontWeight:600,color:"#8888AA"}}>{comingSoon?"Coming Soon":"Out of Stock"}</span></div>}
                </div>
                <div style={{padding:14}}>
                  <p style={{fontSize:10,fontWeight:700,textTransform:"uppercase" as const,letterSpacing:".1em",color:"#3A9E9B",margin:"0 0 3px"}}>{p.brand?.name}</p>
                  <p style={{fontSize:13,fontWeight:600,color:"#1A1A2E",lineHeight:1.35,margin:"0 0 3px"}}>{p.name}</p>
                  <p style={{fontSize:10,fontFamily:"monospace",color:"#BBBBCC",margin:"0 0 10px"}}>{p.sku}</p>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",background:"#F9FAFB",border:"1px solid rgba(0,0,0,.07)",borderRadius:8,padding:"8px 6px",marginBottom:10}}>
                    <div style={{textAlign:"center"}}><p style={{fontSize:9,color:"#8888AA",margin:"0 0 2px"}}>Unit</p><p style={{fontSize:12,fontWeight:600,color:"#1A1A2E",margin:0}}>{fmt(p.unitCostPence)}</p></div>
                    <div style={{textAlign:"center"}}><p style={{fontSize:9,color:"#8888AA",margin:"0 0 2px"}}>CDU ×{p.cduSize}</p><p style={{fontSize:12,fontWeight:600,color:"#C4638A",margin:0}}>{fmt(p.unitCostPence*p.cduSize)}</p></div>
                    <div style={{textAlign:"center"}}><p style={{fontSize:9,color:"#8888AA",margin:"0 0 2px"}}>RRP</p><p style={{fontSize:12,fontWeight:600,color:"#8888AA",margin:0}}>{fmt(p.rrpPence)}</p></div>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#8888AA",marginBottom:10}}>
                    <span>Stock</span>
                    <span style={{fontWeight:600,color:p.stockUnits===0?"#E11D48":p.stockUnits<=10?"#D97706":"#0EA572"}}>{p.stockUnits.toLocaleString()} units</span>
                  </div>
                  {!unavailable&&!comingSoon&&(
                    <>
                      <div style={{display:"flex",gap:8,marginBottom:6}}>
                        <div style={{display:"flex",alignItems:"center",border:"1px solid rgba(0,0,0,.12)",borderRadius:8,overflow:"hidden",background:"white"}}>
                          <button onClick={()=>setQtyVal(p.id,qty-p.cduSize,max)} disabled={qty<=p.cduSize} style={{background:qty<=p.cduSize?"#F9FAFB":"#F4F5F7",border:"none",padding:"7px 10px",fontSize:14,cursor:qty<=p.cduSize?"not-allowed":"pointer",color:qty<=p.cduSize?"#CCCCCC":"#4A4A6A"}}>−</button>
                          <span style={{fontSize:13,fontWeight:600,padding:"0 8px",color:"#1A1A2E",minWidth:32,textAlign:"center"}}>{qty}</span>
                          <button onClick={()=>setQtyVal(p.id,qty+p.cduSize,max)} disabled={qty>=max} style={{background:qty>=max?"#F9FAFB":"#F4F5F7",border:"none",padding:"7px 10px",fontSize:14,cursor:qty>=max?"not-allowed":"pointer",color:qty>=max?"#CCCCCC":"#4A4A6A"}}>+</button>
                        </div>
                        <button onClick={()=>handleAdd(p.id,qty,p.name)} disabled={isAdded} style={{flex:1,padding:"8px 0",background:isAdded?"#0EA572":"#F0A3BC",color:"white",border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                          {isAdded?"✓ Added!":"🛒 Add"}
                        </button>
                      </div>
                      <button onClick={()=>{setOfferModal(p);setOfferPrice(((p.unitCostPence*0.85)/100).toFixed(2));setOfferQty(p.cduSize);setOfferNote("")}}
                        style={{width:"100%",padding:"8px 0",background:"#FFD020",border:"none",borderRadius:8,fontSize:12,fontWeight:700,color:"#1A1A2E",cursor:"pointer",letterSpacing:".02em"}}>
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

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap" as const,gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:12,color:"#8888AA"}}>Show</span>
          <select value={perPage} onChange={e=>{setPerPage(Number(e.target.value));setPage(1)}} style={{padding:"5px 10px",border:"1px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:12,color:"#1A1A2E",background:"white",outline:"none",cursor:"pointer"}}>
            {[12,24,48,96].map(n=><option key={n} value={n}>{n} per page</option>)}
          </select>
          <span style={{fontSize:12,color:"#8888AA"}}>· {data?.total??0} total</span>
        </div>
        {totalPages>1&&(
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <button onClick={()=>setPage(1)} disabled={page===1} style={{padding:"6px 10px",border:"1px solid rgba(0,0,0,.12)",borderRadius:7,fontSize:12,background:"white",color:page===1?"#CCCCCC":"#4A4A6A",cursor:page===1?"default":"pointer"}}>«</button>
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{padding:"6px 12px",border:"1px solid rgba(0,0,0,.12)",borderRadius:7,fontSize:12,background:"white",color:page===1?"#CCCCCC":"#4A4A6A",cursor:page===1?"default":"pointer"}}>← Prev</button>
            {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
              let pg=page<=3?i+1:page>=totalPages-2?totalPages-4+i:page-2+i
              pg=Math.max(1,Math.min(totalPages,pg))
              return <button key={pg} onClick={()=>setPage(pg)} style={{padding:"6px 12px",border:"1px solid",borderColor:page===pg?"#F0A3BC":"rgba(0,0,0,.12)",borderRadius:7,fontSize:12,background:page===pg?"#F0A3BC":"white",color:page===pg?"white":"#4A4A6A",cursor:"pointer",fontWeight:page===pg?600:400}}>{pg}</button>
            })}
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} style={{padding:"6px 12px",border:"1px solid rgba(0,0,0,.12)",borderRadius:7,fontSize:12,background:"white",color:page===totalPages?"#CCCCCC":"#4A4A6A",cursor:page===totalPages?"default":"pointer"}}>Next →</button>
            <button onClick={()=>setPage(totalPages)} disabled={page===totalPages} style={{padding:"6px 10px",border:"1px solid rgba(0,0,0,.12)",borderRadius:7,fontSize:12,background:"white",color:page===totalPages?"#CCCCCC":"#4A4A6A",cursor:page===totalPages?"default":"pointer"}}>»</button>
          </div>
        )}
      </div>

      {offerModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(2px)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>e.target===e.currentTarget&&setOfferModal(null)}>
          <div style={{background:"white",borderRadius:16,padding:28,maxWidth:420,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,.15)"}}>
            <div style={{fontSize:17,fontWeight:700,color:"#1A1A2E",margin:"0 0 4px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              Make an Offer
              <button onClick={()=>setOfferModal(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:"#8888AA",padding:0}}>×</button>
            </div>
            <p style={{fontSize:12,color:"#8888AA",margin:"0 0 16px"}}>{offerModal.name}</p>
            <div style={{background:"#F9FAFB",borderRadius:10,padding:"10px 14px",marginBottom:16,display:"flex",justifyContent:"space-between",fontSize:13}}>
              <span style={{color:"#8888AA"}}>Listed price</span>
              <span style={{fontWeight:600,color:"#1A1A2E"}}>{fmt(offerModal.unitCostPence)}/unit</span>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontSize:11,fontWeight:600,color:"#4A4A6A",marginBottom:5,textTransform:"uppercase" as const,letterSpacing:".05em"}}>Your offer price (£/unit)</label>
              <input type="number" step="0.01" value={offerPrice} onChange={e=>setOfferPrice(e.target.value)} autoFocus
                style={{width:"100%",padding:"10px 12px",border:"1.5px solid #F0A3BC",borderRadius:8,fontSize:14,fontWeight:600,color:"#C4638A",outline:"none",boxSizing:"border-box" as const,background:"white"}} />
              {offerPrice&&parseFloat(offerPrice)>0&&(
                <div style={{fontSize:11,color:"#8888AA",marginTop:4}}>
                  Saving {fmt(offerModal.unitCostPence-Math.round(parseFloat(offerPrice)*100))}/unit · {Math.round(((offerModal.unitCostPence/100-parseFloat(offerPrice))/(offerModal.unitCostPence/100))*100)}% off
                </div>
              )}
            </div>
            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontSize:11,fontWeight:600,color:"#4A4A6A",marginBottom:8,textTransform:"uppercase" as const,letterSpacing:".05em"}}>Quantity</label>
              <div style={{display:"flex",alignItems:"center",border:"1.5px solid rgba(0,0,0,.12)",borderRadius:10,overflow:"hidden"}}>
                <button onClick={()=>setOfferQty(q=>Math.max(offerModal.cduSize,q-offerModal.cduSize))} style={{padding:"12px 18px",background:"#F4F5F7",border:"none",fontSize:20,cursor:"pointer",color:"#4A4A6A",lineHeight:1}}>−</button>
                <div style={{flex:1,textAlign:"center" as const}}>
                  <div style={{fontSize:20,fontWeight:700,color:"#1A1A2E"}}>{offerQty}</div>
                  <div style={{fontSize:10,color:"#8888AA"}}>CDU size: ×{offerModal.cduSize}</div>
                </div>
                <button onClick={()=>setOfferQty(q=>q+offerModal.cduSize)} style={{padding:"12px 18px",background:"#F4F5F7",border:"none",fontSize:20,cursor:"pointer",color:"#4A4A6A",lineHeight:1}}>+</button>
              </div>
              <div style={{fontSize:11,color:"#8888AA",marginTop:5,textAlign:"center" as const}}>
                {Math.round(offerQty/offerModal.cduSize)} CDU{Math.round(offerQty/offerModal.cduSize)!==1?"s":""}
                {offerPrice&&parseFloat(offerPrice)>0?" · Total: "+fmt(Math.round(parseFloat(offerPrice)*100)*offerQty):""}
              </div>
            </div>
            <div style={{marginBottom:20}}>
              <label style={{display:"block",fontSize:11,fontWeight:600,color:"#4A4A6A",marginBottom:5,textTransform:"uppercase" as const,letterSpacing:".05em"}}>Note (optional)</label>
              <input type="text" value={offerNote} onChange={e=>setOfferNote(e.target.value)} placeholder="e.g. ordering in bulk this month…"
                style={{width:"100%",padding:"10px 12px",border:"1.5px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:13,color:"#1A1A2E",outline:"none",boxSizing:"border-box" as const,background:"white"}} />
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setOfferModal(null)} style={{flex:1,padding:"10px 0",background:"white",color:"#4A4A6A",border:"1px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer"}}>Cancel</button>
              <button onClick={handleOffer} disabled={offerSubmitting||!offerPrice||!offerQty}
                style={{flex:2,padding:"10px 0",background:"#F0A3BC",color:"white",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",opacity:offerSubmitting?.6:1}}>
                {offerSubmitting?"Submitting…":"Submit Offer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
