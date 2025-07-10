import { IProduct, IProductReview } from "@/models/Product";
import { IReview } from "@/models/Review";

export interface ProductFilter {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  inStock?: boolean;
  rating?: number;
  minRating?: number;
  tags?: string[];
}

export interface ProductSort {
  field: "price" | "rating" | "createdAt" | "name" | "popularity";
  order: "asc" | "desc";
}

export interface ProductSearchOptions {
  query?: string;
  filters?: ProductFilter;
  sort?: ProductSort;
  page?: number;
  limit?: number;
}

export interface ProductSearchResult {
  products: IProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PriceRange {
  min: number;
  max: number;
}

export interface ProductStats {
  totalProducts: number;
  totalValue: number;
  averagePrice: number;
  lowStockCount: number;
  outOfStockCount: number;
  categoryCounts: Record<string, number>;
  brandCounts: Record<string, number>;
}

class ProductUtils {
  // Calculate product rating
  calculateRating(reviews: IReview[]): { average: number; count: number } {
    if (!reviews || reviews.length === 0) {
      return { average: 0, count: 0 };
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const average = Math.round((totalRating / reviews.length) * 10) / 10;

    return {
      average,
      count: reviews.length,
    };
  }

  // Check if product is in stock
  isInStock(product: IProduct): boolean {
    return product.inventory.quantity > 0;
  }

  // Check if product is low stock
  isLowStock(product: IProduct, threshold: number = 10): boolean {
    return (
      product.inventory.quantity > 0 && product.inventory.quantity <= threshold
    );
  }

  // Calculate discount percentage
  calculateDiscountPercentage(
    originalPrice: number,
    salePrice: number
  ): number {
    if (originalPrice <= salePrice) return 0;
    return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
  }

  // Format price
  formatPrice(price: number, currency: string = "USD"): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(price);
  }

  // Generate product slug
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }

  // Generate product SKU
  generateSku(name: string, category: string, brand: string): string {
    const slug = this.generateSlug(name);
    const timestamp = Date.now().toString(36); // Base36 timestamp
    return `${slug}-${category.toLowerCase()}-${brand.toLowerCase()}-${timestamp}`;
  }

  // Validate product data
  validateProduct(productData: Partial<IProduct>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!productData.name || productData.name.trim().length === 0) {
      errors.push("Product name is required");
    }

    if (
      !productData.description ||
      productData.description.trim().length === 0
    ) {
      errors.push("Product description is required");
    }

    if (!productData.price || productData.price <= 0) {
      errors.push("Product price must be greater than 0");
    }

    if (
      !productData.category ||
      (typeof productData.category === "string" &&
        (productData.category as string).trim().length === 0)
    ) {
      errors.push("Product category is required");
    }

    if (
      productData.inventory !== undefined &&
      productData.inventory.quantity < 0
    ) {
      errors.push("Stock cannot be negative");
    }

