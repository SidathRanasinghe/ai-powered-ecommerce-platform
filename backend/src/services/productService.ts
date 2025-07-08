import Product, { IProduct } from "../models/Product";
import redisClient from "../config/redis";

export class ProductService {
  async getProducts(
    filters: any = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{
    products: IProduct[];
    total: number;
    pages: number;
  }> {
    const cacheKey = `products:${JSON.stringify(filters)}:${page}:${limit}`;

    // Try cache first
    const cachedResult = await redisClient.getCache(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const query = Product.find(filters)
      .populate("category", "name slug")
      .populate("vendor", "firstName lastName")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const [products, total] = await Promise.all([
      query.exec(),
      Product.countDocuments(filters),
    ]);

    const result = {
      products,
      total,
      pages: Math.ceil(total / limit),
    };

    // Cache result for 10 minutes
    await redisClient.setCache(cacheKey, result, 600);

    return result;
  }

  async getProductBySlug(slug: string): Promise<IProduct | null> {
    const cacheKey = `product:slug:${slug}`;

    // Try cache first
    const cachedProduct = await redisClient.getCache(cacheKey);
    if (cachedProduct) {
      return cachedProduct;
    }

    const product = await Product.findOne({ "seo.slug": slug, isActive: true })
      .populate("category", "name slug")
      .populate("vendor", "firstName lastName");

    if (product) {
      await redisClient.setCache(cacheKey, product, 1800); // 30 minutes
    }

    return product;
  }

  async updateProductInventory(
    productId: string,
    quantity: number
  ): Promise<IProduct | null> {
    const product = await Product.findByIdAndUpdate(
      productId,
      {
        "inventory.quantity": quantity,
        "inventory.stockStatus": quantity > 0 ? "in_stock" : "out_of_stock",
      },
      { new: true }
    );

    if (product) {
      // Clear product cache
      await redisClient.deleteCachePattern(`product:*${productId}*`);
      await redisClient.deleteCachePattern(`products:*`);
    }

    return product;
  }
}
