"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShoppingCart, CheckCircle } from "lucide-react";
import { checkoutSchema, type CheckoutInput } from "@/lib/validations";
import { useBasket } from "@/hooks/useBasket";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { formatCurrencyFromPounds } from "@/lib/utils";
import { toast } from "@/components/ui/Toaster";
import type { ApiResponse } from "@/types";
import Link from "next/link";

export default function CheckoutPage() {
  const router = useRouter();
  const { data: basket, isLoading } = useBasket();
  const [submitted, setSubmitted] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
  });

  async function onSubmit(data: CheckoutInput) {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json: ApiResponse<{ orderNumber: string }> = await res.json();

    if (!json.success || !json.data) {
      toast("Order failed", "error");
      return;
    }

    setOrderNumber(json.data.orderNumber);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center max-w-sm flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-emerald/15 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-emerald" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Order placed!</h1>
            <p className="text-sm text-text-muted mt-1">
              Order {orderNumber} has been submitted. You&apos;ll receive a confirmation email shortly.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/orders">
              <Button variant="primary">View Orders</Button>
            </Link>
            <Link href="/stock">
              <Button variant="secondary">Continue Shopping</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm">
        Loading…
      </div>
    );
  }

  if (!basket || basket.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-6">
        <ShoppingCart className="w-8 h-8 text-text-disabled" />
        <div>
          <p className="text-sm font-medium text-text-primary">Your basket is empty</p>
          <p className="text-xs text-text-muted mt-1">Add products before checking out</p>
        </div>
        <Link href="/stock">
          <Button variant="primary">Browse Stock</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xl font-semibold text-text-primary mb-6">Checkout</h1>

      <div className="grid md:grid-cols-[1fr_300px] gap-6">
        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <div className="card p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold">Order Details</h2>

            <Input
              label="PO Reference *"
              placeholder="e.g. PO-2024-001"
              error={errors.poReference?.message}
              hint="Your internal purchase order number"
              {...register("poReference")}
            />

            <Input
              label="Requested Delivery Date"
              type="date"
              error={errors.requestedDeliveryDate?.message}
              hint="We'll do our best to meet your preferred date"
              {...register("requestedDeliveryDate")}
            />

            <Textarea
              label="Delivery Notes"
              placeholder="Special delivery instructions, access notes…"
              rows={3}
              error={errors.deliveryNotes?.message}
              {...register("deliveryNotes")}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            loading={isSubmitting}
            className="w-full"
          >
            Place Order
          </Button>

          <p className="text-xs text-text-muted text-center">
            By placing this order you agree to our{" "}
            <a href="#" className="text-brand hover:underline">
              terms of trade
            </a>
            .
          </p>
        </form>

        {/* Order summary */}
        <div className="card p-5 flex flex-col gap-4 h-fit">
          <h2 className="text-sm font-semibold">
            Summary ({basket.items.length} {basket.items.length === 1 ? "line" : "lines"})
          </h2>

          <div className="flex flex-col gap-2">
            {basket.items.map((item) => (
              <div key={item.id} className="flex justify-between text-xs">
                <span className="text-text-secondary truncate mr-2 flex-1">
                  {item.productName}{" "}
                  <span className="text-text-muted">×{item.quantity}</span>
                </span>
                <span className="text-text-primary font-medium shrink-0">
                  {formatCurrencyFromPounds(item.lineTotalPence)}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-3 flex flex-col gap-1.5">
            <div className="flex justify-between text-xs text-text-secondary">
              <span>Subtotal</span>
              <span>{formatCurrencyFromPounds(basket.subtotalPence)}</span>
            </div>
            <div className="flex justify-between text-xs text-text-secondary">
              <span>VAT (20%)</span>
              <span>{formatCurrencyFromPounds(basket.vatPence)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-text-primary pt-1">
              <span>Total</span>
              <span>{formatCurrencyFromPounds(basket.totalPence)}</span>
            </div>
            <p className="text-[10px] text-text-muted">
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
