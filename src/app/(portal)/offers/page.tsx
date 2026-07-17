"use client"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

const fmt = (p: number) => new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(p/100)
const STATUS: Record<string,{bg:string;color:string;label:string}> = {
  PENDING:   {bg:"#FEF3C7",color:"#D97706",label:"Pending review"},
  ACCEPTED:  {bg:"#EAFAF3",color:"#0EA572",label:"Accepted ✓"},
  DECLINED:  {bg:"#FFF1F4",color:"#E11D48",label:"Declined"},
  COUNTERED: {bg:"#F3EEFF",color:"#7C3AED",label:"Counter-offer received"},
  EXPIRED:   {bg:"#F4F5F7",color:"#8888AA",label:"Expired"},
  COMPLETED: {bg:"#E8F8F7",color:"#3A9E9B",label:"Completed"},
}

export default function MyOffersPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState("ALL")

  const { data, isLoading } = useQuery({
    queryKey: ["my-offers", filter],
    queryFn: async () => {
      const p = new URLSearchParams({...(filter!=="ALL"&&{status:filter})})
      const r = await fetch("/api/offers?"+p); return r.json()
    },
  })

  const actionMutation = useMutation({
    mutationFn: async ({id,action}: any) => {
      const r = await fetch("/api/offers/"+id,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({action})})
      return r.json()
    },
    onSuccess: () => qc.invalidateQueries({queryKey:["my-offers"]}),
  })

  const offers = data?.data ?? []
  const counterCount = offers.filter((o:any)=>o.status==="COUNTERED").length

  const S: any = {
    wrap: {padding:24,fontFamily:"system-ui,sans-serif",maxWidth:800},
    card: {background:"white",border:"1px solid rgba(0,0,0,.09)",borderRadius:14,padding:18,marginBottom:12,boxShadow:"0 1px 4px rgba(0,0,0,.04)"},
    chip: (a:boolean) => ({padding:"5px 14px",borderRadius:99,fontSize:12,fontWeight:500,background:a?"#88dde1":"#F4F5F7",color:a?"white":"#4A4A6A",border:"none",cursor:"pointer"}),
    badge: (s:string) => ({display:"inline-flex",padding:"3px 10px",borderRadius:99,fontSize:11,fontWeight:600,background:STATUS[s]?.bg??"#F4F5F7",color:STATUS[s]?.color??"#8888AA"}),
    btnPink: {padding:"8px 18px",background:"#88dde1",color:"white",border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer"},
    btnRed: {padding:"8px 14px",background:"white",color:"#E11D48",border:"1px solid rgba(225,29,72,.2)",borderRadius:8,fontSize:12,fontWeight:500,cursor:"pointer"},
  }

  return (
    <div style={S.wrap}>
      <h1 style={{fontSize:22,fontWeight:700,color:"#1A1A2E",margin:"0 0 4px"}}>My Offers</h1>
      <p style={{fontSize:13,color:"#8888AA",margin:"0 0 20px"}}>Track offers you have submitted</p>

      {counterCount > 0 && (
        <div style={{background:"#F3EEFF",border:"1px solid rgba(124,58,237,.2)",borderRadius:10,padding:"12px 16px",marginBottom:20,fontSize:13,color:"#7C3AED",fontWeight:500}}>
          💬 You have {counterCount} counter-offer{counterCount!==1?"s":""} waiting for your response
        </div>
      )}

      <div style={{display:"flex",gap:6,flexWrap:"wrap" as const,marginBottom:20}}>
        {["ALL","PENDING","COUNTERED","ACCEPTED","DECLINED"].map(f=>(
          <button key={f} style={S.chip(filter===f)} onClick={()=>setFilter(f)}>
            {f==="ALL"?"All":STATUS[f]?.label??f}
          </button>
        ))}
      </div>

      {isLoading ? <p style={{color:"#8888AA",fontSize:13}}>Loading…</p>
      : offers.length===0 ? (
        <div style={{...S.card,textAlign:"center",padding:"48px 24px"}}>
          <div style={{fontSize:40,marginBottom:12}}>💬</div>
          <p style={{fontWeight:600,color:"#1A1A2E",margin:"0 0 6px"}}>No offers yet</p>
          <p style={{fontSize:13,color:"#8888AA",margin:0}}>Browse Live Stock and click "Make an Offer" on any product</p>
        </div>
      ) : offers.map((offer: any) => {
        const savings = offer.product?.unitCostPence - offer.offeredPricePence
        const counterSavings = offer.counterPricePence ? offer.product?.unitCostPence - offer.counterPricePence : 0
        const isCounter = offer.status==="COUNTERED"
        return (
          <div key={offer.id} style={{...S.card,borderLeft:isCounter?"3px solid #7C3AED":offer.status==="ACCEPTED"?"3px solid #0EA572":"3px solid rgba(0,0,0,.08)"}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
              <div style={{width:80,height:50,borderRadius:8,background:"#F4F5F7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,overflow:"hidden"}}>
                {offer.product?.images?.[0]?.url ? <img src={offer.product.images[0].url} style={{width:"100%",height:"100%",objectFit:"cover"}} /> : "🎁"}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,marginBottom:8}}>
                  <div>
                    <div style={{fontWeight:600,color:"#1A1A2E",fontSize:14}}>{offer.product?.name}</div>
                    <div style={{fontSize:11,color:"#8888AA",marginTop:2,fontFamily:"monospace"}}>{offer.product?.sku}</div>
                  </div>
                  <span style={S.badge(offer.status)}>{STATUS[offer.status]?.label}</span>
                </div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap" as const,marginBottom:10}}>
                  <div style={{textAlign:"center" as const,padding:"7px 12px",background:"#F9FAFB",borderRadius:8,border:"1px solid rgba(0,0,0,.07)"}}>
                    <div style={{fontSize:10,color:"#8888AA",marginBottom:2}}>Listed price</div>
                    <div style={{fontSize:13,fontWeight:600,color:"#8888AA"}}>{fmt(offer.product?.unitCostPence)}</div>
                  </div>
                  <div style={{textAlign:"center" as const,padding:"7px 12px",background:"#e0f7f8",borderRadius:8,border:"1px solid rgba(136,221,225,.3)"}}>
                    <div style={{fontSize:10,color:"#1a9da3",marginBottom:2}}>Your offer</div>
                    <div style={{fontSize:13,fontWeight:700,color:"#1a9da3"}}>{fmt(offer.offeredPricePence)}</div>
                    <div style={{fontSize:10,color:"#1a9da3"}}>Save {fmt(savings)}/unit</div>
                  </div>
                  {offer.counterPricePence && (
                    <div style={{textAlign:"center" as const,padding:"7px 12px",background:"#F3EEFF",borderRadius:8,border:"1px solid rgba(124,58,237,.2)"}}>
                      <div style={{fontSize:10,color:"#7C3AED",marginBottom:2}}>Counter-offer</div>
                      <div style={{fontSize:13,fontWeight:700,color:"#7C3AED"}}>{fmt(offer.counterPricePence)}</div>
                      <div style={{fontSize:10,color:"#7C3AED"}}>Save {fmt(counterSavings)}/unit</div>
                    </div>
                  )}
                  <div style={{textAlign:"center" as const,padding:"7px 12px",background:"#F9FAFB",borderRadius:8,border:"1px solid rgba(0,0,0,.07)"}}>
                    <div style={{fontSize:10,color:"#8888AA",marginBottom:2}}>Quantity</div>
                    <div style={{fontSize:13,fontWeight:600,color:"#1A1A2E"}}>{offer.quantity} units</div>
                  </div>
                </div>
                {offer.note && <div style={{padding:"8px 12px",background:"#F9FAFB",borderRadius:8,fontSize:12,color:"#4A4A6A",marginBottom:8}}>Your note: {offer.note}</div>}
                {offer.adminNote && <div style={{padding:"8px 12px",background:"#F3EEFF",borderRadius:8,fontSize:12,color:"#7C3AED",marginBottom:8}}>Response from collect&display: {offer.adminNote}</div>}
                {isCounter && (
                  <div style={{display:"flex",gap:8,marginTop:4}}>
                    <button style={S.btnPink} onClick={()=>actionMutation.mutate({id:offer.id,action:"accept-counter"})} disabled={actionMutation.isPending}>
                      Accept {fmt(offer.counterPricePence!)} ✓
                    </button>
                    <button style={S.btnRed} onClick={()=>actionMutation.mutate({id:offer.id,action:"decline-counter"})} disabled={actionMutation.isPending}>
                      Decline
                    </button>
                  </div>
                )}
                {offer.status==="ACCEPTED" && (
                  <div style={{padding:"8px 12px",background:"#EAFAF3",borderRadius:8,fontSize:12,color:"#0EA572",fontWeight:500,marginTop:4}}>
                    ✓ Added to your basket — complete checkout to confirm your order
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
