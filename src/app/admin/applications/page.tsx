"use client"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { formatDate } from "@/lib/utils"

const STATUS: Record<string,{bg:string;color:string;label:string}> = {
  PENDING:  {bg:"#FEF3C7",color:"#D97706",label:"Pending"},
  APPROVED: {bg:"#EAFAF3",color:"#0EA572",label:"Approved"},
  DECLINED: {bg:"#FFF1F4",color:"#E11D48",label:"Declined"},
}

export default function AdminApplicationsPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState("PENDING")
  const [acting, setActing] = useState<{app:any;mode:"approve"|"decline"}|null>(null)
  const [adminNote, setAdminNote] = useState("")
  const [approved, setApproved] = useState<{name:string;email:string;password:string}|null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["applications", filter],
    queryFn: async () => {
      const r = await fetch("/api/applications?status="+filter)
      return r.json()
    },
  })

  const actionMutation = useMutation({
    mutationFn: async ({id,action,adminNote}: any) => {
      const r = await fetch("/api/applications/"+id, {method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,adminNote})})
      return r.json()
    },
    onSuccess: (d, vars) => {
      qc.invalidateQueries({queryKey:["applications"]})
      if (d.success && vars.action==="approve") {
        setApproved({name:acting!.app.businessName,email:acting!.app.email,password:d.tempPassword})
      }
      setActing(null); setAdminNote("")
    },
  })

  const apps = data?.data ?? []
  const pendingCount = apps.filter((a:any)=>a.status==="PENDING").length

  const S: any = {
    wrap: {padding:24,fontFamily:"system-ui,sans-serif"},
    card: {background:"white",border:"1px solid rgba(0,0,0,.09)",borderRadius:14,padding:18,marginBottom:10,boxShadow:"0 1px 4px rgba(0,0,0,.04)"},
    chip: (a:boolean) => ({padding:"5px 14px",borderRadius:99,fontSize:12,fontWeight:500,background:a?"#88dde1":"#F4F5F7",color:a?"white":"#4A4A6A",border:"none",cursor:"pointer"}),
    badge: (s:string) => ({display:"inline-flex",padding:"3px 10px",borderRadius:99,fontSize:11,fontWeight:600,background:STATUS[s]?.bg??"#F4F5F7",color:STATUS[s]?.color??"#8888AA"}),
    overlay: {position:"fixed" as const,inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(2px)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:16},
    modal: {background:"white",borderRadius:16,padding:28,maxWidth:440,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,.15)"},
    inp: {width:"100%",padding:"10px 12px",border:"1.5px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:13,color:"#1A1A2E",outline:"none",boxSizing:"border-box" as const,background:"white",marginTop:6},
    lbl: {fontSize:11,fontWeight:600,color:"#4A4A6A",textTransform:"uppercase" as const,letterSpacing:".05em"},
    btnPink: {padding:"9px 18px",background:"#88dde1",color:"white",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer"},
    btnGhost: {padding:"9px 16px",background:"white",color:"#4A4A6A",border:"1px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer"},
    btnGreen: {padding:"7px 14px",background:"#0EA572",color:"white",border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer"},
    btnRed: {padding:"7px 12px",background:"white",color:"#E11D48",border:"1px solid rgba(225,29,72,.2)",borderRadius:8,fontSize:12,fontWeight:500,cursor:"pointer"},
  }

  return (
    <div style={S.wrap}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:700,color:"#1A1A2E",margin:"0 0 4px"}}>Applications</h1>
          <p style={{fontSize:13,color:"#8888AA",margin:0}}>Retailer account requests</p>
        </div>
        {pendingCount>0 && <div style={{background:"#FEF3C7",border:"1px solid rgba(217,119,6,.2)",borderRadius:8,padding:"8px 14px",fontSize:13,color:"#D97706",fontWeight:600}}>⏳ {pendingCount} pending</div>}
      </div>

      <div style={{display:"flex",gap:6,marginBottom:20}}>
        {["PENDING","APPROVED","DECLINED","ALL"].map(f=>(
          <button key={f} style={S.chip(filter===f)} onClick={()=>setFilter(f)}>
            {f==="ALL"?"All":STATUS[f]?.label??f}
          </button>
        ))}
      </div>

      {approved && (
        <div style={{background:"#EAFAF3",border:"1px solid rgba(14,165,114,.25)",borderRadius:12,padding:"16px 20px",marginBottom:20}}>
          <div style={{fontWeight:700,color:"#0EA572",fontSize:14,marginBottom:8}}>✓ {approved.name} approved — account created</div>
          <div style={{fontSize:13,color:"#1A1A2E",marginBottom:4}}>Email: <strong>{approved.email}</strong></div>
          <div style={{fontSize:13,color:"#1A1A2E",marginBottom:8}}>Temp password: <strong style={{fontFamily:"monospace",background:"#D0F5E8",padding:"2px 8px",borderRadius:4}}>{approved.password}</strong></div>
          <div style={{fontSize:12,color:"#4A4A6A",marginBottom:10}}>Send these credentials to the retailer so they can log in and change their password.</div>
          <button onClick={()=>setApproved(null)} style={{...S.btnGhost,fontSize:12,padding:"5px 12px"}}>Dismiss</button>
        </div>
      )}

      {isLoading ? <p style={{color:"#8888AA",fontSize:13}}>Loading…</p>
      : apps.length===0 ? (
        <div style={{...S.card,textAlign:"center",padding:"48px 24px"}}>
          <div style={{fontSize:40,marginBottom:12}}>📋</div>
          <p style={{fontWeight:600,color:"#1A1A2E",margin:"0 0 6px"}}>No {filter==="ALL"?"":filter.toLowerCase()} applications</p>
          <p style={{fontSize:13,color:"#8888AA",margin:0}}>New applications from the login page appear here</p>
        </div>
      ) : apps.map((app: any) => (
        <div key={app.id} style={{...S.card,borderLeft:app.status==="PENDING"?"3px solid #D97706":app.status==="APPROVED"?"3px solid #0EA572":"3px solid #E11D48"}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                <span style={{fontSize:15,fontWeight:700,color:"#1A1A2E"}}>{app.businessName}</span>
                <span style={S.badge(app.status)}>{STATUS[app.status]?.label}</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,fontSize:13}}>
                <div><div style={{fontSize:10,color:"#8888AA",marginBottom:2}}>CONTACT</div><div style={{fontWeight:500,color:"#1A1A2E"}}>{app.contactName}</div></div>
                <div><div style={{fontSize:10,color:"#8888AA",marginBottom:2}}>EMAIL</div><div style={{color:"#4A4A6A"}}>{app.email}</div></div>
                <div><div style={{fontSize:10,color:"#8888AA",marginBottom:2}}>PHONE</div><div style={{color:"#4A4A6A"}}>{app.phone||"—"}</div></div>
              </div>
              {app.adminNote && <div style={{marginTop:10,padding:"8px 12px",background:"#F4F5F7",borderRadius:8,fontSize:12,color:"#4A4A6A"}}>Note: {app.adminNote}</div>}
              <div style={{fontSize:11,color:"#BBBBCC",marginTop:8}}>Applied {formatDate(app.createdAt)}</div>
            </div>
            {app.status==="PENDING" && (
              <div style={{display:"flex",gap:8,flexShrink:0}}>
                <button style={S.btnGreen} onClick={()=>{setActing({app,mode:"approve"});setAdminNote("")}}>✓ Approve</button>
                <button style={S.btnRed} onClick={()=>{setActing({app,mode:"decline"});setAdminNote("")}}>✗ Decline</button>
              </div>
            )}
          </div>
        </div>
      ))}

      {acting && (
        <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setActing(null)}>
          <div style={S.modal}>
            <div style={{fontSize:17,fontWeight:700,color:"#1A1A2E",margin:"0 0 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              {acting.mode==="approve"?"Approve Application":"Decline Application"}
              <button onClick={()=>setActing(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:"#8888AA",padding:0}}>×</button>
            </div>
            <div style={{background:"#F9FAFB",borderRadius:10,padding:"12px 14px",marginBottom:16,fontSize:13}}>
              <div style={{fontWeight:600,color:"#1A1A2E",marginBottom:2}}>{acting.app.businessName}</div>
              <div style={{color:"#8888AA"}}>{acting.app.contactName} · {acting.app.email}</div>
            </div>
            {acting.mode==="approve" && (
              <div style={{background:"#EAFAF3",border:"1px solid rgba(14,165,114,.2)",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#0EA572"}}>
                ✓ This will create a retailer account. A temporary password will be generated — share it with the retailer.
              </div>
            )}
            <div style={{marginBottom:20}}>
              <label style={S.lbl}>Note (optional)</label>
              <textarea style={{...S.inp,resize:"none" as const,height:70}} value={adminNote} onChange={e=>setAdminNote(e.target.value)}
                placeholder={acting.mode==="approve"?"Welcome note…":"Reason for declining…"} />
            </div>
            <div style={{display:"flex",gap:10}}>
              <button style={{...S.btnGhost,flex:1}} onClick={()=>setActing(null)}>Cancel</button>
              <button style={{...S.btnPink,flex:1}} disabled={actionMutation.isPending}
                onClick={()=>actionMutation.mutate({id:acting.app.id,action:acting.mode,adminNote:adminNote||undefined})}>
                {actionMutation.isPending?"Saving…":acting.mode==="approve"?"Approve & Create Account":"Decline Application"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
