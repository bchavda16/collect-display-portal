// ============================================================
// collect&display Portal — Email Service (Resend)
// ============================================================

import { Resend } from "resend";
import type { EmailTemplate } from "@/types";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = `${process.env.EMAIL_FROM_NAME ?? "collect&display"} <${process.env.EMAIL_FROM ?? "orders@collectanddisplay.com"}>`;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@collectanddisplay.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// ── Template builders ────────────────────────────────────────

function baseTemplate(content: string, title: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 40px 20px; }
    .container { max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #0B0B17, #1C1C3A); padding: 32px; text-align: center; }
    .brand { color: #fff; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
    .brand span { color: #E8334A; }
    .body { padding: 32px; }
    h1 { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 8px; }
    p { color: #475569; line-height: 1.6; font-size: 15px; margin: 0 0 16px; }
    .btn { display: inline-block; background: #E8334A; color: #fff; text-decoration: none; padding: 13px 28px; border-radius: 9px; font-weight: 700; font-size: 14px; margin: 8px 0; }
    .info-box { background: #f8fafc; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    .info-row:last-child { border-bottom: none; }
    .label { color: #64748b; }
    .value { font-weight: 600; color: #0f172a; }
    .footer { background: #f8fafc; padding: 20px 32px; text-align: center; color: #94a3b8; font-size: 12px; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">collect<span>&amp;</span>display</div>
      <div style="color:rgba(255,255,255,0.5);font-size:11px;margin-top:4px;letter-spacing:0.1em;text-transform:uppercase">Distribution Portal</div>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p style="margin:0 0 4px">${process.env.COMPANY_NAME ?? "Collect and Display Ltd"}</p>
      <p style="margin:0">${process.env.COMPANY_ADDRESS_LINE1 ?? ""} · ${process.env.COMPANY_POSTCODE ?? ""}</p>
      <p style="margin:8px 0 0"><a href="${APP_URL}" style="color:#E8334A">collectanddisplay.com</a></p>
    </div>
  </div>
</body>
</html>`;
}

// ── Email senders ────────────────────────────────────────────

export async function sendOrderConfirmation(data: {
  to: string;
  retailerName: string;
  orderNumber: string;
  poReference: string;
  items: { productName: string; sku: string; quantity: number; unitCostPence: number; lineTotalPence: number }[];
  subtotalPence: number;
  vatPence: number;
  totalPence: number;
  poReference?: string | null;
}) {
  const itemRows = data.items
    .map(
      (i) => `
    <div class="info-row">
      <span class="label">${i.productName} × ${i.quantity} CDU</span>
      <span class="value">£${i.lineTotal.toFixed(2)}</span>
    </div>`
    )
    .join("");

  const html = baseTemplate(
    `
    <h1>Order Confirmed ✓</h1>
    <p>Hi ${data.retailerName}, your order has been received and is being processed.</p>
    <div class="info-box">
      <div class="info-row"><span class="label">Order Number</span><span class="value">${data.orderNumber}</span></div>
      <div class="info-row"><span class="label">PO Reference</span><span class="value">${data.poReference}</span></div>
    </div>
    <div class="info-box">
      ${itemRows}
      <div class="info-row"><span class="label">Subtotal (ex-VAT)</span><span class="value">£${data.subtotalPence.toFixed(2)}</span></div>
      <div class="info-row"><span class="label">VAT (20%)</span><span class="value">£${data.vatPence.toFixed(2)}</span></div>
      <div class="info-row"><span class="label" style="font-weight:700">Total</span><span class="value" style="color:#E8334A;font-size:16px">£${data.totalPence.toFixed(2)}</span></div>
    </div>
    <a href="${APP_URL}/orders" class="btn">View Your Order →</a>
    <p style="margin-top:20px;font-size:13px;color:#94a3b8">We'll send you another email when your order is dispatched.</p>
  `,
    `Order ${data.orderNumber} Confirmed`
  );

  return resend.emails.send({
    from: FROM,
    to: data.to,
    subject: `Order ${data.orderNumber} confirmed — collect&display`,
    html,
  });
}

export async function sendStatusUpdate(data: {
  to: string;
  retailerName: string;
  orderNumber: string;
  status: string;
  statusLabel: string;
  trackingNumber?: string;
  trackingUrl?: string;
}) {
  const trackingSection =
    data.trackingNumber
      ? `<div class="info-box">
          <div class="info-row"><span class="label">Courier</span><span class="value">${data.trackingNumber}</span></div>
          ${data.trackingUrl ? `<div style="margin-top:12px"><a href="${data.trackingUrl}" class="btn">Track Your Parcel →</a></div>` : ""}
        </div>`
      : "";

  const html = baseTemplate(
    `
    <h1>Order Update</h1>
    <p>Hi ${data.retailerName}, your order <strong>${data.orderNumber}</strong> has been updated.</p>
    <div class="info-box">
      <div class="info-row"><span class="label">Status</span><span class="value">${data.statusLabel}</span></div>
    </div>
    ${trackingSection}
    <a href="${APP_URL}/orders" class="btn">View Order →</a>
  `,
    `Order ${data.orderNumber} Update`
  );

  return resend.emails.send({
    from: FROM,
    to: data.to,
    subject: `Order ${data.orderNumber}: ${data.statusLabel} — collect&display`,
    html,
  });
}

export async function sendInvoiceNotification(data: {
  to: string;
  retailerName: string;
  orderNumber: string;
  invoiceUrl: string;
  grandTotal: number;
}) {
  const html = baseTemplate(
    `
    <h1>Invoice Ready</h1>
    <p>Hi ${data.retailerName}, your invoice for order <strong>${data.orderNumber}</strong> is now available.</p>
    <div class="info-box">
      <div class="info-row"><span class="label">Amount Due</span><span class="value" style="color:#E8334A;font-size:16px">£${data.totalPence.toFixed(2)}</span></div>
    </div>
    <a href="${data.invoiceUrl}" class="btn">Download Invoice →</a>
    <a href="${APP_URL}/orders" style="display:inline-block;margin-left:12px;color:#E8334A;text-decoration:none;font-size:14px">View in Portal →</a>
  `,
    `Invoice for ${data.orderNumber}`
  );

  return resend.emails.send({
    from: FROM,
    to: data.to,
    subject: `Invoice ready for order ${data.orderNumber} — collect&display`,
    html,
  });
}

export async function sendPasswordReset(data: {
  to: string;
  name: string;
  resetUrl: string;
}) {
  const html = baseTemplate(
    `
    <h1>Reset Your Password</h1>
    <p>Hi ${data.name}, we received a request to reset the password for your collect&display account.</p>
    <p>Click the button below to set a new password. This link expires in 1 hour.</p>
    <a href="${data.resetUrl}" class="btn">Reset Password →</a>
    <p style="margin-top:24px;font-size:13px;color:#94a3b8">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
  `,
    "Reset your password"
  );

  return resend.emails.send({
    from: FROM,
    to: data.to,
    subject: "Reset your collect&display password",
    html,
  });
}

export async function sendWelcomeEmail(data: {
  to: string;
  businessName: string;
  tempPassword: string;
}) {
  const html = baseTemplate(
    `
    <h1>Welcome to collect&display 🎉</h1>
    <p>Hi ${data.businessName}, your wholesale account is ready.</p>
    <div class="info-box">
      <div class="info-row"><span class="label">Email</span><span class="value">${data.to}</span></div>
      <div class="info-row"><span class="label">Temporary Password</span><span class="value">${data.tempPassword}</span></div>
    </div>
    <p>Please sign in and change your password immediately.</p>
    <a href="${APP_URL}/login" class="btn">Sign In to Portal →</a>
  `,
    "Welcome to collect&display"
  );

  return resend.emails.send({
    from: FROM,
    to: data.to,
    subject: "Your collect&display wholesale account is ready",
    html,
  });
}

export async function sendAdminNewOrderAlert(data: {
  orderNumber: string;
  retailerName: string;
  grandTotal: number;
  itemCount: number;
}) {
  const html = baseTemplate(
    `
    <h1>New Order Received</h1>
    <div class="info-box">
      <div class="info-row"><span class="label">Order</span><span class="value">${data.orderNumber}</span></div>
      <div class="info-row"><span class="label">Retailer</span><span class="value">${data.retailerName}</span></div>
      <div class="info-row"><span class="label">Items</span><span class="value">${data.itemCount} lines</span></div>
      <div class="info-row"><span class="label">Total</span><span class="value" style="color:#E8334A">£${data.totalPence.toFixed(2)}</span></div>
    </div>
    <a href="${APP_URL}/admin/orders" class="btn">View in Admin →</a>
  `,
    `New Order ${data.orderNumber}`
  );

  return resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `New order ${data.orderNumber} — ${data.retailerName}`,
    html,
  });
}
