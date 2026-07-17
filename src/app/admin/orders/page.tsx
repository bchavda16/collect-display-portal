"use client"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils"

const STATUSES = ["ALL","PLACED","CONFIRMED","PROCESSING","PICKED","PACKED","DISPATCHED","OUT_FOR_DELIVERY","DELIVERED","CANCELLED"]
const STATUS_COLORS: Record<string,{bg:string;color:string}> = {
  PLACED:{bg:"#E8F8F7",color:"#3A9E9B"}, CONFIRMED:{bg:"#E8F8F7",color:"#3A9E9B"},
  PROCESSING:{bg:"#F3EEFF",color:"#7C3AED"}, PICKED:{bg:"#F3EEFF",color:"#7C3AED"},
  PACKED:{bg:"#FEF3C7",color:"#D97706"}, DISPATCHED:{bg:"#EAFAF3",color:"#0EA572"},
  OUT_FOR_DELIVERY:{bg:"#EAFAF3",color:"#0EA572"}, DELIVERED:{bg:"#F4F5F7",color:"#8888AA"},
  CANCELLED:{bg:"#FFF1F4",color:"#E11D48"},
}

export default function AdminOrdersPage() {
  const qc = useQueryClient()
  const [status, setStatus] = useState("ALL")
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<string|null>(null)
  const [editing, setEditing] = useState<any>(null)
  const [newStatus, setNewStatus] = useState("")
  const [tracking, setTracking] = useState("")
  const [carrier, setCarrier] = useState("")
  const [note, setNote] = useState("")
  const [editingItem, setEditingItem] = useState<{id:string;unitCost:string;quantity:string}|null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string|null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders", status, page],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), limit: "20", ...(status!=="ALL"&&{status}) })
      const r = await fetch("/api/orders?"+p); return r.json()
    },
  })

  const { data: orderDetail, refetch: refetchDetail } = useQuery({
    queryKey: ["order-detail", expanded],
    queryFn: async () => {
      if (!expanded) return null
      const r = await fetch("/api/orders/"+expanded); return r.json()
    },
    enabled: !!expanded,
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...body }: any) => {
      const r = await fetch("/api/orders/"+id, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body) })
      return r.json()
    },
    onSuccess: () => { qc.invalidateQueries({queryKey:["admin-orders"]}); refetchDetail(); setEditing(null) },
  })

  const editItemMutation = useMutation({
    mutationFn: async ({ orderId, itemId, unitCostPence, quantity }: any) => {
      const r = await fetch("/api/orders/"+orderId+"/items", {
        method:"PATCH", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ itemId, unitCostPence, quantity })
      })
      return r.json()
    },
    onSuccess: () => { qc.invalidateQueries({queryKey:["admin-orders"]}); refetchDetail(); setEditingItem(null) },
  })

  const deleteItemMutation = useMutation({
    mutationFn: async ({ orderId, itemId }: any) => {
      const r = await fetch("/api/orders/"+orderId+"/items", {
        method:"DELETE", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ itemId })
      })
      return r.json()
    },
    onSuccess: (d) => {
      if (d.error) { alert(d.error); return }
      qc.invalidateQueries({queryKey:["admin-orders"]}); refetchDetail(); setDeleteConfirm(null)
    },
  })

  const orders = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  const s: Record<string,any> = {
    page: {padding:24,fontFamily:"system-ui,sans-serif"},
    title: {fontSize:22,fontWeight:700,color:"#1A1A2E",margin:"0 0 4px"},
    sub: {fontSize:13,color:"#8888AA",margin:"0 0 20px"},
    th: {background:"#F4F5F7",fontSize:10,fontWeight:600,textTransform:"uppercase" as const,letterSpacing:".06em",color:"#8888AA",padding:"10px 16px",textAlign:"left" as const,borderBottom:"1px solid rgba(0,0,0,.08)"},
    td: {padding:"12px 16px",fontSize:13,borderBottom:"1px solid rgba(0,0,0,.06)",verticalAlign:"middle" as const},
    overlay: {position:"fixed" as const,inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(2px)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:16},
    modal: {background:"white",borderRadius:16,padding:28,maxWidth:480,width:"100%",maxHeight:"90vh",overflowY:"auto" as const,boxShadow:"0 20px 60px rgba(0,0,0,.15)"},
    input: {width:"100%",padding:"10px 12px",border:"1.5px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:13,color:"#1A1A2E",outline:"none",boxSizing:"border-box" as const,background:"white"},
    select: {width:"100%",padding:"10px 12px",border:"1.5px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:13,color:"#1A1A2E",outline:"none",background:"white"},
    inputSm: {padding:"5px 8px",border:"1.5px solid #88dde1",borderRadius:6,fontSize:12,color:"#1A1A2E",outline:"none",width:80,textAlign:"center" as const},
    btnPink: {display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"9px 18px",background:"#88dde1",color:"white",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer"},
    btnGhost: {display:"inline-flex",alignItems:"center",padding:"7px 14px",background:"white",color:"#4A4A6A",border:"1px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer"},
    btnSm: {display:"inline-flex",alignItems:"center",gap:4,padding:"4px 10px",background:"white",color:"#4A4A6A",border:"1px solid rgba(0,0,0,.12)",borderRadius:6,fontSize:12,fontWeight:500,cursor:"pointer"},
    btnDanger: {display:"inline-flex",alignItems:"center",padding:"4px 10px",background:"white",color:"#E11D48",border:"1px solid rgba(225,29,72,.2)",borderRadius:6,fontSize:12,fontWeight:500,cursor:"pointer"},
  }

  const chipStyle = (active: boolean) => ({
    padding:"5px 12px",borderRadius:99,fontSize:12,fontWeight:500,
    background:active?"#88dde1":"#F4F5F7",color:active?"white":"#4A4A6A",
    border:"none",cursor:"pointer" as const
  })

  return (
    <div style={s.page}>
      <h1 style={s.title}>Orders</h1>
      <p style={s.sub}>{data?.total ?? 0} total</p>

      <div style={{display:"flex",gap:6,flexWrap:"wrap" as const,marginBottom:16}}>
        {STATUSES.map(st=>(
          <button key={st} style={chipStyle(status===st)} onClick={()=>{setStatus(st);setPage(1);setExpanded(null)}}>
            {st==="ALL"?"All":st.replace(/_/g," ")}
          </button>
        ))}
      </div>

      <div style={{background:"white",border:"1px solid rgba(0,0,0,.09)",borderRadius:12,boxShadow:"0 1px 4px rgba(0,0,0,.05)",overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr>
              {["","Order","Retailer","Date","PO Ref","Items","Value","Status","Actions"].map(h=>(
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} style={{...s.td,textAlign:"center",color:"#8888AA",padding:32}}>Loading…</td></tr>
            ) : orders.length===0 ? (
              <tr><td colSpan={9} style={{...s.td,textAlign:"center",color:"#8888AA",padding:48}}>No orders found</td></tr>
            ) : orders.map((o: any) => {
              const isExpanded = expanded === o.id
              const sc = STATUS_COLORS[o.status] ?? {bg:"#F4F5F7",color:"#8888AA"}
              return (
                <>
                <tr key={o.id} style={{background:isExpanded?"rgba(136,221,225,.03)":"white"}}>
                  <td style={{...s.td,width:40,padding:"12px 8px 12px 16px"}}>
                    <button onClick={()=>setExpanded(isExpanded?null:o.id)}
                      style={{background:"none",border:"1px solid rgba(0,0,0,.1)",borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:11,color:"#8888AA",transition:"transform .2s",transform:isExpanded?"rotate(90deg)":"rotate(0)"}}>
                      ▶
                    </button>
                  </td>
                  <td style={s.td}><span style={{fontWeight:600,color:"#1a9da3"}}>{o.orderNumber}</span></td>
                  <td style={s.td}>
                    <div style={{fontWeight:500,color:"#1A1A2E"}}>{o.retailer?.businessName}</div>
                    <div style={{fontSize:11,color:"#8888AA"}}>{o.retailer?.user?.email ?? ""}</div>
                  </td>
                  <td style={{...s.td,color:"#8888AA"}}>{formatDate(o.createdAt)}</td>
                  <td style={{...s.td,fontFamily:"monospace",fontSize:12,color:"#8888AA"}}>{o.poReference ?? "—"}</td>
                  <td style={{...s.td,color:"#4A4A6A"}}>{o._count?.items ?? o.items?.length ?? 0}</td>
                  <td style={{...s.td,fontWeight:600}}>{formatCurrency(o.totalPence)}</td>
                  <td style={s.td}>
                    <span style={{display:"inline-flex",padding:"3px 10px",borderRadius:99,fontSize:11,fontWeight:600,background:sc.bg,color:sc.color}}>
                      {o.status.replace(/_/g," ")}
                    </span>
                  </td>
                  <td style={s.td}>
                    <button style={{...s.btnGhost,padding:"5px 10px",fontSize:12}} onClick={()=>{setEditing(o);setNewStatus(o.status);setTracking(o.trackingNumber??"");setCarrier(o.carrierName??"");setNote("")}}>
                      Update
                    </button>
                  </td>
                </tr>

                {isExpanded && (
                  <tr key={o.id+"-exp"}>
                    <td colSpan={9} style={{padding:0,borderBottom:"1px solid rgba(0,0,0,.06)"}}>
                      <div style={{background:"#FAFBFC",borderTop:"1px solid rgba(136,221,225,.15)",padding:"18px 24px"}}>
                        {!orderDetail ? (
                          <p style={{color:"#8888AA",fontSize:13,margin:0}}>Loading order details…</p>
                        ) : (
                          <div style={{display:"grid",gridTemplateColumns:"1fr 280px",gap:24}}>
                            {/* LINE ITEMS */}
                            <div>
                              <p style={{fontSize:11,fontWeight:700,textTransform:"uppercase" as const,letterSpacing:".07em",color:"#8888AA",margin:"0 0 10px"}}>
                                Order Lines
                              </p>
                              <div style={{background:"white",border:"1px solid rgba(0,0,0,.08)",borderRadius:10,overflow:"hidden"}}>
                                {(orderDetail.items ?? []).map((item: any, i: number) => (
                                  <div key={item.id} style={{borderBottom:i<(orderDetail.items.length-1)?"1px solid rgba(0,0,0,.06)":"none",padding:"12px 14px"}}>
                                    {editingItem?.id === item.id ? (
                                      /* EDIT MODE */
                                      <div>
                                        <div style={{fontSize:13,fontWeight:600,color:"#1A1A2E",marginBottom:10}}>{item.productName}</div>
                                        <div style={{display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap" as const}}>
                                          <div>
                                            <div style={{fontSize:10,color:"#8888AA",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:".05em",fontWeight:600}}>Unit Cost (£)</div>
                                            <input style={{...s.inputSm,width:90}} type="number" step="0.01"
                                              value={editingItem.unitCost}
                                              onChange={e=>setEditingItem(ei=>ei?{...ei,unitCost:e.target.value}:ei)} />
                                          </div>
                                          <div>
                                            <div style={{fontSize:10,color:"#8888AA",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:".05em",fontWeight:600}}>Quantity</div>
                                            <input style={{...s.inputSm,width:70}} type="number" min="1"
                                              value={editingItem.quantity}
                                              onChange={e=>setEditingItem(ei=>ei?{...ei,quantity:e.target.value}:ei)} />
                                          </div>
                                          <div style={{fontSize:12,color:"#8888AA",paddingBottom:2}}>
                                            New total: <strong style={{color:"#1A1A2E"}}>£{(parseFloat(editingItem.unitCost||"0")*parseInt(editingItem.quantity||"0")/100).toFixed(2)}</strong>
                                          </div>
                                        </div>
                                        <div style={{display:"flex",gap:8,marginTop:10}}>
                                          <button style={s.btnPink} onClick={()=>editItemMutation.mutate({
                                            orderId:o.id, itemId:item.id,
                                            unitCostPence:Math.round(parseFloat(editingItem.unitCost)*100),
                                            quantity:parseInt(editingItem.quantity)
                                          })} disabled={editItemMutation.isPending}>
                                            {editItemMutation.isPending?"Saving…":"Save changes"}
                                          </button>
                                          <button style={s.btnGhost} onClick={()=>setEditingItem(null)}>Cancel</button>
                                        </div>
                                      </div>
                                    ) : (
                                      /* VIEW MODE */
                                      <div style={{display:"flex",alignItems:"center",gap:12}}>
                                        <div style={{flex:1,minWidth:0}}>
                                          <div style={{fontSize:13,fontWeight:500,color:"#1A1A2E",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{item.productName}</div>
                                          <div style={{fontSize:11,color:"#8888AA",fontFamily:"monospace"}}>{item.sku} · ×{item.quantity} units</div>
                                        </div>
                                        <div style={{textAlign:"right" as const,flexShrink:0}}>
                                          <div style={{fontSize:13,fontWeight:600,color:"#1A1A2E"}}>{formatCurrency(item.lineTotalPence)}</div>
                                          <div style={{fontSize:11,color:"#8888AA"}}>{formatCurrency(item.unitCostPence)}/unit</div>
                                        </div>
                                        <div style={{display:"flex",gap:6,flexShrink:0}}>
                                          <button style={s.btnSm} onClick={()=>setEditingItem({id:item.id,unitCost:(item.unitCostPence/100).toFixed(2),quantity:String(item.quantity)})}>
                                            ✏️ Edit
                                          </button>
                                          {deleteConfirm===item.id ? (
                                            <div style={{display:"flex",gap:4,alignItems:"center"}}>
                                              <button style={{...s.btnDanger,padding:"4px 8px"}} onClick={()=>deleteItemMutation.mutate({orderId:o.id,itemId:item.id})}>Confirm</button>
                                              <button style={s.btnSm} onClick={()=>setDeleteConfirm(null)}>×</button>
                                            </div>
                                          ) : (
                                            <button style={s.btnDanger} onClick={()=>setDeleteConfirm(item.id)}>🗑</button>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {/* ORDER TOTALS */}
                                <div style={{padding:"12px 14px",borderTop:"1px solid rgba(0,0,0,.08)",background:"#FAFBFC"}}>
                                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#8888AA",marginBottom:3}}>
                                    <span>Subtotal (ex. VAT)</span><span>{formatCurrency(orderDetail.subtotalPence)}</span>
                                  </div>
                                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#8888AA",marginBottom:5}}>
                                    <span>VAT (20%)</span><span>{formatCurrency(orderDetail.vatPence)}</span>
                                  </div>
                                  <div style={{display:"flex",justifyContent:"space-between",fontSize:14,fontWeight:700,color:"#1a9da3",paddingTop:6,borderTop:"1px solid rgba(0,0,0,.06)"}}>
                                    <span>Total</span><span>{formatCurrency(orderDetail.totalPence)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* ORDER INFO */}
                            <div>
                              <p style={{fontSize:11,fontWeight:700,textTransform:"uppercase" as const,letterSpacing:".07em",color:"#8888AA",margin:"0 0 10px"}}>Order Info</p>
                              <div style={{background:"white",border:"1px solid rgba(0,0,0,.08)",borderRadius:10,padding:"12px 14px",marginBottom:12}}>
                                {[
                                  ["Retailer", orderDetail.retailer?.businessName],
                                  ["Placed", formatDateTime(orderDetail.createdAt)],
                                  ["PO Reference", orderDetail.poReference ?? "—"],
                                  ["Carrier", orderDetail.carrierName ?? "—"],
                                  ["Tracking", orderDetail.trackingNumber ?? "—"],
                                ].map(([l,v]) => (
                                  <div key={l} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"6px 0",borderBottom:"1px solid rgba(0,0,0,.05)",fontSize:13}}>
                                    <span style={{color:"#8888AA",flexShrink:0}}>{l}</span>
                                    <span style={{fontWeight:500,color:"#1A1A2E",textAlign:"right" as const,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{v}</span>
                                  </div>
                                ))}
                              </div>
                              {orderDetail.retailer?.addresses?.[0] && (
                                <div style={{background:"white",border:"1px solid rgba(0,0,0,.08)",borderRadius:10,padding:"12px 14px",fontSize:13,color:"#4A4A6A",lineHeight:1.8}}>
                                  {orderDetail.retailer.addresses[0].line1}<br/>
                                  {orderDetail.retailer.addresses[0].city}<br/>
                                  <span style={{fontFamily:"monospace",fontSize:12}}>{orderDetail.retailer.addresses[0].postcode}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                </>
              )
            })}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderTop:"1px solid rgba(0,0,0,.08)"}}>
            <span style={{fontSize:13,color:"#8888AA"}}>Page {page} of {totalPages}</span>
            <div style={{display:"flex",gap:8}}>
              <button style={{...s.btnGhost,padding:"5px 10px",fontSize:12}} onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>← Prev</button>
              <button style={{...s.btnGhost,padding:"5px 10px",fontSize:12}} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* UPDATE STATUS MODAL */}
      {editing && (
        <div style={s.overlay} onClick={e=>e.target===e.currentTarget&&setEditing(null)}>
          <div style={s.modal}>
            <div style={{fontSize:17,fontWeight:700,color:"#1A1A2E",margin:"0 0 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              Update {editing.orderNumber}
              <button onClick={()=>setEditing(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:"#8888AA",padding:0}}>×</button>
            </div>
            <div style={{marginBottom:14}}><label style={{display:"block",fontSize:11,fontWeight:600,color:"#4A4A6A",marginBottom:5,textTransform:"uppercase" as const}}>Status</label><select style={s.select} value={newStatus} onChange={e=>setNewStatus(e.target.value)}>{STATUSES.filter(s=>s!=="ALL").map(s=><option key={s} value={s}>{s.replace(/_/g," ")}</option>)}</select></div>
            <div style={{marginBottom:14}}><label style={{display:"block",fontSize:11,fontWeight:600,color:"#4A4A6A",marginBottom:5,textTransform:"uppercase" as const}}>Carrier</label><input style={s.input} value={carrier} onChange={e=>setCarrier(e.target.value)} placeholder="e.g. Royal Mail, DPD, Evri" /></div>
            <div style={{marginBottom:14}}><label style={{display:"block",fontSize:11,fontWeight:600,color:"#4A4A6A",marginBottom:5,textTransform:"uppercase" as const}}>Tracking Number</label><input style={s.input} value={tracking} onChange={e=>setTracking(e.target.value)} placeholder="e.g. RM123456789GB" /></div>
            <div style={{marginBottom:14}}><label style={{display:"block",fontSize:11,fontWeight:600,color:"#4A4A6A",marginBottom:5,textTransform:"uppercase" as const}}>Note (optional)</label><input style={s.input} value={note} onChange={e=>setNote(e.target.value)} placeholder="Internal note…" /></div>
            <div style={{display:"flex",gap:10,marginTop:20}}>
              <button style={{...s.btnGhost,flex:1}} onClick={()=>setEditing(null)}>Cancel</button>
              <button style={{...s.btnPink,flex:1}} onClick={()=>updateMutation.mutate({id:editing.id,status:newStatus,trackingNumber:tracking||undefined,carrierName:carrier||undefined,note:note||undefined})} disabled={updateMutation.isPending}>{updateMutation.isPending?"Saving…":"Save Changes"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
