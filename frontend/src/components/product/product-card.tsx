"use client";

import type React from "react";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/lib/types";
import {
  formatPrice,
  getImageUrl,
  calculateDiscountPercentage,
} from "@/lib/utils";
import { useCartStore } from "@/lib/store/cart";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { addItem, isLoading } = useCartStore();

  const primaryImage =
    product.images?.find((img) => img.isPrimary) || product.images?.[0];
  const imageUrl = primaryImage
    ? getImageUrl(primaryImage.url)
    : "/placeholder.svg?height=300&width=300";

  const hasDiscount =
    product.comparePrice && product.comparePrice > product.price;
  const discountPercentage = hasDiscount
    ? calculateDiscountPercentage(product.comparePrice!, product.price)
    : 0;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await addItem(product, 1);
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
  };

  return (
    <Link href={`/products/${product._id}`}>
      <Card
        className={cn(
          "group hover:shadow-lg transition-all duration-200 hover:-translate-y-1",
          className
        )}
      >
        <CardContent className="p-0">
          {/* Image Container */}
          <div className="relative aspect-square overflow-hidden rounded-t-lg">
            <Image
              src={
                imageError ? "/placeholder.svg?height=300&width=300" : imageUrl
              }
              alt={primaryImage?.alt || product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
              onError={() => setImageError(true)}
            />

            {/* Badges */}
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {hasDiscount && (
                <Badge variant="destructive" className="text-xs">
                  -{discountPercentage}%
                </Badge>
              )}
              {product.isFeatured && (
                <Badge variant="secondary" className="text-xs">
                  Featured
                </Badge>
              )}
              {product.inventory.stockStatus === "limited_stock" && (
                <Badge
                  variant="outline"
                  className="text-xs bg-orange-100 text-orange-800"
                >
                  Limited Stock
                </Badge>
              )}
            </div>

            {/* Wishlist Button */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/80 hover:bg-white"
              onClick={handleWishlistToggle}
            >
              <Heart
                className={cn(
                  "h-4 w-4",
                  isWishlisted && "fill-red-500 text-red-500"
                )}
              />
            </Button>

            {/* Quick Add to Cart */}
            <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                className="w-full"
                onClick={handleAddToCart}
                disabled={
                  isLoading || product.inventory.stockStatus === "out_of_stock"
                }
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                {product.inventory.stockStatus === "out_of_stock"
                  ? "Out of Stock"
                  : "Add to Cart"}
              </Button>
            </div>
          </div>

          {/* Product Info */}
          <div className="p-4">
            <div className="space-y-2">
              {/* Brand */}
              {product.brand && (
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  {product.brand}
                </p>
              )}

              {/* Name */}
              <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                {product.name}
              </h3>

              {/* Rating */}
              {product.averageRating > 0 && (
                <div className="flex items-center space-x-1">
                  <div className="flex items-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-3 w-3",
                          i < Math.floor(product.averageRating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    ({product.totalReviews})
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg">
                  {formatPrice(product.price, product.currency)}
                </span>
                {hasDiscount && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatPrice(product.comparePrice!, product.currency)}
                  </span>
                )}
              </div>

              {/* Short Description */}
              {product.shortDescription && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {product.shortDescription}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
