import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server";


import { prisma } from "@/lib/prisma";
import { bulkImportRowSchema } from "@/lib/validations";
import { uploadFile, BUCKETS } from "@/lib/supabase";
import type { ApiResponse, BulkImportPreview } from "@/types";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const mode = (formData.get("mode") as string) ?? "preview"; // preview | import

    if (!file) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".csv")) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Only CSV files are supported" },
        { status: 400 }
      );
    }

    const text = await file.text();
    const lines = text.split("\n").filter(Boolean);
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

    const expectedHeaders = ["sku", "name", "brand", "type", "unitcost", "rrp", "cdusize", "stock"];
    const missingHeaders = expectedHeaders.filter(
      (h) => !headers.some((fh) => fh.replace(/\s+/g, "").includes(h.replace(/\s+/g, "")))
    );

    if (missingHeaders.length > 0) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: `Missing required columns: ${missingHeaders.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const rows = [];
    const errors: { row: number; message: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] ?? "";
      });

      const parsed = bulkImportRowSchema.safeParse({
        sku: row.sku,
        name: row.name,
        brand: row.brand,
        type: row.type?.toUpperCase().replace(" ", "_") ?? "BLIND_BOX",
        unitCost: row.unitcost ?? row["unit cost"],
        rrp: row.rrp,
        cduSize: row.cdusize ?? row["cdu size"],
        stock: row.stock,
        status: row.status?.toUpperCase() ?? "ACTIVE",
      });

      if (parsed.success) {
        rows.push({ rowNumber: i + 1, data: parsed.data });
      } else {
        errors.push({
          row: i + 1,
          message: parsed.error.errors.map((e) => e.message).join("; "),
        });
      }
    }

    if (mode === "preview") {
      const preview: BulkImportPreview = {
        totalRows: lines.length - 1,
        validRows: rows.length,
        invalidRows: errors.length,
        errors,
        sample: rows.slice(0, 5).map((r) => r.data),
      };
      return NextResponse.json<ApiResponse<BulkImportPreview>>({
        success: true,
        data: preview,
      });
    }

    // Upload file to Supabase
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const filePath = `imports/${Date.now()}-${file.name}`;
    const fileUrl = await uploadFile(BUCKETS.IMPORTS, filePath, fileBuffer, "text/csv");

    // Create import record
    const importRecord = await prisma.bulkImport.create({
      data: {
        filename: file.name,
        fileUrl,
        totalRows: lines.length - 1,
        validRows: rows.length,
        invalidRows: errors.length,
        status: "PROCESSING",
        createdById: session.user.id,
      },
    });

    // Process valid rows
    let processed = 0;
    let failed = 0;

    for (const { rowNumber, data } of rows) {
      try {
        // Get or create brand
        const brand = await prisma.brand.upsert({
          where: { slug: data.brand.toLowerCase().replace(/\s+/g, "-") },
          update: {},
          create: {
            name: data.brand,
            slug: data.brand.toLowerCase().replace(/\s+/g, "-"),
          },
        });

        await prisma.product.upsert({
          where: { sku: data.sku },
          update: {
            name: data.name,
            brandId: brand.id,
            unitCostPence: Math.round(data.unitCost * 100),
            rrpPence: Math.round(data.rrp * 100),
            cduSize: data.cduSize,
            stockUnits: data.stock,
          },
          create: {
            sku: data.sku,
            name: data.name,
            brandId: brand.id,
            type: data.type as never,
            unitCostPence: Math.round(data.unitCost * 100),
            rrpPence: Math.round(data.rrp * 100),
            cduSize: data.cduSize,
            stockUnits: data.stock,
            status: (data.status as never) ?? "ACTIVE",
          },
        });

        await prisma.bulkImportRow.create({
          data: {
            importId: importRecord.id,
            rowNumber,
            status: "SUCCESS",
            data: data as never,
          },
        });

        processed++;
      } catch (err) {
        await prisma.bulkImportRow.create({
          data: {
            importId: importRecord.id,
            rowNumber,
            status: "FAILED",
            error: err instanceof Error ? err.message : "Unknown error",
            data: data as never,
          },
        });
        failed++;
      }
    }

    await prisma.bulkImport.update({
      where: { id: importRecord.id },
      data: {
        status: failed === 0 ? "COMPLETED" : "PARTIAL",
        processedRows: processed,
        failedRows: failed,
        completedAt: new Date(),
      },
    });

    return NextResponse.json<ApiResponse<{ importId: string; processed: number; failed: number }>>(
      {
        success: true,
        data: { importId: importRecord.id, processed, failed },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/imports]", error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Import failed" },
      { status: 500 }
    );
  }
}
