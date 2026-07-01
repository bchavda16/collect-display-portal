import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { supabaseAdmin, BUCKETS, uploadFile, getSignedUrl } from '@/lib/supabase'
import { sendInvoiceNotification } from '@/lib/email'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      retailerId: true,
      invoicePath: true,
      invoiceNumber: true,
      retailer: { select: { user: { select: { email: true } }, businessName: true } },
    },
  })

  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Retailers can only access their own orders
  if (session.user.role !== 'ADMIN' && order.retailerId !== session.user.retailerId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!order.invoicePath) {
    return NextResponse.json({ error: 'No invoice available yet' }, { status: 404 })
  }

  // Return a signed URL valid for 1 hour
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKETS.INVOICES)
    .createSignedUrl(order.invoicePath, 3600)

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
  }

  return NextResponse.json({
    url: data.signedUrl,
    invoiceNumber: order.invoiceNumber,
    expiresIn: 3600,
  })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      retailer: { include: { user: true } },
    },
  })

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('invoice') as File | null
  const invoiceNumber = formData.get('invoiceNumber') as string | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File must be under 10MB' }, { status: 400 })
  }

  // Delete old invoice if one exists
  if (order.invoicePath) {
    await supabaseAdmin.storage.from(BUCKETS.INVOICES).remove([order.invoicePath])
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const path = `${order.orderNumber}/invoice-${Date.now()}.pdf`

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKETS.INVOICES)
    .upload(path, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ error: 'Upload failed', detail: uploadError.message }, { status: 500 })
  }

  // Update order record
  const updated = await prisma.order.update({
    where: { id: params.id },
    data: {
      invoicePath: path,
      ...(invoiceNumber && { invoiceNumber }),
    },
  })

  // Send notification email to retailer
  try {
    await sendInvoiceNotification({
      to: order.retailer.user.email,
      businessName: order.retailer.businessName,
      orderNumber: order.orderNumber,
      invoiceNumber: invoiceNumber ?? order.orderNumber,
    })
  } catch (emailErr) {
    // Don't fail the request if email fails
    console.error('Invoice notification email failed:', emailErr)
  }

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'INVOICE_UPLOADED',
      entityType: 'Order',
      entityId: params.id,
      metadata: { path, invoiceNumber },
    },
  })

  return NextResponse.json({ success: true, invoicePath: path, invoiceNumber: updated.invoiceNumber })
}
