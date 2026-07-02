import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

    const { searchParams } = req.nextUrl
    const page = parseInt(searchParams.get("page") ?? "1")
    const limit = parseInt(searchParams.get("limit") ?? "20")
    const search = searchParams.get("search") ?? undefined
    const type = searchParams.get("type") ?? undefined
    const status = searchParams.get("status") ?? undefined
    const inStock = searchParams.get("inStock") === "true"
    const brandId = searchParams.get("brandId") ?? undefined

    const where: any = {}

    if (status) {
      where.status = status
    } else if (inStock) {
      where.status = "ACTIVE"
      where.stockUnits = { gt: 0 }
    } else {
      where.status = { not: "DISCONTINUED" }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { brand: { name: { contains: search, mode: "insensitive" } } },
      ]
    }
    if (brandId) where.brandId = brandId
    if (type && type !== "ALL") where.productType = type

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { brand: true, images: { take: 1 } },
      }),
    ])

    return NextResponse.json({ data: products, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error("[GET /api/products]", error)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()

    // Find or create brand
    let brand = await prisma.brand.findFirst({ where: { name: { equals: body.brandName, mode: "insensitive" } } })
    if (!brand && body.brandName) {
      brand = await prisma.brand.create({
        data: { name: body.brandName, slug: body.brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-") },
      })
    }

    const existing = await prisma.product.findUnique({ where: { sku: body.sku } })
    if (existing) return NextResponse.json({ error: "SKU already exists" }, { status: 409 })

    const product = await prisma.product.create({
      data: {
        name: body.name,
        sku: body.sku,
        description: body.description ?? null,
        brandId: brand?.id ?? body.brandId,
        productType: body.productType ?? "BLIND_BOX",
        unitCostPence: body.unitCostPence,
        cduSize: body.cduSize,
        rrpPence: body.rrpPence,
        stockUnits: body.stockUnits ?? 0,
        badges: body.badges ?? [],
      },
      include: { brand: true, images: true },
    })

    return NextResponse.json({ success: true, data: product }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/products]", error)
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}
