import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import Link from "next/link"
import { OrderExportButton } from "@/components/portal/OrderExportButton"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils"

const ALL_STATUSES = ["PLACED","CONFIRMED","PACKED","DISPATCHED","DELIVERED"]
const STATUS_LABELS: Record<string,string> = {
  PLACED:"Placed",CONFIRMED:"Confirmed",PACKED:"Packed",
  DISPATCHED:"Dispatched",DELIVERED:"Delivered"
}
const CARRIERS: Record<string,string> = {
  "Royal Mail":"https://www.royalmail.com/track-your-item#/tracking-results/",
  "DPD":"https://www.dpd.co.uk/apps/tracking/?reference=",
  "Evri":"https://www.evri.com/track-a-parcel#/tracking/",
  "DHL":"https://www.dhl.com/gb-en/home/tracking.html?tracking-id=",
  "UPS":"https://www.ups.com/track?tracknum=",
  "Yodel":"https://www.yodel.co.uk/track/",
}

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: { include: { product: { include: { brand: true } } } },
      retailer: { include: { addresses: true } },
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  })
  if (!order) notFound()

  if ((session.user as any).role !== "ADMIN") {
    const retailer = await prisma.retailer.findFirst({ where: { userId: (session.user as any).id } })
    if (!retailer || order.retailerId !== retailer.id) notFound()
  }

  const reachedIdx = ALL_STATUSES.indexOf(order.status)
  const isCancelled = order.status === "CANCELLED"
  const trackUrl = order.trackingNumber && order.carrierName ? CARRIERS[order.carrierName] : null
  const address = order.retailer.addresses[0]

  return (
    <>
    <style>{`
      body{font-family:system-ui,sans-serif}
      .page{padding:24px;max-width:800px}
      .back-link{display:inline-flex;align-items:center;gap:6px;color:#8888AA;font-size:13px;text-decoration:none;margin-bottom:20px;transition:color .15s}
      .back-link:hover{color:#88dde1}
      .order-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px}
      .order-num{font-size:26px;font-weight:700;color:#1A1A2E;margin:0 0 4px}
      .order-meta{font-size:13px;color:#8888AA;margin:0}
      .status-badge{display:inline-flex;padding:4px 12px;border-radius:99px;font-size:12px;font-weight:600}
      .card{background:white;border:1px solid rgba(0,0,0,.09);border-radius:14px;box-shadow:0 1px 4px rgba(0,0,0,.05);margin-bottom:16px}
      .card-head{padding:14px 18px;border-bottom:1px solid rgba(0,0,0,.07);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:#8888AA}
      .card-body{padding:18px}
      .timeline{display:flex;align-items:flex-start;gap:0;padding:4px 0}
      .tl-step{display:flex;flex-direction:column;align-items:center;flex:1;position:relative}
      .tl-connector{position:absolute;top:12px;left:50%;width:100%;height:2px;z-index:0}
      .tl-dot{width:24px;height:24px;border-radius:50%;z-index:1;position:relative;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;border:2px solid}
      .tl-dot.done{background:#88dde1;border-color:#88dde1;color:white}
      .tl-dot.current{background:#88dde1;border-color:#88dde1;color:white;box-shadow:0 0 0 4px rgba(136,221,225,.25)}
      .tl-dot.pending{background:white;border-color:#E0E0E0;color:#CCCCCC}
      .tl-label{font-size:9px;text-align:center;margin-top:6px;line-height:1.3}
      .tl-label.done{color:#4A4A6A;font-weight:500}
      .tl-label.current{color:#1a9da3;font-weight:700}
      .tl-label.pending{color:#BBBBCC}
      .tl-date{font-size:8px;color:#BBBBCC;text-align:center;margin-top:2px}
      .tracker{background:#E8F8F7;border:1px solid rgba(92,200,197,.3);border-radius:10px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;margin-top:12px}
      .tracker-label{font-size:11px;color:#8888AA;margin:0 0 2px}
      .tracker-num{font-family:monospace;font-size:14px;font-weight:600;color:#3A9E9B;margin:0}
      .track-btn{padding:7px 14px;background:#88dde1;color:white;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:4px}
      .track-btn:hover{background:#5ecfd4}
      .detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:0}
      .detail-item{padding:10px 0;border-bottom:1px solid rgba(0,0,0,.06)}
      .detail-item:nth-last-child(-n+2){border-bottom:none}
      .detail-label{font-size:11px;color:#8888AA;margin:0 0 3px}
      .detail-val{font-size:13px;font-weight:600;color:#1A1A2E;margin:0}
      .line-item{display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid rgba(0,0,0,.06)}
      .line-item:last-child{border-bottom:none}
      .line-icon{width:40px;height:40px;background:linear-gradient(135deg,#e6f9fa,#E8F8F7);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
      .line-name{font-size:13px;font-weight:600;color:#1A1A2E;margin:0 0 2px}
      .line-meta{font-size:11px;color:#8888AA;margin:0;font-family:monospace}
      .line-val{margin-left:auto;text-align:right;flex-shrink:0}
      .line-qty{font-size:12px;color:#8888AA;margin:0 0 2px}
      .line-total{font-size:14px;font-weight:700;color:#1A1A2E;margin:0}
      .totals-row{display:flex;justify-content:space-between;font-size:13px;padding:6px 0;color:#8888AA}
      .totals-final{display:flex;justify-content:space-between;font-size:15px;font-weight:700;color:#1a9da3;padding-top:10px;border-top:1px solid rgba(0,0,0,.08);margin-top:4px}
    `}</style>
    <div className="page">
      <Link href="/orders" className="back-link">← Back to orders</Link>
      <div className="order-header">
        <div>
          <h1 className="order-num">{order.orderNumber}</h1>
          <p className="order-meta">Placed {formatDateTime(order.createdAt)}{order.poReference?" · PO: "+order.poReference:""}</p>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <OrderExportButton orderNumber={order.orderNumber} items={order.items.map(i=>({productName:i.productName,sku:i.sku,quantity:i.quantity,unitCostPence:i.unitCostPence,lineTotalPence:i.lineTotalPence,rrpPence:i.product?.rrpPence}))} />
          <span className="status-badge" style={{background:order.status==="DELIVERED"?"#EAFAF3":order.status==="CANCELLED"?"#FFF1F4":order.status==="DISPATCHED"||order.status==="OUT_FOR_DELIVERY"?"#E8F8F7":"#e6f9fa",color:order.status==="DELIVERED"?"#0EA572":order.status==="CANCELLED"?"#E11D48":order.status==="DISPATCHED"||order.status==="OUT_FOR_DELIVERY"?"#3A9E9B":"#1a9da3"}}>
          {order.status.replace(/_/g," ")}
          </span>
        </div>
      </div>

      {!isCancelled && (
        <div className="card">
          <div className="card-head">Order Progress</div>
          <div className="card-body">
            <div className="timeline">
              {ALL_STATUSES.map((status, idx) => {
                const done = idx <= reachedIdx
                const current = idx === reachedIdx
                const histEntry = order.statusHistory.find(h => h.status === status)
                return (
                  <div key={status} className="tl-step">
                    {idx < ALL_STATUSES.length - 1 && (
                      <div className="tl-connector" style={{background:done&&!current?"#88dde1":"#E0E0E0"}} />
                    )}
                    <div className={"tl-dot "+(current?"current":done?"done":"pending")}>
                      {done?"✓":""}
                    </div>
                    <div className={"tl-label "+(current?"current":done?"done":"pending")}>{STATUS_LABELS[status]}</div>
                    {histEntry && <div className="tl-date">{formatDate(histEntry.createdAt)}</div>}
                  </div>
                )
              })}
            </div>
            {order.trackingNumber && (
              <div className="tracker">
                <div>
                  <p className="tracker-label">{order.carrierName ?? "Carrier"} tracking</p>
                  <p className="tracker-num">{order.trackingNumber}</p>
                </div>
                {trackUrl ? (
                  <a href={trackUrl+encodeURIComponent(order.trackingNumber)} target="_blank" rel="noopener noreferrer" className="track-btn">Track ↗</a>
                ) : (
                  <button className="track-btn" onClick={()=>{}}>Copy</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head">Order Details</div>
        <div className="card-body">
          <div className="detail-grid">
            {[
              ["Order Number", order.orderNumber],
              ["Date Placed", formatDate(order.createdAt)],
              ["PO Reference", order.poReference ?? "—"],
              ["Status", order.status.replace(/_/g," ")],
              ...(order.estimatedDelivery ? [["Est. Delivery", formatDate(order.estimatedDelivery)]] : []),
            ].map(([l,v]) => (
              <div key={l} className="detail-item">
                <p className="detail-label">{l}</p>
                <p className="detail-val">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">Order Lines ({order.items.length})</div>
        <div className="card-body" style={{paddingBottom:0}}>
          {order.items.map(item => (
            <div key={item.id} className="line-item">
              <div style={{flex:1,minWidth:0}}>
                <p className="line-name">{item.productName}</p>
                <p className="line-meta">{item.sku} · {item.product.brand?.name}</p>
              </div>
              <div className="line-val">
                <p className="line-qty">×{item.quantity} units</p>
                <p className="line-total">{formatCurrency(item.lineTotalPence)}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{padding:"14px 18px",borderTop:"1px solid rgba(0,0,0,.07)"}}>
          <div className="totals-row"><span>Subtotal (ex. VAT)</span><span>{formatCurrency(order.subtotalPence)}</span></div>
          <div className="totals-row"><span>VAT (20%)</span><span>{formatCurrency(order.vatPence)}</span></div>
          <div className="totals-final"><span>Total (inc. VAT)</span><span>{formatCurrency(order.totalPence)}</span></div>
        </div>
      </div>

      {address && (
        <div className="card">
          <div className="card-head">Delivery Address</div>
          <div className="card-body">
            <p style={{fontSize:13,color:"#4A4A6A",lineHeight:1.8,margin:0}}>
              {address.line1}<br/>
              {address.line2 && <>{address.line2}<br/></>}
              {address.city}{address.county?", "+address.county:""}<br/>
              <span style={{fontFamily:"monospace",fontSize:12}}>{address.postcode}</span>
            </p>
            {order.deliveryNotes && <p style={{fontSize:12,color:"#8888AA",marginTop:10,paddingTop:10,borderTop:"1px solid rgba(0,0,0,.06)"}}>{order.deliveryNotes}</p>}
          </div>
        </div>
      )}
    </div>
    </>
  )
}
