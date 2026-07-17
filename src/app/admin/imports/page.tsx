"use client"
import { useState, useRef } from "react"
import * as XLSX from "xlsx"

const REQUIRED_COLS = ["sku", "name", "brand", "unit_cost", "cdu_size", "rrp"]
const OPTIONAL_COLS = ["type", "stock", "description"]
const ALL_COLS = [...REQUIRED_COLS, ...OPTIONAL_COLS]

const EXAMPLE_DATA = [
  { sku:"PM-LBB-001", name:"Labubu The Monsters Series 1", brand:"POP MART", unit_cost:8.50, cdu_size:6, rrp:14.99, type:"BLIND_BOX", stock:144, description:"Original Labubu series" },
  { sku:"SA-FRT-001", name:"Sonny Angel Fruit Series", brand:"Sonny Angel", unit_cost:7.00, cdu_size:12, rrp:12.99, type:"BLIND_BOX", stock:120, description:"" },
  { sku:"SMI-DSK-001", name:"SMISKI Desk Series Vol.3", brand:"SMISKI", unit_cost:6.00, cdu_size:12, rrp:9.99, type:"BLIND_BOX", stock:84, description:"" },
]

interface ParsedRow {
  _rowNum: number
  _valid: boolean
  _errors: string[]
  [key: string]: any
}

function validateRow(row: any, rowNum: number): ParsedRow {
  const errors: string[] = []
  if (!row.sku?.toString().trim()) errors.push("SKU required")
  if (!row.name?.toString().trim()) errors.push("Name required")
  if (!row.brand?.toString().trim()) errors.push("Brand required")
  if (!row.unit_cost || isNaN(parseFloat(row.unit_cost))) errors.push("Unit cost must be a number")
  if (!row.cdu_size || isNaN(parseInt(row.cdu_size))) errors.push("CDU size must be a number")
  if (!row.rrp || isNaN(parseFloat(row.rrp))) errors.push("RRP must be a number")
  return { ...row, _rowNum: rowNum, _valid: errors.length === 0, _errors: errors }
}

