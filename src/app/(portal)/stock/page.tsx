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
    <>
    <style>{`
  .p-page{padding:24px;font-family:system-ui,sans-serif}
  .page-title{font-size:22px;font-weight:700;color:#1A1A2E;margin:0 0 4px}
  .page-sub{font-size:13px;color:#8888AA;margin:0 0 24px}
  .section-head{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:#8888AA;margin:0 0 10px}
  .card{background:white;border:1px solid rgba(0,0,0,.09);border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.05)}
  .card-pad{padding:16px}
  .card-table{overflow:hidden}
  .tbl{width:100%;border-collapse:collapse}
  .tbl th{background:#F4F5F7;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#8888AA;padding:10px 14px;text-align:left;border-bottom:1px solid rgba(0,0,0,.08)}
  .tbl td{padding:10px 14px;font-size:13px;border-bottom:1px solid rgba(0,0,0,.06);color:#1A1A2E}
  .tbl tr:last-child td{border-bottom:none}
  .tbl tr:hover td{background:rgba(0,0,0,.01)}
  .badge{display:inline-flex;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600}
  .badge-teal{background:#E8F8F7;color:#3A9E9B}
  .badge-purple{background:#F3EEFF;color:#7C3AED}
  .badge-amber{background:#FEF3C7;color:#D97706}
  .badge-green{background:#EAFAF3;color:#0EA572}
  .badge-grey{background:#F4F5F7;color:#8888AA}
  .badge-red{background:#FFF1F4;color:#E11D48}
  .badge-pink{background:#FDE8EF;color:#C4638A}
  .row{display:flex;align-items:center;gap:12px}
  .row-between{display:flex;align-items:center;justify-content:space-between;gap:12px}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
  .grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
  .grid-3-1{display:grid;grid-template-columns:3fr 1fr;gap:16px}
  .mb4{margin-bottom:4px}.mb8{margin-bottom:8px}.mb12{margin-bottom:12px}.mb16{margin-bottom:16px}.mb24{margin-bottom:24px}
  .mt8{margin-top:8px}.mt16{margin-top:16px}
  .txt-primary{color:#1A1A2E}.txt-secondary{color:#4A4A6A}.txt-muted{color:#8888AA}
  .txt-pink{color:#C4638A}.txt-teal{color:#3A9E9B}.txt-green{color:#0EA572}.txt-red{color:#E11D48}.txt-amber{color:#D97706}
  .fw600{font-weight:600}.fw700{font-weight:700}
  .fs11{font-size:11px}.fs12{font-size:12px}.fs13{font-size:13px}
  .btn-pink{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:#F0A3BC;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none}
  .btn-pink:hover{background:#E88BAA}
  .btn-ghost{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:white;color:#4A4A6A;border:1px solid rgba(0,0,0,.12);border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;text-decoration:none}
  .btn-ghost:hover{background:#F4F5F7}
  .btn-sm{padding:5px 10px;font-size:12px}
  .input{width:100%;padding:9px 12px;border:1px solid rgba(0,0,0,.12);border-radius:8px;font-size:13px;color:#1A1A2E;outline:none;box-sizing:border-box;background:white}
  .input:focus{border-color:#F0A3BC;box-shadow:0 0 0 3px rgba(240,163,188,.15)}
  .input-label{display:block;font-size:11px;font-weight:600;color:#4A4A6A;margin-bottom:5px;text-transform:uppercase;letter-spacing:.05em}
  .select{width:100%;padding:9px 12px;border:1px solid rgba(0,0,0,.12);border-radius:8px;font-size:13px;color:#1A1A2E;outline:none;background:white;cursor:pointer}
  .chip{padding:4px 12px;border-radius:99px;font-size:12px;font-weight:500;background:#F4F5F7;color:#4A4A6A;cursor:pointer;border:none}
  .chip:hover{background:#FDE8EF;color:#C4638A}
  .chip-active{background:#F0A3BC;color:white}
  .chip-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
  .search-box{display:flex;align-items:center;gap:10px;padding:10px 14px;background:white;border:1px solid rgba(0,0,0,.09);border-radius:10px;margin-bottom:14px}
  .search-box input{border:none;outline:none;font-size:13px;color:#1A1A2E;background:transparent;flex:1}
  .product-card{background:white;border:1px solid rgba(0,0,0,.09);border-radius:12px;overflow:hidden;transition:box-shadow .2s}
  .product-card:hover{box-shadow:0 4px 16px rgba(240,163,188,.2);border-color:rgba(240,163,188,.4)}
  .product-img{height:120px;background:#F4F5F7;display:flex;align-items:center;justify-content:center;font-size:36px;position:relative}
  .product-body{padding:12px}
  .price-grid{display:grid;grid-template-columns:repeat(3,1fr);background:#F9FAFB;border:1px solid rgba(0,0,0,.07);border-radius:8px;padding:8px;margin:8px 0}
  .price-col{text-align:center}
  .price-col-label{font-size:9px;color:#8888AA;margin:0 0 2px}
  .price-col-val{font-size:12px;font-weight:600;color:#1A1A2E;margin:0}
  .price-col-val.pink{color:#C4638A}
  .price-col-val.muted{color:#8888AA}
  .stepper{display:flex;align-items:center;border:1px solid rgba(0,0,0,.12);border-radius:8px;overflow:hidden}
  .stepper button{background:#F4F5F7;border:none;padding:6px 10px;font-size:14px;cursor:pointer;color:#4A4A6A}
  .stepper span{font-size:13px;font-weight:600;padding:0 8px;color:#1A1A2E;min-width:30px;text-align:center}
  .add-btn{flex:1;background:#F0A3BC;color:white;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;padding:7px;display:flex;align-items:center;justify-content:center;gap:4px}
  .add-btn:hover{background:#E88BAA}
  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);backdrop-filter:blur(2px);z-index:50;display:flex;align-items:center;justify-content:center;padding:16px}
  .modal{background:white;border-radius:16px;padding:24px;max-width:500px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.15)}
  .modal-title{font-size:16px;font-weight:700;color:#1A1A2E;margin:0 0 20px;display:flex;align-items:center;justify-content:space-between}
  .form-row{margin-bottom:14px}
  .stat-card{background:white;border:1px solid rgba(0,0,0,.09);border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.05)}
  .stat-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:#8888AA;margin:0 0 8px}
  .stat-val{font-size:22px;font-weight:700;color:#1A1A2E;margin:0 0 4px}
  .stat-sub{font-size:12px;margin:0;color:#8888AA}
  .annc-card{border-left:3px solid #5CC8C5;background:#E8F8F7;border-radius:0 8px 8px 0;padding:10px 14px;margin-bottom:10px}
  .annc-card.pink{border-color:#F0A3BC;background:#FDE8EF}
  .annc-title{font-size:13px;font-weight:600;color:#1A1A2E;margin:0 0 4px}
  .annc-body{font-size:12px;color:#4A4A6A;margin:0}
  .tag-pink{background:#FDE8EF;color:#C4638A;border:1px solid rgba(240,163,188,.3);border-radius:6px;padding:2px 8px;font-size:11px;font-weight:600}
  .tag-teal{background:#E8F8F7;color:#3A9E9B;border:1px solid rgba(92,200,197,.3);border-radius:6px;padding:2px 8px;font-size:11px;font-weight:600}
  .empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 16px;text-align:center}
  .pagination{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-top:1px solid rgba(0,0,0,.08)}
  .drawer{position:fixed;inset-y:0;right:0;width:380px;background:white;border-left:1px solid rgba(0,0,0,.09);z-index:50;display:flex;flex-direction:column;box-shadow:-4px 0 24px rgba(0,0,0,.08)}
  .drawer-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(0,0,0,.08)}
  .drawer-body{flex:1;overflow-y:auto;padding:16px}
  .drawer-footer{border-top:1px solid rgba(0,0,0,.08);padding:16px}
  .backdrop{position:fixed;inset:0;background:rgba(0,0,0,.2);z-index:40}
`}</style>
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
    </>
  )
}