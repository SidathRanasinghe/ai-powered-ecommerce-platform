"use client";

import { useQuery } from "react-query";
import { productsApi } from "@/lib/api/products";
import { ProductCard } from "@/components/product/product-card";
import { ProductCardSkeleton } from "@/components/product/product-card-skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function FeaturedProducts() {
  const { data, isLoading, error } = useQuery(
    "featured-products",
    () => productsApi.getFeaturedProducts(),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  if (error) {
    return (
      <section className="py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Featured Products</h2>
          <p className="text-muted-foreground">
            Unable to load featured products. Please try again later.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Featured Products
          </h2>
          <p className="text-muted-foreground mt-2">
            Discover our handpicked selection of amazing products
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/products">
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))
          : data?.data?.products?.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
      </div>
    </section>
  );
}
