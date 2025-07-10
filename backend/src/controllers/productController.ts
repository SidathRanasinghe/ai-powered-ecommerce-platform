import { Request, Response } from "express";
import Product, { IProductImage } from "@/models/Product";
import Review from "@/models/Review";
import { validationResult } from "express-validator";
import s3Utils from "@/utils/s3Utils";
import productUtils from "@/utils/productUtils";

// Get all products with filtering and pagination
export const getProducts = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const page = parseInt(req.query["page"] as string) || 1;
    const limit = parseInt(req.query["limit"] as string) || 12;
    const category = req.query["category"] as string;
    const minPrice = parseFloat(req.query["minPrice"] as string);
    const maxPrice = parseFloat(req.query["maxPrice"] as string);
    const sortBy = (req.query["sortBy"] as string) || "createdAt";
    const sortOrder = req.query["sortOrder"] === "asc" ? 1 : -1;

    const skip = (page - 1) * limit;

    // Build query
    const query: any = { isActive: true };

    if (category) {
      query.category = category;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = minPrice;
      if (maxPrice) query.price.$lte = maxPrice;
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder;

    const products = await Product.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select("-__v");

    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    return res.json({
      success: true,
      data: {
        products,
        pagination: {
          currentPage: page,
          totalPages,
          totalProducts,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get products error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get product by ID
export const getProductById = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { id } = req.params;

    const product = await Product.findOne({ _id: id, isActive: true });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Get product reviews summary
    const reviewStats = await Review.aggregate([
      { $match: { productId: product._id } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: "$rating",
          },
        },
      },
    ]);

    let reviewSummary = {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    };

    if (reviewStats.length > 0) {
      const stats = reviewStats[0];
      reviewSummary.averageRating = Math.round(stats.avgRating * 10) / 10;
      reviewSummary.totalReviews = stats.totalReviews;

      // Calculate rating distribution
      stats.ratingDistribution.forEach((rating: number) => {
        reviewSummary.ratingDistribution[
          rating as keyof typeof reviewSummary.ratingDistribution
        ]++;
      });
    }

    return res.json({
      success: true,
      data: {
        product: {
          ...product.toObject(),
          reviews: reviewSummary,
        },
      },
    });
  } catch (error) {
    console.error("Get product by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Search products
export const searchProducts = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const query = req.query["q"] as string;
    const page = parseInt(req.query["page"] as string) || 1;
    const limit = parseInt(req.query["limit"] as string) || 12;
    const category = req.query["category"] as string;
    const minPrice = parseFloat(req.query["minPrice"] as string);
    const maxPrice = parseFloat(req.query["maxPrice"] as string);

    const skip = (page - 1) * limit;

    // Build search query
    const searchQuery: any = { isActive: true };

    if (query) {
      searchQuery.$or = [
        { name: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { brand: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } },
        { tags: { $in: [new RegExp(query, "i")] } },
      ];
    }

    if (category) {
      searchQuery.category = category;
    }

    if (minPrice || maxPrice) {
      searchQuery.price = {};
      if (minPrice) searchQuery.price.$gte = minPrice;
      if (maxPrice) searchQuery.price.$lte = maxPrice;
    }

    const products = await Product.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-__v");

    const totalProducts = await Product.countDocuments(searchQuery);
    const totalPages = Math.ceil(totalProducts / limit);

    return res.json({
      success: true,
      data: {
        products,
        searchQuery: query,
        pagination: {
          currentPage: page,
          totalPages,
          totalProducts,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Search products error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get products by category
export const getProductsByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const page = parseInt(req.query["page"] as string) || 1;
    const limit = parseInt(req.query["limit"] as string) || 12;

    const skip = (page - 1) * limit;

    const products = await Product.find({ category, isActive: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-__v");

    const totalProducts = await Product.countDocuments({
      category,
      isActive: true,
    });
    const totalPages = Math.ceil(totalProducts / limit);

    res.json({
      success: true,
      data: {
        products,
        category,
        pagination: {
          currentPage: page,
          totalPages,
          totalProducts,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get products by category error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Create new product
export const createProduct = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const {
      name,
      description,
      price,
      category,
      brand,
      sku,
      stock,
      weight,
      dimensions,
      tags,
      specifications,
      variants,
    } = req.body;

    // Generate SKU if not provided
    const productSKU = sku || productUtils.generateSku(name, category, brand);

    // Check if SKU already exists
    const existingProduct = await Product.findOne({ sku: productSKU });
    if (existingProduct) {
      return res.status(409).json({
        success: false,
        message: "Product with this SKU already exists",
      });
    }

    const product = new Product({
      name,
      description,
      price,
      category,
      brand,
      sku: productSKU,
      stock,
      weight,
      dimensions,
      tags,
      specifications,
      variants,
      isActive: true,
      createdAt: new Date(),
    });

    await product.save();

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: {
        product,
      },
    });
  } catch (error) {
    console.error("Create product error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Update product
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if SKU is being updated and doesn't conflict
    if (updateData.sku && updateData.sku !== product.sku) {
      const existingProduct = await Product.findOne({ sku: updateData.sku });
      if (existingProduct) {
        return res.status(409).json({
          success: false,
          message: "Product with this SKU already exists",
        });
      }
    }

    // Update product
    Object.assign(product, updateData);
    product.updatedAt = new Date();
    await product.save();

    return res.json({
      success: true,
      message: "Product updated successfully",
      data: {
        product,
      },
    });
  } catch (error) {
    console.error("Update product error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Delete product
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Soft delete - set isActive to false
    product.isActive = false;
    product.updatedAt = new Date();
    await product.save();

    return res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Upload product images
export const uploadProductImages = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Upload images to S3
    const uploadPromises = files.map((file) =>
      s3Utils.uploadProductImage(file, id)
    );

    const uploadResults = await Promise.all(uploadPromises);
    // const imageUrls = uploadResults.map((result) => result.location);

    // Convert upload results to IProductImage objects if needed
    const newImages: IProductImage[] = uploadResults
      .map((result) => {
        if (typeof result === "string") {
          return { url: result };
        } else if (result && typeof result.location === "string") {
          return { url: result.location };
        }
        return undefined;
      })
      .filter((img): img is IProductImage => !!img);

    // Update product with new images
    product.images = [...(product.images || []), ...newImages];
    product.updatedAt = new Date();
    await product.save();

    return res.json({
      success: true,
      message: "Images uploaded successfully",
      data: {
        // images: imageUrls,
        images: newImages,
        product: {
          id: product._id,
          images: product.images,
        },
      },
    });
  } catch (error) {
    console.error("Upload product images error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get product reviews
export const getProductReviews = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const page = parseInt(req.query["page"] as string) || 1;
    const limit = parseInt(req.query["limit"] as string) || 10;

    const skip = (page - 1) * limit;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const reviews = await Review.find({ productId: id })
      .populate("userId", "firstName lastName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalReviews = await Review.countDocuments({ productId: id });
    const totalPages = Math.ceil(totalReviews / limit);

    return res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          currentPage: page,
          totalPages,
          totalReviews,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get product reviews error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Add product review
export const addProductReview = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { rating, comment } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const review = new Review({
      userId: req.user!.id,
      productId: id,
      rating,
      comment,
    });

    await review.save();

    return res.status(201).json({
      success: true,
      message: "Review added successfully",
      data: {
        review,
      },
    });
  } catch (error) {
    console.error("Add product review error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update product review
export const updateProductReview = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { rating, comment } = req.body;

    const review = await Review.findOne({ _id: id, userId: req.user!.id });
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    review.rating = rating;
    review.comment = comment;
    review.updatedAt = new Date();
    await review.save();

    return res.json({
      success: true,
      message: "Review updated successfully",
      data: {
        review,
      },
    });
  } catch (error) {
    console.error("Update product review error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Delete product review
export const deleteProductReview = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { id } = req.params;

    const review = await Review.findOneAndDelete({
      _id: id,
      userId: req.user!.id,
    });
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    return res.json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Delete product review error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Get all products (for management dashboard)
export const getAllProductsAdmin = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query["page"] as string) || 1;
    const limit = parseInt(req.query["limit"] as string) || 20;

    const skip = (page - 1) * limit;

    const products = await Product.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-__v");

    const totalProducts = await Product.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          currentPage: page,
          totalPages,
          totalProducts,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get all products admin error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Get product details for management
export const getProductDetailsAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.json({
      success: true,
      data: {
        product,
      },
    });
  } catch (error) {
    console.error("Get product details admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Activate/Deactivate product
export const toggleProductActiveStatus = async (
  req: Request,
  res: Response
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { isActive } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.isActive = isActive;
    await product.save();

    return res.json({
      success: true,
      message: "Product status updated successfully",
      data: {
        product,
      },
    });
  } catch (error) {
    console.error("Toggle product active status error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Delete product images
export const deleteProductImages = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { imageUrls } = req.body;

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No images provided for deletion",
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Delete images from S3
    // const deletePromises = imageUrls.map((url) => s3Utils.deleteProductImage(url));
    // await Promise.all(deletePromises);
    await s3Utils.deleteMultipleProductImages(imageUrls);

    // Remove images from product
    product.images = product.images.filter((img) => !imageUrls.includes(img));
    await product.save();

    return res.json({
      success: true,
      message: "Product images deleted successfully",
      data: {
        images: product.images,
      },
    });
  } catch (error) {
    console.error("Delete product images error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Get product variants
export const getProductVariants = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.json({
      success: true,
      data: {
        variants: product.variants || [],
      },
    });
  } catch (error) {
    console.error("Get product variants error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Add product variant
export const addProductVariant = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { variant } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.variants.push(variant);
    await product.save();

    return res.json({
      success: true,
      message: "Product variant added successfully",
      data: {
        variant,
      },
    });
  } catch (error) {
    console.error("Add product variant error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Update product variant
export const updateProductVariant = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { id, variantId } = req.params;
    const { variant } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const existingVariantIndex = product.variants.findIndex(
      (v) => v?._id?.toString() === variantId
    );
    if (existingVariantIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Variant not found",
      });
    }

    product.variants[existingVariantIndex] = variant;
    await product.save();

    return res.json({
      success: true,
      message: "Product variant updated successfully",
      data: {
        variant,
      },
    });
  } catch (error) {
    console.error("Update product variant error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Delete product variant
export const deleteProductVariant = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { id, variantId } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const existingVariantIndex = product.variants.findIndex(
      (v) => v?._id?.toString() === variantId
    );
    if (existingVariantIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Variant not found",
      });
    }

    product.variants.splice(existingVariantIndex, 1);
    await product.save();

    return res.json({
      success: true,
      message: "Product variant deleted successfully",
    });
  } catch (error) {
    console.error("Delete product variant error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Get product stock levels
export const getProductStockLevels = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.json({
      success: true,
      data: {
        stock: product.inventory.quantity,
      },
    });
  } catch (error) {
    console.error("Get product stock levels error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Update product stock levels
export const updateProductStockLevels = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { stock } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.inventory.quantity = stock;
    await product.save();

    return res.json({
      success: true,
      message: "Product stock levels updated successfully",
      data: {
        stock: product.inventory.quantity,
      },
    });
  } catch (error) {
    console.error("Update product stock levels error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Get product sales data
// export const getProductSalesData = async (req: Request, res: Response) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         success: false,
//         message: "Validation failed",
//         errors: errors.array(),
//       });
//     }

//     const { id } = req.params;

//     const product = await Product.findById(id);
//     if (!product) {
//       return res.status(404).json({
//         success: false,
//         message: "Product not found",
//       });
//     }

//     // Assuming sales data is stored in a separate Sales model
//     const salesData = await Sales.find({ productId: id })
//       .select("date quantity totalPrice")
//       .sort({ date: -1 });

//     return res.json({
//       success: true,
//       data: {
//         salesData,
//       },
//     });
//   } catch (error) {
//     console.error("Get product sales data error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// };

// Admin: Get product inventory history
// export const getProductInventoryHistory = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         success: false,
//         message: "Validation failed",
//         errors: errors.array(),
//       });
//     }

//     const { id } = req.params;

//     const product = await Product.findById(id);
//     if (!product) {
//       return res.status(404).json({
//         success: false,
//         message: "Product not found",
//       });
//     }

//     // Assuming inventory history is stored in a separate InventoryHistory model
//     const inventoryHistory = await InventoryHistory.find({ productId: id })
//       .select("date change quantity")
//       .sort({ date: -1 });

//     return res.json({
//       success: true,
//       data: {
//         inventoryHistory,
//       },
//     });
//   } catch (error) {
//     console.error("Get product inventory history error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// };

// Admin: Get product tags
export const getProductTags = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.json({
      success: true,
      data: {
        tags: product.tags,
      },
    });
  } catch (error) {
    console.error("Get product tags error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Add product tag
export const addProductTag = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { tag } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.tags.push(tag);
    await product.save();

    return res.json({
      success: true,
      message: "Product tag added successfully",
      data: {
        tags: product.tags,
      },
    });
  } catch (error) {
    console.error("Add product tag error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
