"use client"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"

const CARRIERS: Record<string,string> = {
  "Royal Mail":"https://www.royalmail.com/track-your-item#/tracking-results/",
  "DPD":"https://www.dpd.co.uk/apps/tracking/?reference=",
  "Evri":"https://www.evri.com/track-a-parcel#/tracking/",
  "DHL":"https://www.dhl.com/gb-en/home/tracking.html?tracking-id=",
  "UPS":"https://www.ups.com/track?tracknum=",
  "Yodel":"https://www.yodel.co.uk/track/",
}

export default function TrackingPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["tracking"],
    queryFn: async () => { const r = await fetch("/api/orders?statuses=DISPATCHED,OUT_FOR_DELIVERY&limit=20"); return r.json() },
  })
  const { data: delivered } = useQuery({
    queryKey: ["delivered"],
    queryFn: async () => { const r = await fetch("/api/orders?statuses=DELIVERED&limit=5"); return r.json() },
  })
  const shipments = data?.data ?? []
  const recentDelivered = delivered?.data ?? []

  return (
    <>
    <style>{`
      .p-page{padding:24px;font-family:system-ui,sans-serif}
      .page-title{font-size:22px;font-weight:700;color:#1A1A2E;margin:0 0 4px}
      .page-sub{font-size:13px;color:#8888AA;margin:0 0 24px}
      .card{background:white;border:1px solid rgba(0,0,0,.09);border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.05)}
      .card-pad{padding:16px}
      .row{display:flex;align-items:center;gap:12px}
      .row-between{display:flex;align-items:center;justify-content:space-between;gap:12px}
      .mb8{margin-bottom:8px}.mb12{margin-bottom:12px}.mb16{margin-bottom:16px}.mb24{margin-bottom:24px}.mt24{margin-top:24px}
      .txt-primary{color:#1A1A2E}.txt-secondary{color:#4A4A6A}.txt-muted{color:#8888AA}.txt-teal{color:#3A9E9B}
      .fw600{font-weight:600}.fs12{font-size:12px}.fs13{font-size:13px}
      .badge-green{background:#EAFAF3;color:#0EA572;display:inline-flex;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600}
      .badge-grey{background:#F4F5F7;color:#8888AA;display:inline-flex;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600}
      .tracker-card{background:white;border:1px solid rgba(0,0,0,.09);border-radius:12px;padding:16px;margin-bottom:12px;box-shadow:0 1px 4px rgba(0,0,0,.05)}
      .tracking-num{background:#E8F8F7;border:1px solid rgba(92,200,197,.3);border-radius:8px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;margin-top:12px}
      .track-btn{padding:6px 12px;background:#F0A3BC;color:white;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:4px}
      .empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:64px 16px;text-align:center}
      .section-head{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:#8888AA;margin:0 0 10px}
    `}</style>
    <div className="p-page" style={{maxWidth:700}}>
      <h1 className="page-title">Track Shipments</h1>
      <p className="page-sub">Live tracking for orders currently in transit</p>
      {isLoading ? <p className="txt-muted fs13">Loading…</p>
      : shipments.length === 0 ? (
        <div className="empty-state card">
          <div style={{fontSize:40,marginBottom:12}}>🚚</div>
          <p className="fw600 txt-primary">No active shipments</p>
          <p className="txt-muted fs13">Tracking will appear here once an order has been dispatched.</p>
        </div>
      ) : shipments.map((order: any) => {
        const trackUrl = order.trackingNumber && order.carrierName ? CARRIERS[order.carrierName] : null
        return (
          <div key={order.id} className="tracker-card">
            <div className="row-between mb8">
              <div className="row">
                <span className="fw600 txt-primary">{order.orderNumber}</span>
                <span className={order.status==="OUT_FOR_DELIVERY"?"badge-green":"badge-grey"}>{order.status.replace(/_/g," ")}</span>
              </div>
              {trackUrl && order.trackingNumber && (
                <a href={trackUrl+encodeURIComponent(order.trackingNumber)} target="_blank" rel="noopener noreferrer" className="track-btn">
                  Track on {order.carrierName} ↗
                </a>
              )}
            </div>
            <p className="fs12 txt-muted mb8">{order.items?.length??0} items · {order.retailer?.businessName}</p>
            {order.trackingNumber && (
              <div className="tracking-num">
                <div>
                  <p className="fs12 txt-muted" style={{margin:"0 0 2px"}}>{order.carrierName ?? "Carrier"}</p>
                  <p className="fw600" style={{fontFamily:"monospace",fontSize:13,margin:0,color:"#3A9E9B"}}>{order.trackingNumber}</p>
                </div>
                <button onClick={()=>navigator.clipboard.writeText(order.trackingNumber)} className="track-btn" style={{background:"#E8F8F7",color:"#3A9E9B"}}>Copy</button>
              </div>
            )}
          </div>
        )
      })}
      {recentDelivered.length > 0 && (
        <div className="mt24">
          <p className="section-head">Recently Delivered</p>
          {recentDelivered.map((o: any) => (
            <div key={o.id} className="card" style={{padding:"12px 16px",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div className="row">
                <span style={{fontSize:20}}>✅</span>
                <div><p className="fw600 fs13 txt-primary" style={{margin:0}}>{o.orderNumber}</p><p className="fs12 txt-muted" style={{margin:0}}>{o.items?.length??0} items</p></div>
              </div>
              <span className="badge-grey">Delivered</span>
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  )
}
