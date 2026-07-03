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
  )
}
