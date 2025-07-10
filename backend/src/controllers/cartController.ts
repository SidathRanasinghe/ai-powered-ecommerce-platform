import { Request, Response } from "express";
import Cart from "@/models/Cart";
import Product from "@/models/Product";
import Coupon from "@/models/Coupon";
import { validationResult } from "express-validator";

// Get user's cart
export const getCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    let cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      model: "Product",
      select: "name price images stock isActive",
    });

    if (!cart) {
      cart = new Cart({ userId, items: [] });
      await cart.save();
    }

    // Calculate totals
    let subtotal = 0;
    const validItems = cart.items.filter((item: any) => {
      if (!item.productId || !item.productId.isActive) {
        return false;
      }
      const itemTotal = item.productId.price * item.quantity;
      subtotal += itemTotal;
      return true;
    });

    // Update cart with valid items only
    if (validItems.length !== cart.items.length) {
      cart.items = validItems;
      await cart.save();
    }

    // Apply coupon discount if exists
    let discount = 0;
    let couponDetails = null;

    if (cart.couponCode) {
      const coupon = await Coupon.findOne({
        code: cart.couponCode,
        isActive: true,
        expiresAt: { $gt: new Date() },
      });

      if (coupon) {
        if (coupon.discountType === "percentage") {
          discount = (subtotal * coupon.discountValue) / 100;
        } else if (coupon.discountType === "fixed") {
          discount = Math.min(coupon.discountValue, subtotal);
        }

        if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
          discount = coupon.maxDiscountAmount;
        }

        couponDetails = {
          code: coupon.code,
          type: coupon.discountType,
          value: coupon.discountValue,
          discount,
        };
      } else {
        // Invalid coupon, remove it
        cart.couponCode = undefined;
        await cart.save();
      }
    }

    const total = subtotal - discount;

    res.json({
      success: true,
      data: {
        cart: {
          id: cart._id,
          items: cart.items,
          subtotal,
          discount,
          total,
          coupon: couponDetails,
          itemCount: cart.items.length,
        },
      },
    });
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Add item to cart
export const addToCart = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const userId = req.user!.id;
    const { productId, quantity, variant } = req.body;

    // Check if product exists and is active
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: "Product not found or inactive",
      });
    }

    // Check stock availability
    if (product.inventory.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: "Insufficient stock available",
      });
    }

    // Get or create cart
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      (item: any) =>
        item.productId.toString() === productId &&
        JSON.stringify(item.variant) === JSON.stringify(variant)
    );

    if (existingItemIndex > -1) {
      // Update existing item quantity
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;

      if (newQuantity > product.inventory.quantity) {
        return res.status(400).json({
          success: false,
          message: "Cannot add more items than available stock",
        });
      }

      cart.items[existingItemIndex].quantity = newQuantity;
      cart.items[existingItemIndex].updatedAt = new Date();
    } else {
      // Add new item to cart
      cart.items.push({
        productId,
        quantity,
        variantId: variant._id,
        addedAt: new Date(),
        updatedAt: new Date(),
        price: variant.price || product.price,
        total: (variant.price || product.price) * quantity,
      });
    }

    await cart.save();

    // Populate product details for response
    await cart.populate({
      path: "items.productId",
      model: "Product",
      select: "name price images stock isActive",
    });

    return res.json({
      success: true,
      message: "Item added to cart successfully",
      data: {
        cart: {
          id: cart._id,
          items: cart.items,
          itemCount: cart.items.length,
        },
      },
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update cart item quantity
export const updateCartItem = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const userId = req.user!.id;
    const { itemId } = req.params;
    const { quantity } = req.body;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const itemIndex = cart.items.findIndex(
      (item: any) => item._id.toString() === itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart",
      });
    }

    // Check product stock
    const product = await Product.findById(cart.items[itemIndex].productId);
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: "Product not found or inactive",
      });
    }

    if (product.inventory.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: "Insufficient stock available",
      });
    }

    // Update item quantity
    cart.items[itemIndex].quantity = quantity;
    cart.items[itemIndex].updatedAt = new Date();

    await cart.save();

    // Populate product details for response
    await cart.populate({
      path: "items.productId",
      model: "Product",
      select: "name price images stock isActive",
    });

    return res.json({
      success: true,
      message: "Cart item updated successfully",
      data: {
        cart: {
          id: cart._id,
          items: cart.items,
          itemCount: cart.items.length,
        },
      },
    });
  } catch (error) {
    console.error("Update cart item error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Remove item from cart
export const removeFromCart = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const userId = req.user!.id;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const itemIndex = cart.items.findIndex(
      (item: any) => item._id.toString() === itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart",
      });
    }

    // Remove item from cart
    cart.items.splice(itemIndex, 1);
    await cart.save();

    // Populate product details for response
    await cart.populate({
      path: "items.productId",
      model: "Product",
      select: "name price images stock isActive",
    });

    return res.json({
      success: true,
      message: "Item removed from cart successfully",
      data: {
        cart: {
          id: cart._id,
          items: cart.items,
          itemCount: cart.items.length,
        },
      },
    });
  } catch (error) {
    console.error("Remove from cart error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Clear entire cart
export const clearCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    // Clear all items and coupon
    cart.items = [];
    cart.couponCode = undefined;
    await cart.save();

    return res.json({
      success: true,
      message: "Cart cleared successfully",
      data: {
        cart: {
          id: cart._id,
          items: [],
          itemCount: 0,
        },
      },
    });
  } catch (error) {
    console.error("Clear cart error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Apply coupon to cart
export const applyCoupon = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const userId = req.user!.id;
    const { couponCode } = req.body;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    if (cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot apply coupon to empty cart",
      });
    }

    // Find and validate coupon
    const coupon = await Coupon.findOne({
      code: couponCode.toUpperCase(),
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (!coupon) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired coupon code",
      });
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({
        success: false,
        message: "Coupon usage limit exceeded",
      });
    }

    // Apply coupon to cart
    cart.couponCode = coupon.code;
    await cart.save();

    return res.json({
      success: true,
      message: "Coupon applied successfully",
      data: {
        coupon: {
          code: coupon.code,
          type: coupon.discountType,
          value: coupon.discountValue,
          description: coupon.description,
        },
      },
    });
  } catch (error) {
    console.error("Apply coupon error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Remove coupon from cart
export const removeCoupon = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    cart.couponCode = undefined;
    await cart.save();

    return res.json({
      success: true,
      message: "Coupon removed successfully",
    });
  } catch (error) {
    console.error("Remove coupon error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
