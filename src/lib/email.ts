import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? "orders@collectanddisplay.com"
const REPLY_TO = process.env.REPLY_TO ?? "bhavik@collectanddisplay.com"
const PORTAL_URL = process.env.NEXTAUTH_URL ?? "https://collectanddisplay.netlify.app"

const fmt = (p: number) => `£${(p / 100).toFixed(2)}`

const header = `
<div style="background:#080c14;padding:24px 32px">
  <div style="font-size:20px;font-weight:800;color:white;letter-spacing:-.3px;font-family:system-ui,sans-serif">
    collect<span style="color:#88dde1">&amp;</span>display
  </div>
  <div style="font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-top:3px;font-family:system-ui,sans-serif">Distribution Portal</div>
</div>`

const footer = `
<div style="padding:20px 32px;text-align:center;background:#f8fafb;border-top:1px solid #eee">
  <p style="font-size:12px;color:#aaa;margin:0;font-family:system-ui,sans-serif">
    collect&amp;display · <a href="${PORTAL_URL}" style="color:#88dde1;text-decoration:none">Visit Portal</a> · Reply to this email to contact us
  </p>
</div>`

const wrap = (content: string) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f0fafb;font-family:system-ui,sans-serif">
<div style="max-width:580px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;border:1px solid #e0f0f1">
  ${header}
  <div style="padding:32px">
    ${content}
  </div>
  ${footer}
</div>
</body></html>`

const btn = (text: string, url: string) =>
  `<div style="text-align:center;margin-top:24px">
    <a href="${url}" style="display:inline-block;padding:12px 28px;background:#88dde1;color:#0a1420;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:.02em">${text}</a>
  </div>`

const infoBox = (rows: [string, string][]) =>
  `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fafb;border-radius:10px;margin-bottom:20px">
    ${rows.map(([l, v]) => `<tr>
      <td width="50%" style="padding:10px 20px;font-size:13px;color:#888;font-family:system-ui,sans-serif">${l}</td>
      <td width="50%" style="padding:10px 20px;font-size:13px;font-weight:600;color:#0d1117;font-family:system-ui,sans-serif">${v}</td>
    </tr>`).join("")}
  </table>`


const noteBox = (text: string) =>
  `<div style="border-left:3px solid #88dde1;background:#f0fafb;padding:12px 16px;border-radius:0 8px 8px 0;font-size:13px;color:#444;margin:16px 0">${text}</div>`

// ── ORDER CONFIRMATION ─────────────────────────────────────────
export async function sendOrderConfirmation({ to, retailerName, orderNumber, items, subtotalPence, vatPence, totalPence, poReference }: {
  to: string; retailerName: string; orderNumber: string
  items: { productName: string; sku: string; quantity: number; unitCostPence: number; lineTotalPence: number }[]
  subtotalPence: number; vatPence: number; totalPence: number; poReference?: string | null
}) {
  const rows = items.map(i => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f4f4f4;font-size:13px;color:#0d1117">${i.productName}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f4f4f4;font-size:11px;color:#aaa;font-family:monospace">${i.sku}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f4f4f4;font-size:13px;color:#0d1117;text-align:center">×${i.quantity}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f4f4f4;font-size:13px;font-weight:600;color:#0d1117;text-align:right">${fmt(i.lineTotalPence)}</td>
    </tr>`).join("")

  console.log('[RESEND] Attempting to send to:', to)
  try {
    const result = await resend.emails.send({
      from: `Collect & Display <${FROM}>`,
      to,
      replyTo: REPLY_TO,
      subject: `Order confirmed — ${orderNumber}`,
      html: wrap(`
        <h2 style="font-size:20px;font-weight:700;color:#0d1117;margin:0 0 6px">Order received ✓</h2>
        <p style="font-size:14px;color:#666;margin:0 0 20px;line-height:1.6">Hi ${retailerName}, your order has been placed successfully.</p>
        ${infoBox([
          ["Order Number", orderNumber],
          ...(poReference ? [["PO Reference", poReference] as [string, string]] : []),
        ])}
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <thead>
            <tr style="border-bottom:2px solid #f0fafb">
              <th style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#888;padding:8px 0;text-align:left">Product</th>
              <th style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#888;padding:8px 0;text-align:left">SKU</th>
              <th style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#888;padding:8px 0;text-align:center">Qty</th>
              <th style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#888;padding:8px 0;text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <table style="width:100%;border-collapse:collapse;border-top:2px solid #f0fafb;margin-top:12px">
          <tr><td style="padding:6px 0;font-size:13px;color:#888">Subtotal (ex. VAT):</td><td style="padding:6px 0;font-size:13px;color:#888;text-align:right">${fmt(subtotalPence)}</td></tr>
          <tr><td style="padding:6px 0;font-size:13px;color:#888">VAT (20%):</td><td style="padding:6px 0;font-size:13px;color:#888;text-align:right">${fmt(vatPence)}</td></tr>
          <tr style="border-top:1px solid #f0fafb"><td style="padding:8px 0;font-size:15px;font-weight:700;color:#1a9da3">Total (inc. VAT):</td><td style="padding:8px 0;font-size:15px;font-weight:700;color:#1a9da3;text-align:right">${fmt(totalPence)}</td></tr>
        </table>
        ${btn("View Order →", `${PORTAL_URL}/orders`)}
      `),
    })
    console.log('[EMAIL RESULT]', JSON.stringify(result))
    return result
  } catch(err) {
    console.error('[EMAIL ERROR]', err)
    throw err
  }
}