    if (productData.images && productData.images.length === 0) {
      errors.push("At least one product image is required");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Build search query
  buildSearchQuery(options: ProductSearchOptions): any {
    const query: any = {};

    // Text search
    if (options.query) {
      query.$or = [
        { name: { $regex: options.query, $options: "i" } },
        { description: { $regex: options.query, $options: "i" } },
        { tags: { $in: [new RegExp(options.query, "i")] } },
      ];
    }

    // Filters
    if (options.filters) {
      const { category, minPrice, maxPrice, brand, inStock, rating, tags } =
        options.filters;

      if (category) {
        query.category = category;
      }

      if (minPrice !== undefined || maxPrice !== undefined) {
        query.price = {};
        if (minPrice !== undefined) query.price.$gte = minPrice;
        if (maxPrice !== undefined) query.price.$lte = maxPrice;
      }

      if (brand) {
        query.brand = brand;
      }

      if (inStock !== undefined) {
        query.stock = inStock ? { $gt: 0 } : { $eq: 0 };
      }

      if (rating !== undefined) {
        query.rating = { $gte: rating };
      }

      if (tags && tags.length > 0) {
        query.tags = { $in: tags };
      }
    }

    return query;
  }

  // Build sort query
  buildSortQuery(sort?: ProductSort): any {
    if (!sort) {
      return { createdAt: -1 }; // Default sort by creation date
    }

    const sortQuery: any = {};
    for (const [key, order] of Object.entries(sort)) {
      sortQuery[key] = order === "asc" ? 1 : -1;
    }

    return sortQuery;
  }

  // Get price range for products
  getPriceRange(products: IProduct[]): { min: number; max: number } {
    if (products.length === 0) {
      return { min: 0, max: 0 };
    }

    const prices = products.map((product) => product.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }

  // Get product stats
  getProductStats(products: IProduct[]): {
    total: number;
    inStock: number;
    outOfStock: number;
  } {
    return products.reduce(
      (acc, product) => {
        acc.total += 1;
        if (product.inventory.quantity > 0) {
          acc.inStock += 1;
        } else {
          acc.outOfStock += 1;
        }
        return acc;
      },
      { total: 0, inStock: 0, outOfStock: 0 }
    );
  }

  // Get product categories
  getProductCategories(products: IProduct[]): string[] {
    const categories = new Set<string>();
    products.forEach((product) => {
      if (product.category) {
        categories.add(product.category.toString());
      }
    });
    return Array.from(categories);
  }

  // Get product brands
  getProductBrands(products: IProduct[]): string[] {
    const brands = new Set<string>();
    products.forEach((product) => {
      if (product.brand) {
        brands.add(product.brand);
      }
    });
    return Array.from(brands);
  }

  // Get product tags
  getProductTags(products: IProduct[]): string[] {
    const tags = new Set<string>();
    products.forEach((product) => {
      if (product.tags && product.tags.length > 0) {
        product.tags.forEach((tag) => tags.add(tag));
      }
    });
    return Array.from(tags);
  }

  // Get product by slug
  getProductBySlug(products: IProduct[], slug: string): IProduct | undefined {
    return products.find((product) => product.seo.slug === slug);
  }

  // Get products by category
  getProductsByCategory(products: IProduct[], category: string): IProduct[] {
    return products.filter(
      (product) => product.category?.toString() === category
    );
  }

  // Get products by brand
  getProductsByBrand(products: IProduct[], brand: string): IProduct[] {
    return products.filter((product) => product.brand === brand);
  }

  // Get products by tag
  getProductsByTag(products: IProduct[], tag: string): IProduct[] {
    return products.filter(
      (product) => product.tags && product.tags.includes(tag)
    );
  }

  // Get products by price range
  getProductsByPriceRange(
    products: IProduct[],
    minPrice: number,
    maxPrice: number
  ): IProduct[] {
    return products.filter(
      (product) => product.price >= minPrice && product.price <= maxPrice
    );
  }

  // Get products by rating
  getProductsByRating(products: IProduct[], minRating: number): IProduct[] {
    return products.filter((product) => {
      const totalRating = product.reviews.reduce(
        (acc, review) =>
          acc + (typeof review.rating === "number" ? review.rating : 0),
        0
      );
      const averageRating =
        product.reviews.length > 0 ? totalRating / product.reviews.length : 0;
      return averageRating >= minRating;
    });
  }

  // Get products in stock
  getProductsInStock(products: IProduct[]): IProduct[] {
    return products.filter((product) => product.inventory.quantity > 0);
  }

  // Get products out of stock
  getProductsOutOfStock(products: IProduct[]): IProduct[] {
    return products.filter((product) => product.inventory.quantity === 0);
  }

  // Get products by multiple filters
  getProductsByFilters(
    products: IProduct[],
    filters: ProductFilter
  ): IProduct[] {
    let filteredProducts = products;

    if (filters.category) {
      filteredProducts = this.getProductsByCategory(
        filteredProducts,
        filters.category
      );
    }

    if (filters.brand) {
      filteredProducts = this.getProductsByBrand(
        filteredProducts,
        filters.brand
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      filteredProducts = this.getProductsByTag(
        filteredProducts,
        filters.tags[0]
      );
    }

    if (filters.minPrice !== undefined && filters.maxPrice !== undefined) {
      filteredProducts = this.getProductsByPriceRange(
        filteredProducts,
        filters.minPrice,
        filters.maxPrice
      );
    }

    if (filters.minRating !== undefined) {
      filteredProducts = this.getProductsByRating(
        filteredProducts,
        filters.minRating
      );
    }

    return filteredProducts;
  }

  // Get products with pagination
  getProductsWithPagination(
    products: IProduct[],
    page: number,
    limit: number
  ): IProduct[] {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    return products.slice(startIndex, endIndex);
  }

  // Get paginated search results
  getPaginatedSearchResults(
    products: IProduct[],
    page: number,
    limit: number
  ): IProduct[] {
    return this.getProductsWithPagination(products, page, limit);
  }

  // Get all products
  getAllProducts(products: IProduct[]): IProduct[] {
    return products;
  }

  // Get product by ID
  getProductById(products: IProduct[], id: string): IProduct | undefined {
    return products.find((product) => product.id === id);
  }

  // Get product reviews
  getProductReviews(
    products: IProduct[],
    id: string
  ): IProductReview[] | undefined {
    const product = this.getProductById(products, id);
    return product ? product.reviews : undefined;
  }

  // Add product review
  addProductReview(
    products: IProduct[],
    id: string,
    review: IProductReview
  ): IProduct | undefined {
    const product = this.getProductById(products, id);
    if (product) {
      product.reviews.push(review);
      return product;
    }
    return undefined;
  }

  // Update product review
  updateProductReview(
    products: IProduct[],
    id: string,
    reviewId: string,
    updatedReview: IReview
  ): IProduct | undefined {
    const product = this.getProductById(products, id);
    if (product) {
      const reviewIndex = product.reviews.findIndex(
        (review) => review._id.toString() === reviewId
      );
      if (reviewIndex !== -1) {
        product.reviews[reviewIndex] = {
          ...updatedReview,
          user: product.reviews[reviewIndex].user,
        };
        return product;
      }
    }
    return undefined;
  }

  // Delete product review
  deleteProductReview(
    products: IProduct[],
    id: string,
    reviewId: string
  ): IProduct | undefined {
    const product = this.getProductById(products, id);
    if (product) {
      product.reviews = product.reviews.filter(
        (review) => review._id.toString() !== reviewId
      );
      return product;
    }
    return undefined;
  }

  // Get product image URLs
  getProductImageUrls(products: IProduct[], id: string): string[] | undefined {
    const product = this.getProductById(products, id);
    return product
      ? product.images.map((img) => (typeof img === "string" ? img : img.url))
      : undefined;
  }

  // Get product image by index
  getProductImageByIndex(
    products: IProduct[],
    id: string,
    index: number
  ): string | undefined {
    const product = this.getProductById(products, id);
    if (product && product.images[index]) {
      const img = product.images[index];
      return typeof img === "string" ? img : img.url;
    }
    return undefined;
  }

  // Get product image count
  getProductImageCount(products: IProduct[], id: string): number | undefined {
    const product = this.getProductById(products, id);
    return product ? product.images.length : undefined;
  }
}

export default new ProductUtils();
