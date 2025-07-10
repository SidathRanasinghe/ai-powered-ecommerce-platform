import nodemailer from "nodemailer";
import { config } from "@/config/config";
import { IUser } from "@/models/User";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface OrderConfirmationEmailData {
  firstName: string;
  orderId: string;
  orderTotal: number;
  orderItems: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

interface OrderCancellationEmailData {
  firstName: string;
  orderId: string;
  orderTotal: number;
  orderItems: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  cancellationReason?: string | undefined;
  refundAmount?: number | undefined;
  refundProcessingDays?: number | undefined;
}

interface OrderStatusUpdateEmailData {
  firstName: string;
  orderId: string;
  orderTotal: number;
  orderItems: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  previousStatus: string;
  newStatus: string;
  statusMessage?: string | undefined;
  trackingNumber?: string | undefined;
  estimatedDelivery?: string | undefined;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    });
  }

  private async sendEmail(options: EmailOptions): Promise<void> {
    const mailOptions = {
      from: `"${config.email.fromName}" <${config.email.fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendWelcomeEmail(
    user: IUser,
    verificationToken: string
  ): Promise<void> {
    const verificationLink = `${config.frontend.url}/verify-email?token=${verificationToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Our E-commerce Platform!</h2>
        <p>Hi ${user.firstName},</p>
        <p>Thank you for joining our platform. Please verify your email address to get started.</p>
        <a href="${verificationLink}" style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Verify Email
        </a>
        <p>If you didn't create an account, please ignore this email.</p>
        <p>Best regards,<br>The Team</p>
      </div>
    `;

    await this.sendEmail({
      to: user.email,
      subject: "Welcome! Please verify your email",
      html,
    });
  }

  async sendPasswordResetEmail(user: IUser, resetToken: string): Promise<void> {
    const resetLink = `${config.frontend.url}/reset-password?token=${resetToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi ${user.firstName},</p>
        <p>You requested to reset your password. Click the button below to reset it:</p>
        <a href="${resetLink}" style="display: inline-block; background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Reset Password
        </a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>The Team</p>
      </div>
    `;

    await this.sendEmail({
      to: user.email,
      subject: "Password Reset Request",
      html,
    });
  }

  async sendOrderConfirmationEmail(
    user: IUser,
    orderData: OrderConfirmationEmailData
  ): Promise<void> {
    const itemsHtml = orderData.orderItems
      .map(
        (item) => `
      <tr>
        <td>${item.name}</td>
        <td>${item.quantity}</td>
        <td>$${item.price.toFixed(2)}</td>
      </tr>
    `
      )
      .join("");

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Order Confirmation</h2>
        <p>Hi ${user.firstName},</p>
        <p>Thank you for your order! Here are the details:</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Order ID: ${orderData.orderId}</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #e9ecef;">
                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Item</th>
                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Quantity</th>
                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div style="margin-top: 20px; text-align: right;">
            <strong>Total: $${orderData.orderTotal.toFixed(2)}</strong>
          </div>
        </div>
        <p>We'll send you another email when your order ships.</p>
        <p>Best regards,<br>The Team</p>
      </div>
    `;

    await this.sendEmail({
      to: user.email,
      subject: `Order Confirmation - ${orderData.orderId}`,
      html,
    });
  }

  async sendOrderCancelledEmail(
    user: IUser,
    orderData: OrderCancellationEmailData
  ): Promise<void> {
    const itemsHtml = orderData.orderItems
      .map(
        (item) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${
        item.quantity
      }</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">$${item.price.toFixed(
        2
      )}</td>
    </tr>
  `
      )
      .join("");

    const refundInfo = orderData.refundAmount
      ? `
      <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
        <h4 style="margin: 0 0 10px 0; color: #155724;">Refund Information</h4>
        <p style="margin: 5px 0; color: #155724;">Refund Amount: <strong>$${orderData.refundAmount.toFixed(
          2
        )}</strong></p>
        ${
          orderData.refundProcessingDays
            ? `<p style="margin: 5px 0; color: #155724;">Processing Time: ${orderData.refundProcessingDays} business days</p>`
            : ""
        }
      </div>
    `
      : "";

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc3545;">Order Cancelled</h2>
      <p>Hi ${user.firstName},</p>
      <p>Your order has been cancelled successfully. Here are the details:</p>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3>Order ID: ${orderData.orderId}</h3>
        ${
          orderData.cancellationReason
            ? `<p><strong>Reason:</strong> ${orderData.cancellationReason}</p>`
            : ""
        }
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <thead>
            <tr style="background-color: #e9ecef;">
              <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Item</th>
              <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Quantity</th>
              <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div style="margin-top: 20px; text-align: right;">
          <strong>Total: $${orderData.orderTotal.toFixed(2)}</strong>
        </div>
      </div>
      
      ${refundInfo}
      
      <p>If you have any questions about this cancellation, please don't hesitate to contact our customer support.</p>
      <p>Best regards,<br>The Team</p>
    </div>
  `;

    await this.sendEmail({
      to: user.email,
      subject: `Order Cancelled - ${orderData.orderId}`,
      html,
    });
  }

  // 2. Function to send order status update email
  async sendOrderStatusUpdateEmail(
    user: IUser,
    orderData: OrderStatusUpdateEmailData
  ): Promise<void> {
    const itemsHtml = orderData.orderItems
      .map(
        (item) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${
        item.quantity
      }</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">$${item.price.toFixed(
        2
      )}</td>
    </tr>
  `
      )
      .join("");

    const getStatusColor = (status: string) => {
      const statusColors: { [key: string]: string } = {
        pending: "#ffc107",
        processing: "#17a2b8",
        shipped: "#28a745",
        delivered: "#007bff",
        cancelled: "#dc3545",
      };
      return statusColors[status.toLowerCase()] || "#6c757d";
    };

    const trackingInfo = orderData.trackingNumber
      ? `
      <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #17a2b8;">
        <h4 style="margin: 0 0 10px 0; color: #0c5460;">Tracking Information</h4>
        <p style="margin: 5px 0; color: #0c5460;"><strong>Tracking Number:</strong> ${
          orderData.trackingNumber
        }</p>
        ${
          orderData.estimatedDelivery
            ? `<p style="margin: 5px 0; color: #0c5460;"><strong>Estimated Delivery:</strong> ${orderData.estimatedDelivery}</p>`
            : ""
        }
      </div>
    `
      : "";

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Order Status Update</h2>
      <p>Hi ${user.firstName},</p>
      <p>Your order status has been updated. Here are the details:</p>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3>Order ID: ${orderData.orderId}</h3>
        
        <div style="margin: 15px 0;">
          <div style="display: flex; align-items: center; margin-bottom: 10px;">
            <span style="background-color: #6c757d; color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px; margin-right: 10px;">
              Previous: ${orderData.previousStatus}
            </span>
            <span style="color: #6c757d;">→</span>
            <span style="background-color: ${getStatusColor(
              orderData.newStatus
            )}; color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px; margin-left: 10px;">
              Current: ${orderData.newStatus}
            </span>
          </div>
          ${
            orderData.statusMessage
              ? `<p style="margin: 10px 0; font-style: italic; color: #666;">${orderData.statusMessage}</p>`
              : ""
          }
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <thead>
            <tr style="background-color: #e9ecef;">
              <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Item</th>
              <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Quantity</th>
              <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div style="margin-top: 20px; text-align: right;">
          <strong>Total: $${orderData.orderTotal.toFixed(2)}</strong>
        </div>
      </div>
      
      ${trackingInfo}
      
      <p>We'll continue to keep you updated on your order progress.</p>
      <p>Best regards,<br>The Team</p>
    </div>
  `;

    await this.sendEmail({
      to: user.email,
      subject: `Order Status Update - ${orderData.orderId}`,
      html,
    });
  }

  async sendEmailVerificationEmail(
    user: IUser,
    verificationToken: string
  ): Promise<void> {
    const verificationLink = `${config.frontend.url}/verify-email?token=${verificationToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Email Verification</h2>
        <p>Hi ${user.firstName},</p>
        <p>Please verify your email address by clicking the button below:</p>
        <a href="${verificationLink}" style="display: inline-block; background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Verify Email
        </a>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>The Team</p>
      </div>
    `;

    await this.sendEmail({
      to: user.email,
      subject: "Please verify your email address",
      html,
    });
  }

  async sendPasswordChangedNotification(user: IUser): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Changed Successfully</h2>
        <p>Hi ${user.firstName},</p>
        <p>Your password has been successfully changed.</p>
        <p>If you didn't make this change, please contact support immediately.</p>
        <p>Best regards,<br>The Team</p>
      </div>
    `;

    await this.sendEmail({
      to: user.email,
      subject: "Password Changed Successfully",
      html,
    });
  }
}

export default new EmailService();