// ── ORDER STATUS UPDATE ────────────────────────────────────────
export async function sendStatusUpdate({ to, businessName, orderNumber, newStatus, trackingNumber, carrierName, note }: {
  to: string; businessName: string; orderNumber: string; newStatus: string
  trackingNumber?: string; carrierName?: string; note?: string
}) {
  const statusLabels: Record<string,string> = {
    PLACED:"Order Placed", CONFIRMED:"Confirmed", PROCESSING:"Processing",
    PICKED:"Picked", PACKED:"Packed & Ready", DISPATCHED:"Dispatched",
    OUT_FOR_DELIVERY:"Out for Delivery", DELIVERED:"Delivered", CANCELLED:"Cancelled"
  }
  const statusColors: Record<string,string> = {
    PLACED:"#88dde1", CONFIRMED:"#88dde1", PROCESSING:"#a78bfa",
    PICKED:"#a78bfa", PACKED:"#fbbf24", DISPATCHED:"#34d399",
    OUT_FOR_DELIVERY:"#34d399", DELIVERED:"#6ee7b7", CANCELLED:"#f87171"
  }
  const label = statusLabels[newStatus] ?? newStatus.replace(/_/g, " ")
  const color = statusColors[newStatus] ?? "#88dde1"

  console.log('[RESEND] Attempting to send to:', to)
  return resend.emails.send({
    from: `Collect & Display <${FROM}>`,
    to,
    replyTo: REPLY_TO,
    subject: `${orderNumber} — ${label}`,
    html: wrap(`
      <div style="text-align:center;margin-bottom:24px">
        <span style="display:inline-block;padding:8px 20px;background:${color}22;border:1.5px solid ${color}55;border-radius:99px;font-size:13px;font-weight:700;color:${color};letter-spacing:.04em">${label}</span>
      </div>
      <h2 style="font-size:20px;font-weight:700;color:#0d1117;margin:0 0 8px;text-align:center">Your order has been updated</h2>
      <p style="font-size:14px;color:#666;margin:0 0 20px;text-align:center;line-height:1.6">Hi ${businessName}, your order <strong>${orderNumber}</strong> is now <strong>${label.toLowerCase()}</strong>.</p>
      ${trackingNumber ? `
      <div style="background:#f0fafb;border:1.5px solid #88dde1;border-radius:12px;padding:16px 20px;text-align:center;margin-bottom:20px">
        <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#888;margin-bottom:6px">${carrierName ?? "Carrier"} Tracking Number</div>
        <div style="font-size:18px;font-weight:700;color:#1a9da3;font-family:monospace">${trackingNumber}</div>
      </div>` : ""}
      ${newStatus === "DELIVERED" ? `<div style="background:#f0fdf4;border-radius:10px;padding:14px;text-align:center;font-size:14px;color:#166534;margin-bottom:20px">🎉 Your order has been delivered. Thank you for ordering with collect&display!</div>` : ""}
      ${note ? noteBox(`Note from our team: ${note}`) : ""}
      ${btn("Track Your Order →", `${PORTAL_URL}/orders`)}
    `),
  })
}

// ── OFFER UPDATE ───────────────────────────────────────────────
export async function sendOfferUpdate({ to, businessName, productName, action, offeredPricePence, counterPricePence, adminNote }: {
  to: string; businessName: string; productName: string
  action: "accepted" | "declined" | "countered"
  offeredPricePence: number; counterPricePence?: number; adminNote?: string
}) {
  const titles = { accepted: "Your offer was accepted! 🎉", declined: "Your offer was declined", countered: "Counter-offer received" }
  const subtitles = {
    accepted: `Your offer of ${fmt(offeredPricePence)}/unit has been accepted. The items have been added to your basket — complete checkout to confirm.`,
    declined: `Unfortunately your offer of ${fmt(offeredPricePence)}/unit was not accepted this time.`,
    countered: `We've responded to your offer of ${fmt(offeredPricePence)}/unit with a counter-offer of ${fmt(counterPricePence!)}/unit.`,
  }

  console.log('[RESEND] Attempting to send to:', to)
  return resend.emails.send({
    from: `Collect & Display <${FROM}>`,
    to,
    replyTo: REPLY_TO,
    subject: `Offer update — ${productName}`,
    html: wrap(`
      <h2 style="font-size:20px;font-weight:700;color:#0d1117;margin:0 0 8px">${titles[action]}</h2>
      <p style="font-size:14px;color:#666;margin:0 0 20px;line-height:1.6">Hi ${businessName}, ${subtitles[action]}</p>
      ${infoBox([
        ["Product", productName],
        ["Your offer", `${fmt(offeredPricePence)}/unit`],
        ...(counterPricePence ? [["Counter-offer", `${fmt(counterPricePence)}/unit`] as [string,string]] : []),
      ])}
      ${adminNote ? noteBox(`Message from collect&display: ${adminNote}`) : ""}
      ${btn("View My Offers →", `${PORTAL_URL}/offers`)}
    `),
  })
}

