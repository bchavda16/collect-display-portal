import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? "bhavik@collectanddisplay.com"
const REPLY_TO = process.env.REPLY_TO ?? "bhavik@collectanddisplay.com"
const PORTAL_URL = process.env.NEXTAUTH_URL ?? "https://portal.collectanddisplay.com"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { userId, retailerName } = await req.json()
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const tempPassword = Math.random().toString(36).slice(-6).toUpperCase() + Math.random().toString(36).slice(-4) + "1!"
  const hash = await bcrypt.hash(tempPassword, 12)

  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } })

  await resend.emails.send({
    from: `Collect & Display <${FROM}>`,
    to: user.email,
    replyTo: REPLY_TO,
    subject: "Your password has been reset",
    html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;background:#f0fafb;font-family:system-ui,sans-serif">
<div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;border:1px solid #e0f0f1">
  <div style="background:#080c14;padding:22px 28px">
    <div style="font-size:18px;font-weight:700;color:white">collect<span style="color:#88dde1">&amp;</span>display</div>
    <div style="font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.35);margin-top:3px">Distribution Portal</div>
  </div>
  <div style="padding:28px">
    <h2 style="font-size:20px;font-weight:700;color:#0d1117;margin:0 0 8px">Password reset</h2>
    <p style="font-size:13px;color:#666;margin:0 0 20px;line-height:1.6">Hi ${retailerName ?? user.email}, your password has been reset. Use the temporary password below to log in, then change it from Account → Security.</p>
    <div style="background:#f0fafb;border:1.5px solid #88dde1;border-radius:12px;padding:20px;margin-bottom:20px">
      <div style="margin-bottom:12px">
        <div style="font-size:11px;color:#888;margin-bottom:2px">Email</div>
        <div style="font-size:14px;font-weight:500;color:#0d1117">${user.email}</div>
      </div>
      <div>
        <div style="font-size:11px;color:#888;margin-bottom:6px">Temporary password</div>
        <div style="font-family:monospace;background:white;padding:10px 14px;border-radius:8px;font-size:20px;color:#1a9da3;font-weight:700;border:1px solid #e0f0f1;letter-spacing:.1em">${tempPassword}</div>
      </div>
    </div>
    <p style="font-size:12px;color:#888;margin:0 0 20px">Please change this password as soon as you log in.</p>
    <div style="text-align:center">
      <a href="${PORTAL_URL}/login" style="display:inline-block;padding:12px 32px;background:#88dde1;color:#0a1420;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none">Log in now →</a>
    </div>
  </div>
  <div style="padding:16px 28px;background:#f8fafb;border-top:1px solid #e0f0f1;text-align:center">
    <p style="font-size:11px;color:#aaa;margin:0">Collect &amp; Display · <a href="${PORTAL_URL}" style="color:#88dde1;text-decoration:none">portal.collectanddisplay.com</a></p>
  </div>
</div>
</body></html>`,
  })

  return NextResponse.json({ success: true, tempPassword })
}
