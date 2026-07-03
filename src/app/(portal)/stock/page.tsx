"use client"
import { useState, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { formatCurrencyFromPounds } from "@/lib/utils"

const TYPES = ["ALL","BLIND_BOX","FIGURE","PLUSH","ACCESSORY","BUNDLE"]

export default function StockPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [type, setType] = useState("ALL")
  const [inStock, setInStock] = useState(false)
  const [page, setPage] = useState(1)
  const [added, setAdded] = useState<string|null>(null)
  const [qtys, setQtys] = useState<Record<string,number>>({})

  const { data, isLoading } = useQuery({
    queryKey: ["products", search, type, inStock, page],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), limit: "12", ...(search && {search}), ...(type!=="ALL"&&{type}), ...(inStock&&{inStock:"true"}) })
      const r = await fetch("/api/products?"+p); return r.json()
    },
  })

  const addMutation = useMutation({
    mutationFn: async ({ productId, quantity }: any) => {
      const r = await fetch("/api/basket", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({productId, quantity}) })
      return r.json()
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["basket"] })
      setAdded(vars.productId)
      setTimeout(() => setAdded(null), 1800)
    },
  })

  const products = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  const getQty = (p: any) => qtys[p.id] ?? p.cduSize
  const setQty = (id: string, v: number) => setQtys(q => ({...q, [id]: v}))

  return (
    <div className="p-page">
      <div className="mb24"><h1 className="page-title">Live Stock</h1><p className="page-sub">{data?.total ?? 0} products available</p></div>
      <div className="search-box mb8">
        <span style={{color:"#8888AA"}}>🔍</span>
        <input placeholder="Search by name, SKU or brand…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} />
      </div>
      <div className="chip-row">
        {TYPES.map(t => <button key={t} className={"chip"+(type===t?" chip-active":"")} onClick={()=>{setType(t);setPage(1)}}>{t==="ALL"?"All Types":t.replace(/_/g," ")}</button>)}
        <button className={"chip"+(inStock?" chip-active":"")} style={{marginLeft:"auto"}} onClick={()=>{setInStock(v=>!v);setPage(1)}}>In stock only</button>
      </div>
      {isLoading ? (
        <div style={{textAlign:"center",padding:"48px",color:"#8888AA"}}>Loading products…</div>
      ) : products.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">📦</div><p className="fw600 txt-primary">No products found</p><p className="txt-muted fs13">Try adjusting your filters</p></div>
      ) : (
        <div className="grid3 mb16">
          {products.map((p: any) => {
            const qty = getQty(p)
            const cduCost = p.unitCostPence * p.cduSize
            const isAdded = added === p.id
            const outOfStock = p.status === "OUT_OF_STOCK" || p.stockUnits === 0
            const comingSoon = p.status === "COMING_SOON"
            return (
              <div key={p.id} className="product-card">
                <div className="product-img" style={{position:"relative"}}>
                  <span>🎁</span>
                  {p.badges?.includes("BEST_SELLER") && <span className="tag-pink" style={{position:"absolute",top:8,left:8}}>Best Seller</span>}
                  {p.badges?.includes("NEW") && <span className="tag-teal" style={{position:"absolute",top:8,left:8}}>New</span>}
                  {(outOfStock||comingSoon) && <div style={{position:"absolute",inset:0,background:"rgba(255,255,255,0.75)",display:"flex",alignItems:"center",justifyContent:"center"}}><span className="badge badge-grey">{comingSoon?"Coming Soon":"Out of Stock"}</span></div>}
                </div>
                <div className="product-body">
                  <p style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"#3A9E9B",margin:"0 0 2px"}}>{p.brand?.name}</p>
                  <p className="fw600 txt-primary mb4" style={{fontSize:13,lineHeight:1.3}}>{p.name}</p>
                  <p style={{fontSize:10,fontFamily:"monospace",color:"#8888AA",margin:"0 0 8px"}}>{p.sku}</p>
                  <div className="price-grid">
                    <div className="price-col"><p className="price-col-label">Unit</p><p className="price-col-val">{formatCurrencyFromPounds(p.unitCostPence)}</p></div>
                    <div className="price-col"><p className="price-col-label">CDU ×{p.cduSize}</p><p className="price-col-val pink">{formatCurrencyFromPounds(cduCost)}</p></div>
                    <div className="price-col"><p className="price-col-label">RRP</p><p className="price-col-val muted">{formatCurrencyFromPounds(p.rrpPence)}</p></div>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#8888AA",margin:"6px 0 8px"}}>
                    <span>Stock</span>
                    <span style={{color:p.stockUnits===0?"#E11D48":p.stockUnits<=10?"#D97706":"#0EA572",fontWeight:600}}>{p.stockUnits} units</span>
                  </div>
                  {!outOfStock && !comingSoon && (
                    <div style={{display:"flex",gap:6}}>
                      <div className="stepper">
                        <button onClick={()=>setQty(p.id, Math.max(p.cduSize, qty-p.cduSize))}>−</button>
                        <span>{qty}</span>
                        <button onClick={()=>setQty(p.id, qty+p.cduSize)}>+</button>
                      </div>
                      <button className="add-btn" onClick={()=>addMutation.mutate({productId:p.id,quantity:qty})} disabled={addMutation.isPending||isAdded} style={isAdded?{background:"#0EA572"}:{}}>
                        {isAdded ? "✓ Added" : "🛒 Add"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      {totalPages > 1 && (
        <div className="row-between mt8">
          <span className="txt-muted fs13">Page {page} of {totalPages}</span>
          <div className="row" style={{gap:8}}>
            <button className="btn-ghost btn-sm" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>← Prev</button>
            <button className="btn-ghost btn-sm" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>Next →</button>
          </div>
        </div>
      )}
    </div>
  )
}