// ── WELCOME EMAIL ──────────────────────────────────────────────
export async function sendWelcomeEmail({ to, businessName, contactName, tempPassword, loginUrl }: {
  to: string; businessName: string; contactName: string; tempPassword: string; loginUrl: string
}) {
  console.log('[RESEND] Attempting to send to:', to)
  return resend.emails.send({
    from: `Collect & Display <${FROM}>`,
    to,
    replyTo: REPLY_TO,
    subject: `Welcome to collect&display — your account is ready`,
    html: wrap(`
      <h2 style="font-size:20px;font-weight:700;color:#0d1117;margin:0 0 8px">Welcome, ${contactName}! 👋</h2>
      <p style="font-size:14px;color:#666;margin:0 0 24px;line-height:1.6">Your trade account for <strong>${businessName}</strong> has been approved. You can now log in and start ordering.</p>
      <div style="background:#f0fafb;border:1.5px solid #88dde1;border-radius:12px;padding:20px;margin-bottom:20px">
        <div style="margin-bottom:14px">
          <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#888;margin-bottom:4px">Email</div>
          <div style="font-size:14px;color:#0d1117;font-weight:500">${to}</div>
        </div>
        <div>
          <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#888;margin-bottom:6px">Temporary Password</div>
          <div style="font-family:monospace;background:white;padding:10px 14px;border-radius:8px;font-size:16px;color:#1a9da3;font-weight:700;display:inline-block;border:1px solid #e0f0f1">${tempPassword}</div>
        </div>
      </div>
      <p style="font-size:13px;color:#888;margin:0 0 20px">Please change your password after your first login via Account → Security.</p>
      ${btn("Log in now →", loginUrl)}
    `),
  })
}

// ── APPLICATION UPDATE ─────────────────────────────────────────
export async function sendApplicationUpdate({ to, businessName, status, note }: {
  to: string; businessName: string; status: "approved" | "declined"; note?: string
}) {
  const approved = status === "approved"
  console.log('[RESEND] Attempting to send to:', to)
  return resend.emails.send({
    from: `Collect & Display <${FROM}>`,
    to,
    replyTo: REPLY_TO,
    subject: approved ? `Your application has been approved!` : `Update on your application`,
    html: wrap(`
      <h2 style="font-size:20px;font-weight:700;color:#0d1117;margin:0 0 8px">${approved ? "Application approved! 🎉" : "Application update"}</h2>
      <p style="font-size:14px;color:#666;margin:0 0 20px;line-height:1.6">Hi ${businessName}, ${approved
        ? "your trade account application has been approved. You will receive a separate email with your login details shortly."
        : "thank you for applying. Unfortunately we are unable to approve your application at this time."
      }</p>
      ${note ? noteBox(note) : ""}
      ${approved ? btn("Go to Portal →", `${PORTAL_URL}/login`) : ""}
    `),
  })
}

// ── ADMIN NEW ORDER ALERT ──────────────────────────────────────
export async function sendAdminNewOrderAlert({ orderNumber, retailerName, totalPence, itemCount }: {
  orderNumber: string; retailerName: string; totalPence: number; itemCount: number
}) {
  const adminEmail = process.env.ADMIN_EMAIL ?? "bhavik@collectanddisplay.com"
  console.log('[RESEND] Attempting to send admin alert to:', adminEmail)
  return resend.emails.send({
    from: `Collect & Display <${FROM}>`,
    to: adminEmail,
    replyTo: REPLY_TO,
    subject: `New order — ${orderNumber} from ${retailerName}`,
    html: wrap(`
      <h2 style="font-size:18px;font-weight:700;color:#0d1117;margin:0 0 16px">New order received</h2>
      ${infoBox([
        ["Order", orderNumber],
        ["Retailer", retailerName],
        ["Value", fmt(totalPence)],
        ["Lines", String(itemCount)],
      ])}
      ${btn("View in Admin →", `${PORTAL_URL}/admin/orders`)}
    `),
  })
}
