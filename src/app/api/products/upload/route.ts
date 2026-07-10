import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin, BUCKETS } from "@/lib/supabase"
import prisma from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get("image") as File | null
  const productId = formData.get("productId") as string | null

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
  if (!productId) return NextResponse.json({ error: "No productId provided" }, { status: 400 })

  const allowed = ["image/jpeg", "image/png", "image/webp"]
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Only JPG, PNG and WebP are accepted" }, { status: 400 })
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 })
  }

  const ext = file.type.split("/")[1]
  const path = `products/${productId}/${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabaseAdmin.storage
    .from(BUCKETS.PRODUCT_IMAGES)
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from(BUCKETS.PRODUCT_IMAGES)
    .getPublicUrl(path)

  // Delete old images for this product then create new one
  await prisma.productImage.deleteMany({ where: { productId } })
  await prisma.productImage.create({
    data: { productId, url: publicUrl, isPrimary: true, sortOrder: 0 }
  })

  return NextResponse.json({ success: true, url: publicUrl })
}
