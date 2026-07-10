"use client"
import { useState, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { formatCurrency } from "@/lib/utils"

const TYPES = ["ALL","BLIND_BOX","FIGURE","PLUSH","ACCESSORY","BUNDLE"]

export default function StockPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [type, setType] = useState("ALL")
  const [inStock, setInStock] = useState(false)
  const [page, setPage] = useState(1)
  const [added, setAdded] = useState<Record<string,boolean>>({})
  const [qtys, setQtys] = useState<Record<string,number>>({})
  const [toast, setToast] = useState<string|null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["products", search, type, inStock, page],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), limit: "12", ...(search&&{search}), ...(type!=="ALL"&&{type}), ...(inStock&&{inStock:"true"}) })
      const r = await fetch("/api/products?"+p); return r.json()
    },
  })

  const addMutation = useMutation({
    mutationFn: async ({ productId, quantity }: any) => {
      const r = await fetch("/api/basket", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({productId, quantity}) })
      return r.json()
    },
    onMutate: async ({ productId, quantity }) => {
      // Optimistic update — update basket count immediately
      await qc.cancelQueries({ queryKey: ["basket"] })
      const prev = qc.getQueryData(["basket"]) as any
      if (prev) {
        const existing = prev.items?.find((i: any) => i.productId === productId)
        const newItems = existing
          ? prev.items.map((i: any) => i.productId === productId ? {...i, quantity: i.quantity + quantity, lineTotalPence: i.unitCostPence * (i.quantity + quantity)} : i)
          : [...(prev.items??[]), { id: "temp-"+productId, productId, productName: "...", sku: "", quantity, unitCostPence: 0, lineTotalPence: 0, cduSize: 6, imageUrl: null }]
        qc.setQueryData(["basket"], { ...prev, items: newItems })
      }
      return { prev }
    },
    onSuccess: (data, { productId }) => {
      qc.setQueryData(["basket"], data)
      setAdded(a => ({...a, [productId]: true}))
      setTimeout(() => setAdded(a => ({...a, [productId]: false})), 1500)
    },
    onError: (_err, _vars, ctx: any) => {
      if (ctx?.prev) qc.setQueryData(["basket"], ctx.prev)
    },
  })

  const handleAdd = useCallback((productId: string, qty: number, name: string) => {
    addMutation.mutate({ productId, quantity: qty })
    setToast(name+" added to basket")
    setTimeout(() => setToast(null), 2000)
  }, [addMutation])

  const products = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const getQty = (p: any) => qtys[p.id] ?? p.cduSize
  const maxQty = (p: any) => Math.floor(p.stockUnits / p.cduSize) * p.cduSize
  const setQty = (id: string, v: number, max: number) => setQtys(q => ({...q, [id]: Math.min(Math.max(0, v), max)}))

  return (
    <>
    <style>{`
      .p-page{padding:24px;font-family:system-ui,sans-serif}
      .page-title{font-size:22px;font-weight:700;color:#1A1A2E;margin:0 0 4px}
      .page-sub{font-size:13px;color:#8888AA;margin:0 0 24px}
      .search-box{display:flex;align-items:center;gap:10px;padding:10px 14px;background:white;border:1px solid rgba(0,0,0,.09);border-radius:10px;margin-bottom:14px}
      .search-box input{border:none;outline:none;font-size:13px;color:#1A1A2E;background:transparent;flex:1}
      .chip-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px}
      .chip{padding:5px 14px;border-radius:99px;font-size:12px;font-weight:500;background:#F4F5F7;color:#4A4A6A;cursor:pointer;border:1px solid transparent;transition:all .15s}
      .chip:hover{background:#FDE8EF;color:#C4638A}
      .chip-active{background:#F0A3BC;color:white;border-color:#F0A3BC}
      .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
      .product-card{background:white;border:1px solid rgba(0,0,0,.09);border-radius:14px;overflow:hidden;transition:all .2s;cursor:default}
      .product-card:hover{box-shadow:0 8px 24px rgba(240,163,188,.2);border-color:rgba(240,163,188,.5);transform:translateY(-2px)}
      .product-img{height:137px;width:100%;background:linear-gradient(135deg,#FDE8EF,#E8F8F7);display:flex;align-items:center;justify-content:center;font-size:42px;position:relative;overflow:hidden}
  .product-img img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0}
      .product-body{padding:14px}
      .brand-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#3A9E9B;margin:0 0 4px}
      .product-name{font-size:13px;font-weight:600;color:#1A1A2E;line-height:1.35;margin:0 0 4px}
      .product-sku{font-size:10px;font-family:monospace;color:#BBBBCC;margin:0 0 10px}
      .price-grid{display:grid;grid-template-columns:repeat(3,1fr);background:#F9FAFB;border:1px solid rgba(0,0,0,.07);border-radius:8px;padding:8px 6px;margin-bottom:10px}
      .price-col{text-align:center}
      .price-col p{margin:0}
      .price-col .lbl{font-size:9px;color:#8888AA;margin-bottom:2px}
      .price-col .val{font-size:12px;font-weight:600;color:#1A1A2E}
      .price-col .val.pink{color:#C4638A}
      .price-col .val.muted{color:#8888AA}
      .stock-row{display:flex;justify-content:space-between;font-size:11px;color:#8888AA;margin-bottom:10px}
      .add-row{display:flex;gap:8px}
      .stepper{display:flex;align-items:center;border:1px solid rgba(0,0,0,.12);border-radius:8px;overflow:hidden;background:white}
      .stepper button{background:#F4F5F7;border:none;padding:7px 10px;font-size:14px;cursor:pointer;color:#4A4A6A;transition:background .1s}
      .stepper button:hover{background:#FDE8EF;color:#C4638A}
      .stepper span{font-size:13px;font-weight:600;padding:0 8px;color:#1A1A2E;min-width:32px;text-align:center}
      .add-btn{flex:1;padding:8px;background:#F0A3BC;color:white;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;transition:all .15s}
      .add-btn:hover{background:#E88BAA}
      .add-btn.done{background:#0EA572}
      .badge-abs{position:absolute;top:8px;left:8px;padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700}
      .badge-pink{background:#FDE8EF;color:#C4638A;border:1px solid rgba(240,163,188,.3)}
      .badge-teal{background:#E8F8F7;color:#3A9E9B;border:1px solid rgba(92,200,197,.3)}
      .badge-grey{background:rgba(255,255,255,.9);color:#8888AA;border:1px solid rgba(0,0,0,.1)}
      .empty-state{text-align:center;padding:64px 16px}
      .row-between{display:flex;align-items:center;justify-content:space-between;gap:12px}
      .btn-ghost{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:white;color:#4A4A6A;border:1px solid rgba(0,0,0,.12);border-radius:8px;font-size:13px;font-weight:500;cursor:pointer}
      .btn-ghost:disabled{opacity:.4;cursor:not-allowed}
      .overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:48;display:flex;align-items:center;justify-content:center}
      .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1A1A2E;color:white;padding:10px 20px;border-radius:99px;font-size:13px;font-weight:500;z-index:100;box-shadow:0 4px 16px rgba(0,0,0,.2);animation:fadeUp .2s ease;white-space:nowrap}
      @keyframes fadeUp{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
    `}</style>
    {toast && <div className="toast">✓ {toast}</div>}
    <div className="p-page">
      <div style={{marginBottom:20}}><h1 className="page-title">Live Stock</h1><p className="page-sub">{data?.total ?? 0} products available</p></div>
      <div className="search-box">
        <span style={{color:"#8888AA",fontSize:16}}>🔍</span>
        <input placeholder="Search by name, SKU or brand…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} />
        {search && <button onClick={()=>{setSearch("");setPage(1)}} style={{background:"none",border:"none",cursor:"pointer",color:"#8888AA",fontSize:16}}>×</button>}
      </div>
      <div className="chip-row">
        {TYPES.map(t=><button key={t} className={"chip"+(type===t?" chip-active":"")} onClick={()=>{setType(t);setPage(1)}}>{t==="ALL"?"All Types":t.replace(/_/g," ")}</button>)}
        <button className={"chip"+(inStock?" chip-active":"")} style={{marginLeft:"auto"}} onClick={()=>{setInStock(v=>!v);setPage(1)}}>✓ In stock only</button>
      </div>
      {isLoading ? (
        <div className="grid3">{Array.from({length:6}).map((_,i)=><div key={i} style={{background:"white",borderRadius:14,height:320,animation:"pulse 1.5s infinite",border:"1px solid rgba(0,0,0,.07)"}} />)}</div>
      ) : products.length===0 ? (
        <div className="empty-state"><div style={{fontSize:48,marginBottom:12}}>📦</div><p style={{fontWeight:600,color:"#1A1A2E",margin:"0 0 4px"}}>No products found</p><p style={{fontSize:13,color:"#8888AA"}}>Try adjusting your filters</p></div>
      ) : (
        <div className="grid3">
          {products.map((p: any) => {
            const qty = getQty(p)
            const cduCost = p.unitCostPence * p.cduSize
            const isAdded = added[p.id]
            const outOfStock = p.status==="OUT_OF_STOCK" || p.stockUnits===0
            const comingSoon = p.status==="COMING_SOON"
            const unavailable = outOfStock || comingSoon
            return (
              <div key={p.id} className="product-card" style={unavailable?{opacity:.65}:{}}>
                <div className="product-img">
                  {p.images?.[0]?.url ? <img src={p.images[0].url} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0}} /> : <span>🎁</span>}
                  {p.badges?.includes("BEST_SELLER")&&<span className="badge-abs badge-pink">⭐ Best Seller</span>}
                  {p.badges?.includes("NEW")&&!p.badges?.includes("BEST_SELLER")&&<span className="badge-abs badge-teal">✨ New</span>}
                  {p.badges?.includes("EXCLUSIVE")&&<span className="badge-abs" style={{background:"#F3EEFF",color:"#7C3AED",border:"1px solid rgba(124,58,237,.3)",position:"absolute",top:8,left:8,padding:"3px 8px",borderRadius:6,fontSize:10,fontWeight:700}}>💎 Exclusive</span>}
                  {(outOfStock||comingSoon)&&<div style={{position:"absolute",inset:0,background:"rgba(255,255,255,.8)",display:"flex",alignItems:"center",justifyContent:"center"}}><span className="badge-abs badge-grey" style={{position:"static"}}>{comingSoon?"Coming Soon":"Out of Stock"}</span></div>}
                </div>
                <div className="product-body">
                  <p className="brand-label">{p.brand?.name}</p>
                  <p className="product-name">{p.name}</p>
                  <p className="product-sku">{p.sku}</p>
                  <div className="price-grid">
                    <div className="price-col"><p className="lbl">Unit</p><p className="val">{formatCurrency(p.unitCostPence)}</p></div>
                    <div className="price-col"><p className="lbl">CDU ×{p.cduSize}</p><p className="val pink">{formatCurrency(cduCost)}</p></div>
                    <div className="price-col"><p className="lbl">RRP</p><p className="val muted">{formatCurrency(p.rrpPence)}</p></div>
                  </div>
                  <div className="stock-row">
                    <span>Stock</span>
                    <span style={{fontWeight:600,color:p.stockUnits===0?"#E11D48":p.stockUnits<=10?"#D97706":"#0EA572"}}>{p.stockUnits.toLocaleString()} units</span>
                  </div>
                  {!unavailable&&(
                    <div className="add-row">
                      <div className="stepper">
                        <button onClick={()=>setQty(p.id, qty-p.cduSize, maxQty(p))} disabled={qty<=p.cduSize}>−</button>
                        <span>{qty}</span>
                        <button onClick={()=>setQty(p.id, qty+p.cduSize, maxQty(p))} disabled={qty>=maxQty(p)}>+</button>
                      </div>
                      <button className={"add-btn"+(isAdded?" done":"")} onClick={()=>handleAdd(p.id, qty, p.name)} disabled={isAdded || qty > p.stockUnits}>
                        {isAdded ? "✓ Added!" : "🛒 Add to basket"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      {totalPages>1&&(
        <div className="row-between" style={{marginTop:20}}>
          <span style={{fontSize:13,color:"#8888AA"}}>Page {page} of {totalPages}</span>
          <div style={{display:"flex",gap:8}}>
            <button className="btn-ghost" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>← Prev</button>
            <button className="btn-ghost" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>Next →</button>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
