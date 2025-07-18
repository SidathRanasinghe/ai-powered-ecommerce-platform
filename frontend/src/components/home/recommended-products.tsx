"use client";

import { useQuery } from "react-query";
import { productsApi } from "@/lib/api/products";
import { ProductCard } from "@/components/product/product-card";
import { ProductCardSkeleton } from "@/components/product/product-card-skeleton";
import { useAuthStore } from "@/lib/store/auth";
import { Sparkles } from "lucide-react";

export function RecommendedProducts() {
  const { user, isAuthenticated } = useAuthStore();

  const { data, isLoading, error } = useQuery(
    ["recommendations", user?._id],
    () =>
      productsApi.getRecommendations(isAuthenticated ? user?._id : undefined),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      enabled: true, // Always fetch, even for non-authenticated users
    }
  );

  if (error || !data?.data?.products?.length) {
    return null;
  }

  return (
    <section className="py-12">
      <div className="flex items-center mb-8">
        <Sparkles className="h-6 w-6 text-primary mr-3" />
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {isAuthenticated ? "Recommended for You" : "Popular Products"}
          </h2>
          <p className="text-muted-foreground mt-2">
            {isAuthenticated
              ? "Personalized recommendations based on your preferences"
              : "Trending products loved by our customers"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))
          : data.data.products
              .slice(0, 4)
              .map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
      </div>
    </section>
  );
}
