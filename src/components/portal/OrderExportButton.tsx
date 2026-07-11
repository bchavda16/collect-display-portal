"use client"
import * as XLSX from "xlsx"

interface OrderItem {
  productName: string
  sku: string
  quantity: number
  unitCostPence: number
  lineTotalPence: number
  rrpPence?: number
}

interface Props {
  orderNumber: string
  items: OrderItem[]
}

export function OrderExportButton({ orderNumber, items }: Props) {
  const handleExport = () => {
    const rows = items.map(item => ({
      "Order Number": orderNumber,
      "Product Name": item.productName,
      "SKU Number": item.sku,
      "Quantity": item.quantity,
      "Unit Price (£)": (item.unitCostPence / 100).toFixed(2),
      "Retail Price / RRP (£)": item.rrpPence ? (item.rrpPence / 100).toFixed(2) : "—",
      "Line Total (£)": (item.lineTotalPence / 100).toFixed(2),
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    ws["!cols"] = [
      { wch: 14 },
      { wch: 40 },
      { wch: 16 },
      { wch: 10 },
      { wch: 14 },
      { wch: 20 },
      { wch: 14 },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Order")
    XLSX.writeFile(wb, `${orderNumber}.xlsx`)
  }

  return (
    <button onClick={handleExport} style={{
      display:"inline-flex",alignItems:"center",gap:6,
      padding:"8px 16px",background:"white",
      border:"1px solid rgba(0,0,0,.12)",borderRadius:8,
      fontSize:13,fontWeight:500,color:"#1A1A2E",cursor:"pointer",
      transition:"all .15s",
    }}
    onMouseEnter={e=>{e.currentTarget.style.borderColor="#F0A3BC";e.currentTarget.style.color="#C4638A"}}
    onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(0,0,0,.12)";e.currentTarget.style.color="#1A1A2E"}}
    >
      📥 Export to Excel
    </button>
  )
}
