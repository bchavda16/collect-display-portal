"use client";

import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toaster";
import { cn } from "@/lib/utils";
import type { ApiResponse, BulkImportPreview } from "@/types";

export default function AdminImportsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<BulkImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    processed: number;
    failed: number;
    importId: string;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(f: File) {
    setFile(f);
    setPreview(null);
    setResult(null);

    const fd = new FormData();
    fd.append("file", f);
    fd.append("mode", "preview");

    const res = await fetch("/api/imports", { method: "POST", body: fd });
    const json: ApiResponse<BulkImportPreview> = await res.json();

    if (!json.success || !json.data) {
      toast({ type: "error", title: "Preview failed", description: json.error });
      return;
    }

    setPreview(json.data);
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("mode", "import");

    const res = await fetch("/api/imports", { method: "POST", body: fd });
    const json: ApiResponse<{ processed: number; failed: number; importId: string }> =
      await res.json();

    setImporting(false);

    if (!json.success || !json.data) {
      toast({ type: "error", title: "Import failed", description: json.error });
      return;
    }

    setResult(json.data);
    setPreview(null);
    toast({
      type: "success",
      title: "Import complete",
      description: `${json.data.processed} products imported`,
    });
  }

  return (
    <div className="p-6 flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Bulk Import</h1>
        <p className="text-sm text-text-muted mt-0.5">
          Upload a CSV to add or update products in bulk
        </p>
      </div>

      {/* CSV format guide */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold mb-2">Required CSV Columns</h2>
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr className="border-b border-border">
                {["Column", "Example", "Notes"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-text-muted font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["sku", "PMD-001", "Unique identifier"],
                ["name", "Dimoo Space Travel Series", "Product name"],
                ["brand", "Pop Mart", "Brand name (auto-created)"],
                ["type", "BLIND_BOX", "BLIND_BOX, VINYL_FIGURE, PLUSH, ACCESSORIES"],
                ["unitcost", "4.50", "Ex-VAT unit cost in £"],
                ["rrp", "12.99", "Recommended retail price in £"],
                ["cdusize", "12", "Units per CDU"],
                ["stock", "144", "Current stock in units"],
              ].map(([col, ex, note]) => (
                <tr key={col}>
                  <td className="px-3 py-2 font-mono text-brand">{col}</td>
                  <td className="px-3 py-2 text-text-secondary">{ex}</td>
                  <td className="px-3 py-2 text-text-muted">{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drop zone */}
      {!preview && !result && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all",
            dragging
              ? "border-brand bg-brand/5"
              : "border-border hover:border-border-strong hover:bg-bg-elevated"
          )}
        >
          <Upload className={cn("w-8 h-8", dragging ? "text-brand" : "text-text-muted")} />
          <div className="text-center">
            <p className="text-sm font-medium text-text-primary">
              {dragging ? "Drop to upload" : "Drop CSV file here"}
            </p>
            <p className="text-xs text-text-muted mt-0.5">or click to browse</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="flex flex-col gap-4">
          <div className="card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-text-muted" />
                <span className="text-sm font-medium text-text-primary">{file?.name}</span>
              </div>
              <button
                onClick={() => { setFile(null); setPreview(null); }}
                className="text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-bg-elevated rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-text-primary">{preview.totalRows}</p>
                <p className="text-xs text-text-muted">Total rows</p>
              </div>
              <div className="bg-emerald/10 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-emerald">{preview.validRows}</p>
                <p className="text-xs text-text-muted">Valid</p>
              </div>
              <div className={cn("rounded-lg p-3 text-center", preview.invalidRows > 0 ? "bg-rose/10" : "bg-bg-elevated")}>
                <p className={cn("text-lg font-bold", preview.invalidRows > 0 ? "text-rose" : "text-text-muted")}>
                  {preview.invalidRows}
                </p>
                <p className="text-xs text-text-muted">Errors</p>
              </div>
            </div>

            {preview.errors.length > 0 && (
              <div className="bg-rose/5 border border-rose/20 rounded-lg p-3 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose" />
                  <span className="text-xs font-medium text-rose">Row errors</span>
                </div>
                {preview.errors.slice(0, 5).map((err) => (
                  <p key={err.row} className="text-xs text-text-secondary">
                    Row {err.row}: {err.message}
                  </p>
                ))}
                {preview.errors.length > 5 && (
                  <p className="text-xs text-text-muted">
                    +{preview.errors.length - 5} more errors
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => { setFile(null); setPreview(null); }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              loading={importing}
              disabled={preview.validRows === 0}
            >
              Import {preview.validRows} Products
            </Button>
          </div>
        </div>
      )}

      {/* Success result */}
      {result && (
        <div className="card p-6 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald/15 flex items-center justify-center">
            <CheckCircle className="w-7 h-7 text-emerald" />
          </div>
          <div>
            <p className="text-base font-semibold text-text-primary">Import complete</p>
            <p className="text-sm text-text-muted mt-1">
              {result.processed} products imported successfully
              {result.failed > 0 && `, ${result.failed} failed`}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => { setFile(null); setResult(null); }}
          >
            Import another file
          </Button>
        </div>
      )}
    </div>
  );
}
