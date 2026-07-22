import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { sendWelcomeEmail } from "@/lib/email"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = req.nextUrl
    const page = parseInt(searchParams.get("page") ?? "1")
    const limit = parseInt(searchParams.get("limit") ?? "20")
    const search = searchParams.get("search") ?? undefined

    const where: any = search ? {
      OR: [
        { businessName: { contains: search, mode: "insensitive" } },
        { contactName: { contains: search, mode: "insensitive" } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ],
    } : {}

    const [total, retailers] = await Promise.all([
      prisma.retailer.count({ where }),
      prisma.retailer.findMany({
        where,
        orderBy: { businessName: "asc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, email: true, isActive: true, createdAt: true, lastSeenAt: true } },
          addresses: true,
          _count: { select: { orders: true } },
        },
      }),
    ])

    return NextResponse.json({ data: retailers, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error("[GET /api/retailers]", error)
    return NextResponse.json({ error: "Failed to fetch retailers" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { email, businessName, contactName, phone, vatNumber, pricingTier, paymentTerms, creditLimitPence, address } = body

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 })

    const tempPassword = Math.random().toString(36).slice(-8) + "A1!"
    const passwordHash = await bcrypt.hash(tempPassword, 12)

    const retailer = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: email.toLowerCase(), passwordHash, role: "RETAILER", isActive: true },
      })
      const r = await tx.retailer.create({
        data: {
          userId: user.id,
          businessName,
          contactName,
          phone: phone ?? null,
          vatNumber: vatNumber ?? null,
          pricingTier: pricingTier ?? "STANDARD",
          paymentTerms: paymentTerms ?? "PROFORMA",
          creditLimitPence: creditLimitPence ?? null,
          addresses: address ? {
            create: {
              line1: address.line1,
              line2: address.line2 ?? null,
              city: address.city,
              county: address.county ?? null,
              postcode: address.postcode,
              country: address.country ?? "GB",
              isDefault: true,
            },
          } : undefined,
        },
      })
      return { ...r, user, tempPassword }
    })

    sendWelcomeEmail({
      to: email,
      businessName,
      contactName,
      tempPassword,
      loginUrl: `${process.env.NEXTAUTH_URL}/login`,
    }).catch(console.error)

    return NextResponse.json({ success: true, data: retailer }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/retailers]", error)
    return NextResponse.json({ error: "Failed to create retailer" }, { status: 500 })
  }
}
