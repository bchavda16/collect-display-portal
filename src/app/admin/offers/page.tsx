"use client"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

const fmt = (p: number) => new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(p/100)
const STATUS: Record<string,{bg:string;color:string;label:string}> = {
  PENDING:   {bg:"#FEF3C7",color:"#D97706",label:"Pending"},
  ACCEPTED:  {bg:"#EAFAF3",color:"#0EA572",label:"Accepted"},
  DECLINED:  {bg:"#FFF1F4",color:"#E11D48",label:"Declined"},
  COUNTERED: {bg:"#F3EEFF",color:"#7C3AED",label:"Countered"},
  EXPIRED:   {bg:"#F4F5F7",color:"#8888AA",label:"Expired"},
  COMPLETED: {bg:"#E8F8F7",color:"#3A9E9B",label:"Completed"},
}

export default function AdminOffersPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState("PENDING")
  const [acting, setActing] = useState<{offer:any;mode:"accept"|"decline"|"counter"}|null>(null)
  const [counterPrice, setCounterPrice] = useState("")
  const [adminNote, setAdminNote] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["admin-offers", filter],
    queryFn: async () => {
      const p = new URLSearchParams({...(filter!=="ALL"&&{status:filter})})
      const r = await fetch("/api/offers?"+p); return r.json()
    },
  })

  const actionMutation = useMutation({
    mutationFn: async ({id,action,counterPricePence,adminNote}: any) => {
      const r = await fetch("/api/offers/"+id, {method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,counterPricePence,adminNote})})
      return r.json()
    },
    onSuccess: () => { qc.invalidateQueries({queryKey:["admin-offers"]}); setActing(null); setCounterPrice(""); setAdminNote("") },
  })

  const offers = data?.data ?? []
  const pendingCount = data?.data?.filter((o:any)=>o.status==="PENDING").length ?? 0

  const S: any = {
    wrap: {padding:24,fontFamily:"system-ui,sans-serif"},
    card: {background:"white",border:"1px solid rgba(0,0,0,.09)",borderRadius:14,padding:18,marginBottom:10,boxShadow:"0 1px 4px rgba(0,0,0,.04)"},
    chip: (a:boolean) => ({padding:"5px 14px",borderRadius:99,fontSize:12,fontWeight:500,background:a?"#F0A3BC":"#F4F5F7",color:a?"white":"#4A4A6A",border:"none",cursor:"pointer"}),
    badge: (s:string) => ({display:"inline-flex",padding:"3px 10px",borderRadius:99,fontSize:11,fontWeight:600,background:STATUS[s]?.bg??"#F4F5F7",color:STATUS[s]?.color??"#8888AA"}),
    overlay: {position:"fixed" as const,inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(2px)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:16},
    modal: {background:"white",borderRadius:16,padding:28,maxWidth:440,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,.15)"},
    inp: {width:"100%",padding:"10px 12px",border:"1.5px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:13,color:"#1A1A2E",outline:"none",boxSizing:"border-box" as const,background:"white",marginTop:6},
    lbl: {fontSize:11,fontWeight:600,color:"#4A4A6A",textTransform:"uppercase" as const,letterSpacing:".05em"},
    btnPink: {padding:"9px 18px",background:"#F0A3BC",color:"white",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer"},
    btnGhost: {padding:"9px 16px",background:"white",color:"#4A4A6A",border:"1px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer"},
    btnGreen: {padding:"7px 14px",background:"#0EA572",color:"white",border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer"},
    btnRed: {padding:"7px 12px",background:"white",color:"#E11D48",border:"1px solid rgba(225,29,72,.2)",borderRadius:8,fontSize:12,fontWeight:500,cursor:"pointer"},
    btnPurple: {padding:"7px 12px",background:"white",color:"#7C3AED",border:"1px solid rgba(124,58,237,.2)",borderRadius:8,fontSize:12,fontWeight:500,cursor:"pointer"},
  }

  return (
    <div style={S.wrap}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:700,color:"#1A1A2E",margin:"0 0 4px"}}>Offers</h1>
          <p style={{fontSize:13,color:"#8888AA",margin:0}}>{offers.length} {filter==="ALL"?"total":filter.toLowerCase()} offers</p>
        </div>
        {pendingCount > 0 && filter !== "PENDING" && (
          <div style={{background:"#FEF3C7",border:"1px solid rgba(217,119,6,.2)",borderRadius:8,padding:"8px 14px",fontSize:13,color:"#D97706",fontWeight:600,cursor:"pointer"}} onClick={()=>setFilter("PENDING")}>
            ⏳ {pendingCount} awaiting response
          </div>
        )}
      </div>

      <div style={{display:"flex",gap:6,flexWrap:"wrap" as const,marginBottom:20}}>
        {["ALL","PENDING","COUNTERED","ACCEPTED","DECLINED"].map(f=>(
          <button key={f} style={S.chip(filter===f)} onClick={()=>setFilter(f)}>
            {f==="ALL"?"All":STATUS[f]?.label??f}
            {f==="PENDING"&&pendingCount>0&&<span style={{background:"#D97706",color:"white",borderRadius:99,padding:"1px 6px",fontSize:10,fontWeight:700,marginLeft:6}}>{pendingCount}</span>}
          </button>
        ))}
      </div>

      {isLoading ? <p style={{color:"#8888AA",fontSize:13}}>Loading…</p>
      : offers.length===0 ? (
        <div style={{...S.card,textAlign:"center",padding:"48px 24px"}}>
          <div style={{fontSize:40,marginBottom:12}}>💬</div>
          <p style={{fontWeight:600,color:"#1A1A2E",margin:"0 0 6px"}}>No {filter==="ALL"?"":filter.toLowerCase()} offers</p>
          <p style={{fontSize:13,color:"#8888AA",margin:0}}>Offers submitted by retailers appear here</p>
        </div>
      ) : offers.map((offer: any) => {
        const savePct = Math.round(((offer.product?.unitCostPence-offer.offeredPricePence)/offer.product?.unitCostPence)*100)
        const canAct = offer.status==="PENDING"||offer.status==="COUNTERED"
        return (
          <div key={offer.id} style={{...S.card,borderLeft:offer.status==="PENDING"?"3px solid #D97706":offer.status==="COUNTERED"?"3px solid #7C3AED":"3px solid rgba(0,0,0,.08)"}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
              <div style={{width:80,height:50,borderRadius:8,background:"#F4F5F7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,overflow:"hidden"}}>
                {offer.product?.images?.[0]?.url ? <img src={offer.product.images[0].url} style={{width:"100%",height:"100%",objectFit:"cover"}} /> : "🎁"}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,marginBottom:8}}>
                  <div>
                    <div style={{fontWeight:600,color:"#1A1A2E",fontSize:14}}>{offer.product?.name}</div>
                    <div style={{fontSize:12,color:"#8888AA",marginTop:2}}>{offer.retailer?.businessName} · {offer.retailer?.user?.email}</div>
                  </div>
                  <span style={S.badge(offer.status)}>{STATUS[offer.status]?.label}</span>
                </div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap" as const,marginBottom:10}}>
                  {[
                    ["Listed",fmt(offer.product?.unitCostPence),"#8888AA"],
                    ["Their offer",fmt(offer.offeredPricePence),"#C4638A"],
                    ["Discount",`-${savePct}%`,savePct>20?"#E11D48":"#D97706"],
                    ["Qty",`${offer.quantity} units`,"#1A1A2E"],
                    ["Offer value",fmt(offer.offeredPricePence*offer.quantity),"#1A1A2E"],
                    ...(offer.counterPricePence?[["Your counter",fmt(offer.counterPricePence),"#7C3AED"]]:[] as any),
                  ].map(([l,v,c]: any)=>(
                    <div key={l} style={{textAlign:"center" as const,padding:"7px 12px",background:"#F9FAFB",borderRadius:8,border:"1px solid rgba(0,0,0,.07)"}}>
                      <div style={{fontSize:10,color:"#8888AA",marginBottom:2}}>{l}</div>
                      <div style={{fontSize:13,fontWeight:600,color:c}}>{v}</div>
                    </div>
                  ))}
                </div>
                {offer.note && <div style={{padding:"8px 12px",background:"#F9FAFB",borderRadius:8,fontSize:12,color:"#4A4A6A",marginBottom:8}}>"{offer.note}"</div>}
                {offer.adminNote && <div style={{padding:"8px 12px",background:"#F3EEFF",borderRadius:8,fontSize:12,color:"#7C3AED",marginBottom:8}}>Your note: {offer.adminNote}</div>}
                {canAct && (
                  <div style={{display:"flex",gap:8,flexWrap:"wrap" as const}}>
                    <button style={S.btnGreen} onClick={()=>setActing({offer,mode:"accept"})}>✓ Accept</button>
                    <button style={S.btnPurple} onClick={()=>{setActing({offer,mode:"counter"});setCounterPrice(((offer.product?.unitCostPence??0)*0.9/100).toFixed(2))}}>↔ Counter</button>
                    <button style={S.btnRed} onClick={()=>setActing({offer,mode:"decline"})}>✗ Decline</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {acting && (
        <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setActing(null)}>
          <div style={S.modal}>
            <div style={{fontSize:17,fontWeight:700,color:"#1A1A2E",margin:"0 0 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              {acting.mode==="accept"?"Accept Offer":acting.mode==="counter"?"Counter Offer":"Decline Offer"}
              <button onClick={()=>setActing(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:"#8888AA",padding:0}}>×</button>
            </div>
            <div style={{background:"#F9FAFB",borderRadius:10,padding:"12px 14px",marginBottom:16,fontSize:13}}>
              <div style={{fontWeight:600,color:"#1A1A2E",marginBottom:4}}>{acting.offer.product?.name}</div>
              <div style={{color:"#8888AA"}}>{acting.offer.retailer?.businessName} offered {fmt(acting.offer.offeredPricePence)}/unit for {acting.offer.quantity} units</div>
            </div>
            {acting.mode==="accept" && <div style={{background:"#EAFAF3",border:"1px solid rgba(14,165,114,.2)",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#0EA572"}}>✓ Items will be added to their basket at the agreed price</div>}
            {acting.mode==="counter" && (
              <div style={{marginBottom:16}}>
                <label style={S.lbl}>Counter price (£/unit)</label>
                <input style={S.inp} type="number" step="0.01" value={counterPrice} onChange={e=>setCounterPrice(e.target.value)} autoFocus />
                {counterPrice && <div style={{fontSize:12,color:"#7C3AED",marginTop:6}}>Total: {fmt(Math.round(parseFloat(counterPrice)*100)*acting.offer.quantity)}</div>}
              </div>
            )}
            <div style={{marginBottom:20}}>
              <label style={S.lbl}>Message to retailer (optional)</label>
              <textarea style={{...S.inp,resize:"none" as const,height:70}} value={adminNote} onChange={e=>setAdminNote(e.target.value)}
                placeholder={acting.mode==="accept"?"Thanks for your offer…":acting.mode==="counter"?"Best we can do on this line is…":"We can't go that low on this one…"} />
            </div>
            <div style={{display:"flex",gap:10}}>
              <button style={{...S.btnGhost,flex:1}} onClick={()=>setActing(null)}>Cancel</button>
              <button style={{...S.btnPink,flex:1,opacity:actionMutation.isPending||(acting.mode==="counter"&&!counterPrice)?.6:1}}
                disabled={actionMutation.isPending||(acting.mode==="counter"&&!counterPrice)}
                onClick={()=>actionMutation.mutate({id:acting.offer.id,action:acting.mode==="accept"?"accept":acting.mode==="counter"?"counter":"decline",counterPricePence:acting.mode==="counter"?Math.round(parseFloat(counterPrice)*100):undefined,adminNote:adminNote||undefined})}>
                {actionMutation.isPending?"Saving…":acting.mode==="accept"?"Accept & Add to Basket":acting.mode==="counter"?"Send Counter-offer":"Decline Offer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
