import { Request, Response } from "express";
import Order from "@/models/Order";
import Cart from "@/models/Cart";
import Product from "@/models/Product";
import Coupon from "@/models/Coupon";
import User from "@/models/User";
import { validationResult } from "express-validator";
import emailService from "@/services/emailService";
import orderUtils from "@/utils/orderUtils";
import paymentUtils from "@/utils/paymentUtils";

// Create new order
export const createOrder = async (req: Request, res: Response) => {
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
    const { shippingAddress, paymentMethod, paymentIntentId } = req.body;

    // Get user's cart
    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      model: "Product",
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    // Validate stock availability for all items
    const stockErrors = [];
    let subtotal = 0;

    for (const item of cart.items) {
      const product = item.productId as any;

      if (!product || !product.isActive) {
        stockErrors.push(
          `Product ${product?.name || "Unknown"} is not available`
        );
        continue;
      }

      if (product.stock < item.quantity) {
        stockErrors.push(
          `Insufficient stock for ${product.name}. Available: ${product.stock}`
        );
        continue;
      }

      subtotal += product.price * item.quantity;
    }

    if (stockErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Stock validation failed",
        errors: stockErrors,
      });
    }

    // Apply coupon discount if exists
    let discount = 0;
    let couponUsed = null;

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

        couponUsed = {
          code: coupon.code,
          type: coupon.discountType,
          value: coupon.discountValue,
          discount,
        };

        // Increment coupon usage count
        coupon.usedCount += 1;
        await coupon.save();
      }
    }

    const total = subtotal - discount;

    // Generate order number
    const orderNumber = orderUtils.generateOrderNumber();

    // Create order items
    const orderItems = cart.items.map((item: any) => ({
      productId: item.productId._id,
      productName: item.productId.name,
      productImage: item.productId.images?.[0] || "",
      quantity: item.quantity,
      price: item.productId.price,
      variant: item.variant,
      total: item.productId.price * item.quantity,
    }));

    // Create order
    const order = new Order({
      userId,
      orderNumber,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      paymentIntentId,
      subtotal,
      discount,
      total,
      coupon: couponUsed,
      status: "pending",
      createdAt: new Date(),
    });

    // Process payment if not cash on delivery
    if (paymentMethod !== "cash_on_delivery") {
      try {
        const paymentIntent = await paymentUtils.processPayment(
          paymentIntentId,
          total,
          "usd"
        );

        if (!paymentIntent || paymentIntent.status !== "succeeded") {
          return res.status(400).json({
            success: false,
            message: "Payment processing failed",
            error: paymentIntent,
          });
        }

        order.payment.status = "completed";
        order.payment.metadata = paymentIntent;
      } catch (paymentError) {
        console.error("Payment processing error:", paymentError);
        return res.status(500).json({
          success: false,
          message: "Payment processing failed",
        });
      }
    }

    await order.save();

    // Update product stock
    for (const item of cart.items) {
      const product = item.productId as any;
      await Product.findByIdAndUpdate(product._id, {
        $inc: { stock: -item.quantity },
      });
    }

    // Clear cart
    cart.items = [];
    cart.couponCode = undefined;
    await cart.save();

    // Send order confirmation email
    const user = await User.findById(userId);
    if (user) {
      await emailService.sendOrderConfirmationEmail(user, {
        firstName: user.firstName,
        orderId: order._id.toString(),
        orderTotal: order.totals.total,
        orderItems: order.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
      });
    }

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: {
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          total: order.totals.total,
          items: order.items,
          shippingAddress:
            order.shipping.firstName +
            " " +
            order.shipping.lastName +
            ", " +
            order.shipping.street +
            ", " +
            order.shipping.city +
            ", " +
            order.shipping.state +
            ", " +
            order.shipping.zipCode +
            ", " +
            order.shipping.country,
          paymentMethod: order.payment.method,
          paymentStatus: order.payment.status,
          createdAt: order.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Create order error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get user's orders
export const getOrders = async (req: Request, res: Response) => {
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
    const page = parseInt(req.query["page"] as string) || 1;
    const limit = parseInt(req.query["limit"] as string) || 10;
    const status = req.query["status"] as string;

    const skip = (page - 1) * limit;

    // Build query
    const query: any = { userId };
    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-__v");

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    return res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: page,
          totalPages,
          totalOrders,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get orders error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get order by ID
export const getOrderById = async (req: Request, res: Response) => {
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
    const { id } = req.params;

    const order = await Order.findOne({ _id: id, userId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.json({
      success: true,
      data: {
        order,
      },
    });
  } catch (error) {
    console.error("Get order by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Cancel order
export const cancelOrder = async (req: Request, res: Response) => {
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
    const { id } = req.params;

    const order = await Order.findOne({ _id: id, userId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if order can be cancelled
    if (order.status === "shipped" || order.status === "delivered") {
      return res.status(400).json({
        success: false,
        message:
          "Order cannot be cancelled as it has already been shipped or delivered",
      });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Order is already cancelled",
      });
    }

    // Update order status
    order.status = "cancelled";
    order.updatedAt = new Date();
    await order.save();

    // Restore product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: item.quantity },
      });
    }

    // Send cancellation email
    const user = await User.findById(userId);
    if (user) {
      await emailService.sendOrderCancelledEmail(user, {
        firstName: user.firstName,
        orderId: order._id.toString(),
        orderTotal: order.totals.total,
        orderItems: order.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        cancellationReason: req.body.cancellationReason || undefined,
        refundAmount: req.body.refundAmount || undefined,
        refundProcessingDays: req.body.refundProcessingDays || undefined,
      });
    }

    return res.json({
      success: true,
      message: "Order cancelled successfully",
      data: {
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          updatedAt: order.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get order history (alias for getOrders)
export const getOrderHistory = async (req: Request, res: Response) => {
  return getOrders(req, res);
};

// Admin: Get all orders
export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query["page"] as string) || 1;
    const limit = parseInt(req.query["limit"] as string) || 10;
    const status = req.query["status"] as string;

    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};
    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-__v");

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: page,
          totalPages,
          totalOrders,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get all orders error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Get order statistics
export const getOrderStats = async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats = await Order.aggregate([
      {
        $facet: {
          totalOrders: [{ $count: "count" }],
          totalRevenue: [{ $group: { _id: null, total: { $sum: "$total" } } }],
          ordersByStatus: [
            { $group: { _id: "$status", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          recentOrders: [
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            { $count: "count" },
          ],
          recentRevenue: [
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            { $group: { _id: null, total: { $sum: "$total" } } },
          ],
          dailyOrders: [
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
                count: { $sum: 1 },
                revenue: { $sum: "$total" },
              },
            },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]);

    const result = stats[0];

    return res.json({
      success: true,
      data: {
        totalOrders: result.totalOrders[0]?.count || 0,
        totalRevenue: result.totalRevenue[0]?.total || 0,
        recentOrders: result.recentOrders[0]?.count || 0,
        recentRevenue: result.recentRevenue[0]?.total || 0,
        ordersByStatus: result.ordersByStatus,
        dailyStats: result.dailyOrders,
      },
    });
  } catch (error) {
    console.error("Get order stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Update order status
export const updateOrderStatus = async (req: Request, res: Response) => {
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
    const { status, trackingNumber } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Update order status
    order.status = status;
    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
    }

    // Set timestamps based on status
    if (status === "shipped") {
      order.shippedAt = new Date();
    } else if (status === "delivered") {
      order.deliveredAt = new Date();
    }

    await order.save();

    // Send status update email
    const user = await User.findById(order.customer);
    if (user) {
      await emailService.sendOrderStatusUpdateEmail(user, {
        firstName: user.firstName,
        orderId: order._id.toString(),
        orderTotal: order.totals.total,
        orderItems: order.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        previousStatus: order.status,
        newStatus: status,
        statusMessage: req.body.statusMessage || undefined,
        trackingNumber: trackingNumber || undefined,
        estimatedDelivery: req.body.estimatedDelivery || undefined,
      });
    }

    return res.json({
      success: true,
      message: "Order status updated successfully",
      data: {
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          trackingNumber: order.trackingNumber,
          shippedAt: order.shippedAt,
          deliveredAt: order.deliveredAt,
        },
      },
    });
  } catch (error) {
    console.error("Update order status error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
