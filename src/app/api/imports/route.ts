import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { rows, preview } = body

    if (!rows || !Array.isArray(rows)) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 })
    }

    const results = { valid: 0, invalid: 0, errors: [] as string[] }

    for (const row of rows) {
      if (!row.sku || !row.name || !row.unit_cost || !row.cdu_size || !row.rrp) {
        results.invalid++
        results.errors.push(`Row ${row._rowNum ?? "?"}: Missing required fields (sku, name, unit_cost, cdu_size, rrp)`)
      } else {
        results.valid++
      }
    }

    if (preview) return NextResponse.json({ preview: true, ...results })

    // Import valid rows
    let imported = 0
    for (const row of rows) {
      if (!row.sku || !row.name || !row.unit_cost) continue
      try {
        let brand = null
        if (row.brand) {
          brand = await prisma.brand.upsert({
            where: { slug: row.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-") },
            update: { name: row.brand },
            create: { name: row.brand, slug: row.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-") },
          })
        }

        await prisma.product.upsert({
          where: { sku: row.sku },
          update: {
            name: row.name,
            unitCostPence: Math.round(parseFloat(row.unit_cost) * 100),
            rrpPence: Math.round(parseFloat(row.rrp) * 100),
            stockUnits: parseInt(row.stock ?? "0"),
          },
          create: {
            sku: row.sku,
            name: row.name,
            description: row.description ?? null,
            brandId: brand?.id ?? (await prisma.brand.findFirst({ orderBy: { createdAt: "asc" } }))!.id,
            productType: row.type?.toUpperCase().replace(/\s+/g, "_") ?? "BLIND_BOX",
            unitCostPence: Math.round(parseFloat(row.unit_cost) * 100),
            cduSize: parseInt(row.cdu_size ?? "6"),
            rrpPence: Math.round(parseFloat(row.rrp) * 100),
            stockUnits: parseInt(row.stock ?? "0"),
            badges: [],
          },
        })
        imported++
      } catch (e) {
        results.errors.push(`Failed to import ${row.sku}: ${(e as Error).message}`)
      }
    }

    return NextResponse.json({ success: true, imported, ...results })
  } catch (error) {
    console.error("[POST /api/imports]", error)
    return NextResponse.json({ error: "Import failed" }, { status: 500 })
  }
}
