import Order, { IOrder } from "@/models/Order";
import { ICoupon } from "@/models/Coupon";

export interface OrderItem {
  product: string;
  quantity: number;
  price: number;
}

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface OrderCalculation {
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
}

export interface CreateOrderData {
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  couponCode?: string;
  paymentMethod: string;
}

class OrderUtils {
  // Generate unique order number
  generateOrderNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  // Calculate order totals
  async calculateOrderTotal(
    items: OrderItem[],
    coupon?: ICoupon,
    shippingAddress?: ShippingAddress
  ): Promise<OrderCalculation> {
    let subtotal = 0;

    // Calculate subtotal
    for (const item of items) {
      subtotal += item.price * item.quantity;
    }

    // Calculate tax (assuming 8% tax rate)
    const taxRate = 0.08;
    const tax = subtotal * taxRate;

    // Calculate shipping
    const shipping = this.calculateShipping(subtotal, shippingAddress);

    // Calculate discount
    let discount = 0;
    if (coupon && coupon.isValid()) {
      discount = this.calculateDiscount(subtotal, coupon);
    }

    // Calculate total
    const total = subtotal + tax + shipping - discount;

    return {
      subtotal,
      tax,
      shipping,
      discount,
      total: Math.max(0, total), // Ensure total is not negative
    };
  }

  // Calculate shipping cost
  private calculateShipping(
    subtotal: number,
    address?: ShippingAddress
  ): number {
    // Free shipping for orders over $50
    if (subtotal >= 50) {
      return 0;
    }

    // Different shipping rates based on country
    if (address?.country === "US") {
      return 5.99;
    } else if (address?.country === "CA") {
      return 8.99;
    } else {
      return 12.99; // International shipping
    }
  }

  // Calculate discount based on coupon
  private calculateDiscount(subtotal: number, coupon: ICoupon): number {
    if (!coupon.isValid()) {
      return 0;
    }

    if (subtotal < coupon.minOrderAmount) {
      return 0;
    }

    let discount = 0;

    if (coupon.discountType === "percentage") {
      discount = (subtotal * coupon.discountValue) / 100;
    } else if (coupon.discountType === "fixed") {
      discount = coupon.discountValue;
    }

    // Apply maximum discount limit if specified
    if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
      discount = coupon.maxDiscountAmount;
    }

    return discount;
  }

  // Validate order items
  async validateOrderItems(
    items: OrderItem[]
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!items || items.length === 0) {
      errors.push("Order must contain at least one item");
    }

    for (const item of items) {
      if (!item.product) {
        errors.push("Product ID is required for each item");
      }

      if (!item.quantity || item.quantity <= 0) {
        errors.push("Quantity must be greater than 0");
      }

      if (!item.price || item.price <= 0) {
        errors.push("Price must be greater than 0");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Check inventory availability
  async checkInventoryAvailability(
    items: OrderItem[]
  ): Promise<{ available: boolean; errors: string[] }> {
    const errors: string[] = [];

    // This would typically fetch products from database
    // For now, we'll simulate the check
    for (const item of items) {
      // Simulated inventory check
      // In real implementation, you'd fetch product from database
      const availableStock = 100; // This would come from product.stock

      if (item.quantity > availableStock) {
        errors.push(
          `Insufficient stock for product ${item.product}. Available: ${availableStock}, Requested: ${item.quantity}`
        );
      }
    }

    return {
      available: errors.length === 0,
      errors,
    };
  }

  // Update order status
  async updateOrderStatus(
    orderId: string,
    newStatus:
      | "pending"
      | "processing"
      | "refunded"
      | "confirmed"
      | "shipped"
      | "delivered"
      | "cancelled"
  ): Promise<void> {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    order.status = newStatus;
    await order.save();
  }

  // Calculate estimated delivery date
  calculateEstimatedDelivery(shippingAddress: ShippingAddress): Date {
    const now = new Date();
    let deliveryDays = 5; // Default 5 business days

    // Adjust based on location
    if (shippingAddress.country === "US") {
      deliveryDays = 3;
    } else if (shippingAddress.country === "CA") {
      deliveryDays = 5;
    } else {
      deliveryDays = 10; // International
    }

    // Add delivery days to current date
    const deliveryDate = new Date(now);
    deliveryDate.setDate(deliveryDate.getDate() + deliveryDays);

    return deliveryDate;
  }

  // Generate tracking number
  generateTrackingNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 8).toUpperCase();
    return `TRK${timestamp}${random}`;
  }

  // Format order for email
  formatOrderForEmail(order: IOrder): any {
    return {
      orderId: order.orderNumber,
      orderTotal: order.totals.total,
      orderItems: order.items.map((item: any) => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.price,
      })),
    };
  }

  // Check if order can be cancelled
  canCancelOrder(order: IOrder): boolean {
    const cancellableStatuses = ["pending", "confirmed", "processing"];
    return cancellableStatuses.includes(order.status);
  }

  // Check if order can be returned
  canReturnOrder(order: IOrder): boolean {
    const returnableStatuses = ["delivered"];
    const deliveryDate = new Date(order.deliveredAt || order.updatedAt);
    const daysSinceDelivery = Math.floor(
      (Date.now() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return returnableStatuses.includes(order.status) && daysSinceDelivery <= 30;
  }

  // Calculate refund amount
  calculateRefundAmount(order: IOrder, returnItems?: OrderItem[]): number {
    if (!returnItems || returnItems.length === 0) {
      return order.totals.total; // Full refund if no specific items are returned
    }

    // Calculate refund for specific items
    let refundAmount = 0;
    for (const returnItem of returnItems) {
      const orderItem = order.items.find(
        (item: any) => item.product._id.toString() === returnItem.product
      );

      if (orderItem) {
        refundAmount += orderItem.price * returnItem.quantity;
      }
    }

    // Apply proportional tax and shipping refund
    const itemsRefundRatio = refundAmount / order.totals.subtotal;
    const taxRefund = order.totals.tax * itemsRefundRatio;
    const shippingRefund =
      returnItems.length === order.items.length ? order.totals.shipping : 0;

    return refundAmount + taxRefund + shippingRefund;
  }

  // Validate shipping address
  validateShippingAddress(address: ShippingAddress): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!address.street || address.street.trim().length === 0) {
      errors.push("Street address is required");
    }

    if (!address.city || address.city.trim().length === 0) {
      errors.push("City is required");
    }

    if (!address.state || address.state.trim().length === 0) {
      errors.push("State is required");
    }

    if (!address.zipCode || address.zipCode.trim().length === 0) {
      errors.push("ZIP code is required");
    }

    if (!address.country || address.country.trim().length === 0) {
      errors.push("Country is required");
    }

    // Validate ZIP code format for US
    if (address.country === "US" && !/^\d{5}(-\d{4})?$/.test(address.zipCode)) {
      errors.push("Invalid US ZIP code format");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default new OrderUtils();
