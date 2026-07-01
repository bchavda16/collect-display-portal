"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { BasketSummary, ApiResponse } from "@/types";
import { toast } from "@/components/ui/Toaster";

const BASKET_KEY = ["basket"];

async function fetchBasket(): Promise<BasketSummary> {
  const res = await fetch("/api/basket");
  const data: ApiResponse<BasketSummary> = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data!;
}

export function useBasket() {
  return useQuery({
    queryKey: BASKET_KEY,
    queryFn: fetchBasket,
    staleTime: 10 * 1000,
  });
}

export function useAddToBasket() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      quantity,
    }: {
      productId: string;
      quantity: number;
    }) => {
      const res = await fetch("/api/basket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity }),
      });
      const data: ApiResponse<BasketSummary> = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data!;
    },
    onSuccess: (data) => {
      qc.setQueryData(BASKET_KEY, data);
      toast({ type: "success", title: "Added to basket" });
    },
    onError: (err: Error) => {
      toast({ type: "error", title: "Failed to add to basket", description: err.message });
    },
  });
}

export function useUpdateBasketItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      quantity,
    }: {
      productId: string;
      quantity: number;
    }) => {
      const res = await fetch("/api/basket", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity }),
      });
      const data: ApiResponse<BasketSummary> = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data!;
    },
    onSuccess: (data) => {
      qc.setQueryData(BASKET_KEY, data);
    },
    onError: (err: Error) => {
      toast({ type: "error", title: "Failed to update basket", description: err.message });
    },
  });
}

export function useClearBasket() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/basket", { method: "DELETE" });
      const data: ApiResponse<null> = await res.json();
      if (!data.success) throw new Error(data.error);
    },
    onSuccess: () => {
      qc.setQueryData(BASKET_KEY, {
        items: [],
        subtotalPence: 0,
        vatPence: 0,
        totalPence: 0,
        totalUnits: 0,
        totalCDUs: 0,
        itemCount: 0,
      });
    },
  });
}
