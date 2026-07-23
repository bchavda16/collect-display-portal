import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? "orders@collectanddisplay.com"
const REPLY_TO = process.env.REPLY_TO ?? "bhavik@collectanddisplay.com"
const PORTAL_URL = process.env.NEXTAUTH_URL ?? "https://portal.collectanddisplay.com"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { productIds, message } = await req.json()
  if (!productIds?.length) return NextResponse.json({ error: "Select at least one product" }, { status: 400 })

  // Get featured products
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { brand: true, images: { take: 1 } },
  })

  // Get all active retailers
  const retailers = await prisma.retailer.findMany({
    where: { user: { isActive: true } },
    include: { user: { select: { email: true } } },
  })

  if (!retailers.length) return NextResponse.json({ error: "No active retailers found" }, { status: 400 })

  const fmt = (p: number) => `£${(p / 100).toFixed(2)}`

  const productCards = products.map(p => {
    const imgUrl = p.images?.[0]?.url
    return `
      <td style="width:33%;padding:0 5px;vertical-align:top">
        <div style="border:1px solid #e0f0f1;border-radius:10px;overflow:hidden">
          ${imgUrl
            ? `<img src="${imgUrl}" alt="${p.name}" style="width:100%;height:110px;object-fit:contain;background:#f0fafb;display:block" />`
            : `<div style="height:110px;background:#f0fafb;display:flex;align-items:center;justify-content:center;font-size:32px">🎁</div>`
          }
          <div style="padding:10px">
            <div style="font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#88dde1;margin-bottom:4px;font-family:system-ui,sans-serif">${p.brand?.name ?? ""}</div>
            <div style="font-size:12px;font-weight:600;color:#0d1117;line-height:1.3;margin-bottom:6px;font-family:system-ui,sans-serif">${p.name}</div>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:12px;font-weight:700;color:#1a9da3;font-family:system-ui,sans-serif">${fmt(p.unitCostPence)}/unit</span>
              <span style="font-size:10px;color:#0EA572;background:#EAFAF3;padding:2px 7px;border-radius:99px;font-family:system-ui,sans-serif">In stock</span>
            </div>
          </div>
        </div>
      </td>`
  }).join("")

  let sent = 0
  let failed = 0

  for (const retailer of retailers) {
    try {
      await resend.emails.send({
        from: `Collect & Display <${FROM}>`,
        to: retailer.user.email,
        replyTo: REPLY_TO,
        subject: `New stock just landed — ${products.map(p => p.brand?.name ?? p.name).filter((v,i,a)=>a.indexOf(v)===i).slice(0,3).join(", ")}`,
        html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f0fafb;font-family:system-ui,sans-serif">
<div style="max-width:580px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;border:1px solid #e0f0f1">

  <div style="background:#080c14;padding:22px 28px">
    <div style="font-size:18px;font-weight:700;color:white;letter-spacing:-.3px">collect<span style="color:#88dde1">&amp;</span>display</div>
    <div style="font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-top:3px">Distribution Portal</div>
  </div>

  <div style="padding:28px">
    <div style="display:inline-block;background:#e6f9fa;color:#1a9da3;font-size:11px;font-weight:700;padding:4px 12px;border-radius:99px;letter-spacing:.04em;margin-bottom:16px">New stock alert</div>
    <h2 style="font-size:20px;font-weight:700;color:#0d1117;margin:0 0 8px">New lines just landed</h2>
    <p style="font-size:13px;color:#666;margin:0 0 20px;line-height:1.6">Hi ${retailer.businessName}, ${message || "we've just added new products to the portal. Log in to browse availability and place your order."}</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
      <tr style="margin:0 -5px">
        ${productCards}
      </tr>
    </table>

    <div style="background:#f0fafb;border-radius:10px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between">
      <div>
        <div style="font-size:13px;font-weight:600;color:#0d1117;margin-bottom:2px">Browse all available stock</div>
        <div style="font-size:12px;color:#888">Log in to see full pricing and place your order</div>
      </div>
    </div>

    <div style="text-align:center;margin-bottom:8px">
      <a href="${PORTAL_URL}/stock" style="display:inline-block;padding:12px 32px;background:#88dde1;color:#0a1420;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:.02em">View all stock →</a>
    </div>

    <p style="font-size:12px;color:#888;margin:16px 0 0;line-height:1.6;text-align:center">Stock moves fast — log in to secure your order. Reply to this email if you have any questions.</p>
  </div>

  <div style="padding:16px 28px;background:#f8fafb;border-top:1px solid #e0f0f1;text-align:center">
    <p style="font-size:11px;color:#aaa;margin:0">Collect &amp; Display · <a href="${PORTAL_URL}" style="color:#88dde1;text-decoration:none">portal.collectanddisplay.com</a></p>
  </div>

</div>
</body></html>`,
      })
      sent++
    } catch {
      failed++
    }
  }

  return NextResponse.json({ success: true, sent, failed, total: retailers.length })
}
