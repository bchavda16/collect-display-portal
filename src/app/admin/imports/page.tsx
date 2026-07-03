"use client"
import { useState, useRef } from "react"

export default function AdminImportsPage() {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File|null>(null)
  const [preview, setPreview] = useState<any>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const parseCSV = (text: string) => {
    const lines = text.trim().split("\n")
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/ /g,"_"))
    return lines.slice(1).map((line, i) => {
      const vals = line.split(",")
      const row: any = { _rowNum: i + 2 }
      headers.forEach((h, j) => { row[h] = vals[j]?.trim() ?? "" })
      return row
    })
  }

  const handleFile = async (f: File) => {
    setFile(f); setResult(null)
    const text = await f.text()
    const rows = parseCSV(text)
    const r = await fetch("/api/imports", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({rows, preview: true}) })
    setPreview({ ...(await r.json()), rows, text })
  }

  const handleImport = async () => {
    if (!preview) return
    setImporting(true)
    const r = await fetch("/api/imports", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({rows: preview.rows, preview: false}) })
    setResult(await r.json())
    setImporting(false)
    setPreview(null)
    setFile(null)
  }

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
      <div className="mb24"><h1 className="page-title">Import Products</h1><p className="page-sub">Upload a CSV to add or update products in bulk</p></div>
      {!preview && !result && (
        <div onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f)handleFile(f)}}
          style={{border:"2px dashed",borderColor:dragging?"#F0A3BC":"rgba(0,0,0,0.15)",borderRadius:16,padding:"48px 24px",textAlign:"center",cursor:"pointer",background:dragging?"#FDE8EF":"#FAFBFC",transition:"all 0.15s"}}
          onClick={()=>inputRef.current?.click()}>
          <div style={{fontSize:40,marginBottom:12}}>📄</div>
          <p className="fw600 txt-primary">Drop your CSV here or click to upload</p>
          <p className="txt-muted fs13">Required columns: sku, name, brand, unit_cost, cdu_size, rrp</p>
          <input ref={inputRef} type="file" accept=".csv" style={{display:"none"}} onChange={e=>e.target.files?.[0]&&handleFile(e.target.files[0])} />
        </div>
      )}
      {preview && (
        <div>
          <div className="card card-pad mb16">
            <h2 className="fw600 txt-primary mb8">Preview: {file?.name}</h2>
            <div className="row" style={{gap:16,marginBottom:16}}>
              <div style={{textAlign:"center"}}><p style={{fontSize:28,fontWeight:700,color:"#0EA572",margin:0}}>{preview.valid}</p><p className="txt-muted fs12">Valid rows</p></div>
              <div style={{textAlign:"center"}}><p style={{fontSize:28,fontWeight:700,color:"#E11D48",margin:0}}>{preview.invalid}</p><p className="txt-muted fs12">Invalid rows</p></div>
            </div>
            {preview.errors?.length > 0 && (
              <div style={{background:"#FFF1F4",border:"1px solid rgba(225,29,72,0.2)",borderRadius:8,padding:12,marginBottom:16}}>
                {preview.errors.map((e: string, i: number) => <p key={i} style={{fontSize:12,color:"#E11D48",margin:"2px 0"}}>{e}</p>)}
              </div>
            )}
            <div className="row" style={{gap:8}}>
              <button className="btn-ghost" style={{flex:1}} onClick={()=>{setPreview(null);setFile(null)}}>Cancel</button>
              <button className="btn-pink" style={{flex:1}} onClick={handleImport} disabled={importing||preview.valid===0}>{importing?"Importing…":"Import "+preview.valid+" products"}</button>
            </div>
          </div>
        </div>
      )}
      {result && (
        <div className="card card-pad">
          <div style={{textAlign:"center",padding:"24px 0"}}>
            <div style={{fontSize:48,marginBottom:12}}>✅</div>
            <h2 className="fw700 txt-primary">Import complete!</h2>
            <p className="txt-muted">{result.imported} products imported successfully</p>
            <button className="btn-pink" style={{marginTop:16}} onClick={()=>setResult(null)}>Import another file</button>
          </div>
        </div>
      )}
      <div className="card card-pad" style={{marginTop:24}}>
        <h3 className="fw600 txt-primary mb8">CSV Format</h3>
        <p className="txt-muted fs13 mb8">Your CSV file should have these column headers in the first row:</p>
        <code style={{display:"block",background:"#F4F5F7",padding:"10px 14px",borderRadius:8,fontSize:12,color:"#4A4A6A"}}>sku, name, brand, type, unit_cost, cdu_size, rrp, stock, description</code>
        <p className="txt-muted fs12" style={{marginTop:8}}>Example: PM-LBB-001, Labubu Series 1, POP MART, BLIND_BOX, 8.50, 6, 14.99, 100</p>
      </div>
    </div>
    </>
  )
}