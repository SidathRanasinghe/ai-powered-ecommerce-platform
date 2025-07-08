import mongoose from "mongoose";

export const validators = {
  // Email validation
  email: {
    validator: (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    },
    message: "Please enter a valid email address",
  },

  // Phone validation
  phone: {
    validator: (phone: string): boolean => {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      return phoneRegex.test(phone);
    },
    message: "Please enter a valid phone number",
  },

  // URL validation
  url: {
    validator: (url: string): boolean => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    },
    message: "Please enter a valid URL",
  },

  // SKU validation
  sku: {
    validator: (sku: string): boolean => {
      const skuRegex = /^[A-Z0-9]{3,20}$/;
      return skuRegex.test(sku);
    },
    message:
      "SKU must be 3-20 characters long and contain only uppercase letters and numbers",
  },

  // Price validation
  price: {
    validator: (price: number): boolean => {
      return price >= 0 && price <= 999999.99;
    },
    message: "Price must be between 0 and 999999.99",
  },

  // ObjectId validation
  objectId: {
    validator: (id: string): boolean => {
      return mongoose.Types.ObjectId.isValid(id);
    },
    message: "Invalid ObjectId",
  },
};
