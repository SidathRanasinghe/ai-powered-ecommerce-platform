import Stripe from "stripe";
import { config } from "@/config/config";
import { IUser } from "@/models/User";

const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: "2023-08-16",
});

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
}

export interface PaymentMethod {
  id: string;
  type: string;
  card:
    | {
        brand: string;
        last4: string;
        expMonth: number;
        expYear: number;
      }
    | undefined;
}

export interface RefundRequest {
  paymentIntentId: string;
  amount?: number;
  reason?: string;
}

class PaymentUtils {
  // Create payment intent
  async createPaymentIntent(
    amount: number,
    currency: string = "usd",
    customerId?: string,
    metadata?: Record<string, string>
  ): Promise<PaymentIntent> {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      ...(customerId ? { customer: customerId } : {}),
      ...(metadata ? { metadata } : {}),
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret!,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
    };
  }

  // Confirm payment intent
  async confirmPaymentIntent(paymentIntentId: string): Promise<boolean> {
    try {
      const paymentIntent = await stripe.paymentIntents.confirm(
        paymentIntentId
      );
      return paymentIntent.status === "succeeded";
    } catch (error) {
      console.error("Payment confirmation failed:", error);
      return false;
    }
  }

  // Get payment intent
  async getPaymentIntent(
    paymentIntentId: string
  ): Promise<Stripe.PaymentIntent> {
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  }

  // Create customer
  async createCustomer(user: IUser): Promise<string> {
    const customer = await stripe.customers.create({
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      metadata: {
        userId: user._id.toString(),
      },
    });

    return customer.id;
  }

  // Get customer
  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    return (await stripe.customers.retrieve(customerId)) as Stripe.Customer;
  }

  // Update customer
  async updateCustomer(
    customerId: string,
    data: Partial<Stripe.CustomerUpdateParams>
  ): Promise<Stripe.Customer> {
    return await stripe.customers.update(customerId, data);
  }

  // Create payment method
  async createPaymentMethod(
    type: string,
    card?: {
      number: string;
      expMonth: number;
      expYear: number;
      cvc: string;
    }
  ): Promise<PaymentMethod> {
    const paymentMethod = await stripe.paymentMethods.create(
      card
        ? {
            type: type as any,
            card: {
              number: card.number,
              exp_month: card.expMonth,
              exp_year: card.expYear,
              cvc: card.cvc,
            },
          }
        : {
            type: type as any,
          }
    );

    return {
      id: paymentMethod.id,
      type: paymentMethod.type,
      card: paymentMethod.card
        ? {
            brand: paymentMethod.card.brand,
            last4: paymentMethod.card.last4,
            expMonth: paymentMethod.card.exp_month,
            expYear: paymentMethod.card.exp_year,
          }
        : undefined,
    };
  }

  // Attach payment method to customer
  async attachPaymentMethodToCustomer(
    paymentMethodId: string,
    customerId: string
  ): Promise<void> {
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
  }

  // Detach payment method from customer
  async detachPaymentMethodFromCustomer(
    paymentMethodId: string
  ): Promise<void> {
    await stripe.paymentMethods.detach(paymentMethodId);
  }

  // Get customer payment methods
  async getCustomerPaymentMethods(
    customerId: string
  ): Promise<PaymentMethod[]> {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });

    return paymentMethods.data.map((pm) => ({
      id: pm.id,
      type: pm.type,
      card: pm.card
        ? {
            brand: pm.card.brand,
            last4: pm.card.last4,
            expMonth: pm.card.exp_month,
            expYear: pm.card.exp_year,
          }
        : undefined,
    }));
  }

  // Process payment
  async processPayment(
    paymentIntentId: string,
    amount: number,
    currency: string = "usd"
  ): Promise<Stripe.PaymentIntent> {
    try {
      await stripe.paymentIntents.update(paymentIntentId, {
        amount: Math.round(amount * 100), // Convert to cents
        currency,
      });
      const confirmedPaymentIntent = await stripe.paymentIntents.confirm(
        paymentIntentId
      );
      return confirmedPaymentIntent;
    } catch (error) {
      console.error("Error processing payment:", error);
      throw error;
    }
  }

  // Process refund
  async processRefund(request: RefundRequest): Promise<Stripe.Refund> {
    const params: Stripe.RefundCreateParams = {
      payment_intent: request.paymentIntentId,
      reason: request.reason as any,
    };
    if (typeof request.amount === "number") {
      params.amount = Math.round(request.amount * 100);
    }
    const refund = await stripe.refunds.create(params);

    return refund;
  }

  // Get refunds for payment intent
  async getRefunds(paymentIntentId: string): Promise<Stripe.Refund[]> {
    const refunds = await stripe.refunds.list({
      payment_intent: paymentIntentId,
    });

    return refunds.data;
  }

  // Verify webhook signature
  verifyWebhookSignature(payload: string, signature: string): Stripe.Event {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      config.stripe.webhookSecret
    );
  }

  // Handle webhook events
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case "payment_intent.succeeded":
        await this.handlePaymentSucceeded(
          event.data.object as Stripe.PaymentIntent
        );
        break;
      case "payment_intent.payment_failed":
        await this.handlePaymentFailed(
          event.data.object as Stripe.PaymentIntent
        );
        break;
      case "charge.dispute.created":
        await this.handleChargeDispute(event.data.object as Stripe.Dispute);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  // Handle successful payment
  private async handlePaymentSucceeded(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    console.log("Payment succeeded:", paymentIntent.id);

    // Update order status in database
    const orderId = paymentIntent.metadata?.["orderId"];
    if (orderId) {
      // This would typically update the order status to "paid"
      // Implementation depends on your Order model
    }
  }

  // Handle failed payment
  private async handlePaymentFailed(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    console.log("Payment failed:", paymentIntent.id);

    // Update order status in database
    const orderId = paymentIntent.metadata?.["orderId"];
    if (orderId) {
      // This would typically update the order status to "payment_failed"
      // Implementation depends on your Order model
    }
  }

  // Handle charge dispute
  private async handleChargeDispute(dispute: Stripe.Dispute): Promise<void> {
    console.log("Charge dispute created:", dispute.id);

    // Notify admin or handle dispute logic
    // This would typically create a dispute record in your database
  }

  // Calculate processing fee
  calculateProcessingFee(amount: number): number {
    // Stripe's standard fee: 2.9% + $0.30
    return Math.round((amount * 0.029 + 0.3) * 100) / 100;
  }

  // Format amount for display
  formatAmount(amount: number, currency: string = "usd"): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  }

  // Validate card number
  validateCardNumber(cardNumber: string): boolean {
    // Remove spaces and dashes
    const cleanNumber = cardNumber.replace(/[\s-]/g, "");

    // Check if it's a valid length
    if (cleanNumber.length < 13 || cleanNumber.length > 19) {
      return false;
    }

    // Check if it's all digits
    if (!/^\d+$/.test(cleanNumber)) {
      return false;
    }

    // Luhn algorithm check
    let sum = 0;
    let alternate = false;

    for (let i = cleanNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanNumber.charAt(i));

      if (alternate) {
        digit *= 2;
        if (digit > 9) {
          digit = (digit % 10) + 1;
        }
      }

      sum += digit;
      alternate = !alternate;
    }

    return sum % 10 === 0;
  }

  // Get card brand from number
  getCardBrand(cardNumber: string): string {
    const cleanNumber = cardNumber.replace(/[\s-]/g, "");

    if (/^4/.test(cleanNumber)) return "visa";
    if (/^5[1-5]/.test(cleanNumber)) return "mastercard";
    if (/^3[47]/.test(cleanNumber)) return "amex";
    if (/^6(?:011|5)/.test(cleanNumber)) return "discover";

    return "unknown";
  }

  // Create setup intent for saving payment method
  async createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
    return await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
    });
  }

  // Create subscription
  async createSubscription(
    customerId: string,
    priceId: string
  ): Promise<Stripe.Subscription> {
    return await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
    });
  }
}

export default new PaymentUtils();