function downloadTemplate() {
  const ws = XLSX.utils.json_to_sheet(EXAMPLE_DATA, { header: ALL_COLS })
  ws["!cols"] = ALL_COLS.map(c => ({ wch: c === "name" || c === "description" ? 35 : 14 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Products")
  XLSX.writeFile(wb, "collect-display-product-import-template.xlsx")
}

export default function AdminImportsPage() {
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState<string|null>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{imported:number;errors:string[]}|null>(null)
  const [step, setStep] = useState<"upload"|"preview"|"done">("upload")
  const inputRef = useRef<HTMLInputElement>(null)

  const parseFile = (file: File) => {
    setFileName(file.name)
    setResult(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: "array" })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rawRows = XLSX.utils.sheet_to_json(ws, { defval: "" })

        // Normalise headers (lowercase + underscores)
        const normalised = rawRows.map((row: any, i) => {
          const norm: any = {}
          Object.keys(row).forEach(k => {
            norm[k.toLowerCase().trim().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")] = row[k]
          })
          return norm
        })

        const parsed = normalised.map((r, i) => validateRow(r, i + 2))
        setRows(parsed)
        setStep("preview")
      } catch (err) {
        alert("Could not read file. Make sure it is a valid .xlsx or .csv file.")
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleImport = async () => {
    const validRows = rows.filter(r => r._valid)
    setImporting(true)
    try {
      const r = await fetch("/api/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validRows.map(({ _rowNum, _valid, _errors, ...r }) => r), preview: false }),
      })
      const d = await r.json()
      setResult({ imported: d.imported, errors: d.errors ?? [] })
      setStep("done")
    } catch {
      alert("Import failed. Please try again.")
    } finally {
      setImporting(false)
    }
  }

  const reset = () => { setStep("upload"); setRows([]); setFileName(null); setResult(null) }

  const valid = rows.filter(r => r._valid)
  const invalid = rows.filter(r => !r._valid)

  const s: Record<string,any> = {
    page: {padding:24,fontFamily:"system-ui,sans-serif",maxWidth:1000},
    title: {fontSize:22,fontWeight:700,color:"#1A1A2E",margin:"0 0 4px"},
    sub: {fontSize:13,color:"#8888AA",margin:"0 0 24px"},
    card: {background:"white",border:"1px solid rgba(0,0,0,.09)",borderRadius:12,boxShadow:"0 1px 4px rgba(0,0,0,.05)"},
    btnPink: {display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,padding:"10px 20px",background:"#88dde1",color:"white",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer"},
    btnGhost: {display:"inline-flex",alignItems:"center",gap:6,padding:"9px 18px",background:"white",color:"#4A4A6A",border:"1px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer"},
    btnTeal: {display:"inline-flex",alignItems:"center",gap:6,padding:"10px 20px",background:"#5CC8C5",color:"white",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer"},
    th: {background:"#F4F5F7",fontSize:10,fontWeight:600,textTransform:"uppercase" as const,letterSpacing:".06em",color:"#8888AA",padding:"9px 12px",textAlign:"left" as const,borderBottom:"1px solid rgba(0,0,0,.08)",whiteSpace:"nowrap" as const},
    td: {padding:"9px 12px",fontSize:12,borderBottom:"1px solid rgba(0,0,0,.05)",verticalAlign:"top" as const},
    label: {fontSize:10,fontWeight:700,textTransform:"uppercase" as const,letterSpacing:".08em",color:"#8888AA",margin:"0 0 6px"},
  }

  return (
    <div style={s.page}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
        <div>
          <h1 style={s.title}>Bulk Import Products</h1>
          <p style={{...s.sub,margin:0}}>Upload an Excel (.xlsx) or CSV file to add or update products in bulk</p>
        </div>
        <button style={s.btnGhost} onClick={downloadTemplate}>
          ⬇ Download Template
        </button>
      </div>

      {/* COLUMN GUIDE */}
      <div style={{...s.card,padding:"16px 20px",marginBottom:20}}>
        <p style={s.label}>Required columns</p>
        <div style={{display:"flex",gap:8,flexWrap:"wrap" as const,marginBottom:12}}>
          {REQUIRED_COLS.map(c=>(
            <span key={c} style={{background:"#e0f7f8",color:"#1a9da3",border:"1px solid rgba(136,221,225,.3)",borderRadius:6,padding:"3px 10px",fontSize:12,fontWeight:600,fontFamily:"monospace"}}>{c}</span>
          ))}
        </div>
        <p style={{...s.label,marginTop:4}}>Optional columns</p>
        <div style={{display:"flex",gap:8,flexWrap:"wrap" as const,marginBottom:8}}>
          {OPTIONAL_COLS.map(c=>(
            <span key={c} style={{background:"#F4F5F7",color:"#4A4A6A",border:"1px solid rgba(0,0,0,.1)",borderRadius:6,padding:"3px 10px",fontSize:12,fontWeight:600,fontFamily:"monospace"}}>{c}</span>
          ))}
        </div>
        <p style={{fontSize:12,color:"#8888AA",margin:"8px 0 0"}}>
          Column headers must match exactly (case-insensitive). <strong style={{color:"#1A1A2E"}}>unit_cost</strong> and <strong style={{color:"#1A1A2E"}}>rrp</strong> in £ (e.g. 8.50). If a SKU already exists, the product will be updated. Download the template to get started.
        </p>
      </div>

      {/* STEP: UPLOAD */}
      {step === "upload" && (
        <div
          style={{
            border:`2px dashed ${dragging?"#88dde1":"rgba(0,0,0,.15)"}`,
            borderRadius:16,padding:"56px 24px",textAlign:"center",
            background:dragging?"#e0f7f8":"#FAFBFC",
            cursor:"pointer",transition:"all .15s"
          }}
          onClick={()=>inputRef.current?.click()}
          onDragOver={e=>{e.preventDefault();setDragging(true)}}
          onDragLeave={()=>setDragging(false)}
          onDrop={e=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f)parseFile(f)}}
        >
          <div style={{fontSize:48,marginBottom:14}}>📊</div>
          <p style={{fontSize:16,fontWeight:600,color:"#1A1A2E",margin:"0 0 6px"}}>Drop your spreadsheet here</p>
          <p style={{fontSize:13,color:"#8888AA",margin:"0 0 20px"}}>or click to browse · Excel (.xlsx) or CSV</p>
          <button style={s.btnPink} onClick={e=>{e.stopPropagation();inputRef.current?.click()}}>Choose file</button>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}}
            onChange={e=>{const f=e.target.files?.[0];if(f)parseFile(f);e.target.value=""}} />
        </div>
      )}

      {/* STEP: PREVIEW */}
      {step === "preview" && rows.length > 0 && (
        <div>
          {/* Summary bar */}
          <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 18px",background:"white",border:"1px solid rgba(0,0,0,.09)",borderRadius:12,marginBottom:16,flexWrap:"wrap" as const}}>
            <div style={{fontSize:13,color:"#4A4A6A"}}>
              <strong style={{color:"#1A1A2E"}}>{fileName}</strong>
            </div>
            <div style={{display:"flex",gap:8,marginLeft:"auto",alignItems:"center"}}>
              <span style={{background:"#EAFAF3",color:"#0EA572",border:"1px solid rgba(14,165,114,.2)",borderRadius:6,padding:"4px 10px",fontSize:12,fontWeight:600}}>✓ {valid.length} valid</span>
              {invalid.length > 0 && <span style={{background:"#FFF1F4",color:"#E11D48",border:"1px solid rgba(225,29,72,.2)",borderRadius:6,padding:"4px 10px",fontSize:12,fontWeight:600}}>✗ {invalid.length} errors</span>}
              <button style={s.btnGhost} onClick={reset}>Change file</button>
              <button style={{...s.btnPink,opacity:valid.length===0?.5:1}} disabled={valid.length===0||importing} onClick={handleImport}>
                {importing ? "Importing…" : `Import ${valid.length} product${valid.length!==1?"s":""}`}
              </button>
            </div>
          </div>

          {/* Error list */}
          {invalid.length > 0 && (
            <div style={{background:"#FFF8F8",border:"1px solid rgba(225,29,72,.15)",borderRadius:10,padding:"12px 16px",marginBottom:14}}>
              <p style={{fontSize:12,fontWeight:700,color:"#E11D48",margin:"0 0 8px",textTransform:"uppercase" as const,letterSpacing:".06em"}}>Rows with errors — these will be skipped</p>
              {invalid.map(r=>(
                <div key={r._rowNum} style={{fontSize:12,color:"#C02030",marginBottom:3}}>
                  Row {r._rowNum}: {r.name||r.sku||"(empty)"} — {r._errors.join(", ")}
                </div>
              ))}
            </div>
          )}

          {/* Preview table */}
          <div style={{...s.card,overflow:"hidden"}}>
            <div style={{overflowX:"auto" as const}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
                <thead>
                  <tr>
                    <th style={s.th}>#</th>
                    <th style={s.th}>SKU</th>
                    <th style={s.th}>Name</th>
                    <th style={s.th}>Brand</th>
                    <th style={s.th}>Type</th>
                    <th style={s.th}>Unit Cost</th>
                    <th style={s.th}>CDU</th>
                    <th style={s.th}>RRP</th>
                    <th style={s.th}>Stock</th>
                    <th style={s.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row._rowNum} style={{background:row._valid?"white":"#FFF8F8"}}>
                      <td style={{...s.td,color:"#BBBBCC"}}>{row._rowNum}</td>
                      <td style={{...s.td,fontFamily:"monospace",fontSize:11,color:"#8888AA"}}>{row.sku||<span style={{color:"#E11D48"}}>missing</span>}</td>
                      <td style={{...s.td,fontWeight:500,color:"#1A1A2E",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{row.name||"—"}</td>
                      <td style={{...s.td,color:"#4A4A6A"}}>{row.brand||"—"}</td>
                      <td style={{...s.td,color:"#4A4A6A",fontSize:11}}>{(row.type||"BLIND_BOX").replace(/_/g," ")}</td>
                      <td style={{...s.td,fontWeight:600,color:"#1A1A2E"}}>£{parseFloat(row.unit_cost||0).toFixed(2)}</td>
                      <td style={{...s.td,color:"#4A4A6A"}}>×{row.cdu_size||"—"}</td>
                      <td style={{...s.td,color:"#8888AA"}}>£{parseFloat(row.rrp||0).toFixed(2)}</td>
                      <td style={{...s.td,color:"#4A4A6A"}}>{row.stock||0}</td>
                      <td style={s.td}>
                        {row._valid
                          ? <span style={{background:"#EAFAF3",color:"#0EA572",borderRadius:4,padding:"2px 7px",fontSize:11,fontWeight:600}}>Ready</span>
                          : <span style={{background:"#FFF1F4",color:"#E11D48",borderRadius:4,padding:"2px 7px",fontSize:11,fontWeight:600}} title={row._errors.join(", ")}>Error</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STEP: DONE */}
      {step === "done" && result && (
        <div style={{...s.card,padding:"40px 24px",textAlign:"center"}}>
          <div style={{fontSize:52,marginBottom:16}}>✅</div>
          <h2 style={{fontSize:20,fontWeight:700,color:"#1A1A2E",margin:"0 0 8px"}}>Import complete!</h2>
          <p style={{fontSize:14,color:"#8888AA",margin:"0 0 24px"}}>{result.imported} product{result.imported!==1?"s":""} imported successfully</p>
          {result.errors.length > 0 && (
            <div style={{background:"#FFF8F8",border:"1px solid rgba(225,29,72,.15)",borderRadius:10,padding:"12px 16px",marginBottom:20,textAlign:"left" as const}}>
              <p style={{fontSize:12,fontWeight:700,color:"#E11D48",margin:"0 0 6px"}}>Skipped rows</p>
              {result.errors.map((e,i)=><div key={i} style={{fontSize:12,color:"#C02030",marginBottom:2}}>{e}</div>)}
            </div>
          )}
          <div style={{display:"flex",gap:10,justifyContent:"center"}}>
            <button style={s.btnGhost} onClick={reset}>Import another file</button>
            <button style={s.btnPink} onClick={()=>window.location.href="/admin/products"}>View products →</button>
          </div>
        </div>
      )}

      {/* TIPS */}
      {step === "upload" && (
        <div style={{marginTop:24,padding:"16px 20px",background:"#F9FAFB",borderRadius:10,border:"1px solid rgba(0,0,0,.07)"}}>
          <p style={{...s.label,margin:"0 0 10px"}}>Tips for a smooth import</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 24px"}}>
            {[
              ["Use the template", "Download it above — headers are pre-formatted correctly"],
              ["unit_cost & rrp in pounds", "Enter 8.50 not 850 — the system converts to pence"],
              ["Existing SKUs update", "If a SKU already exists, name, price and stock will be updated"],
              ["type values", "BLIND_BOX · FIGURE · PLUSH · ACCESSORY · BUNDLE"],
              ["Leave stock blank for 0", "New products default to 0 stock if column is empty"],
              ["Brand auto-created", "If the brand doesn't exist it will be created automatically"],
            ].map(([title,desc])=>(
              <div key={title} style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                <span style={{color:"#88dde1",fontSize:14,flexShrink:0,marginTop:1}}>→</span>
                <div><span style={{fontSize:12,fontWeight:600,color:"#1A1A2E"}}>{title}:</span><span style={{fontSize:12,color:"#8888AA"}}> {desc}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
