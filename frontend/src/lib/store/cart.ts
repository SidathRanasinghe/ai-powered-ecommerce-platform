import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Cart, Product, ProductVariant } from "@/lib/types";
import { apiClient } from "@/lib/api/client";
import toast from "react-hot-toast";

interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  addItem: (
    product: Product,
    quantity?: number,
    variant?: ProductVariant
  ) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  fetchCart: () => Promise<void>;
  getItemCount: () => number;
  getCartTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: null,
      isLoading: false,

      addItem: async (
        product: Product,
        quantity = 1,
        variant?: ProductVariant
      ) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.post("/cart/add", {
            productId: product._id,
            variantId: variant?._id,
            quantity,
          });

          if (response.data.success) {
            set({ cart: response.data.data.cart, isLoading: false });
            toast.success("Item added to cart!");
          } else {
            toast.error(response.data.message || "Failed to add item to cart");
            set({ isLoading: false });
          }
        } catch (error: any) {
          const message =
            error.response?.data?.message || "Failed to add item to cart";
          toast.error(message);
          set({ isLoading: false });
        }
      },

      removeItem: async (itemId: string) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.delete(`/cart/items/${itemId}`);

          if (response.data.success) {
            set({ cart: response.data.data.cart, isLoading: false });
            toast.success("Item removed from cart");
          } else {
            toast.error(response.data.message || "Failed to remove item");
            set({ isLoading: false });
          }
        } catch (error: any) {
          const message =
            error.response?.data?.message || "Failed to remove item";
          toast.error(message);
          set({ isLoading: false });
        }
      },

      updateQuantity: async (itemId: string, quantity: number) => {
        if (quantity <= 0) {
          return get().removeItem(itemId);
        }

        set({ isLoading: true });
        try {
          const response = await apiClient.put(`/cart/items/${itemId}`, {
            quantity,
          });

          if (response.data.success) {
            set({ cart: response.data.data.cart, isLoading: false });
          } else {
            toast.error(response.data.message || "Failed to update quantity");
            set({ isLoading: false });
          }
        } catch (error: any) {
          const message =
            error.response?.data?.message || "Failed to update quantity";
          toast.error(message);
          set({ isLoading: false });
        }
      },

      clearCart: async () => {
        set({ isLoading: true });
        try {
          const response = await apiClient.delete("/cart");

          if (response.data.success) {
            set({ cart: null, isLoading: false });
            toast.success("Cart cleared");
          } else {
            toast.error(response.data.message || "Failed to clear cart");
            set({ isLoading: false });
          }
        } catch (error: any) {
          const message =
            error.response?.data?.message || "Failed to clear cart";
          toast.error(message);
          set({ isLoading: false });
        }
      },

      fetchCart: async () => {
        set({ isLoading: true });
        try {
          const response = await apiClient.get("/cart");

          if (response.data.success) {
            set({ cart: response.data.data.cart, isLoading: false });
          } else {
            set({ cart: null, isLoading: false });
          }
        } catch (error) {
          set({ cart: null, isLoading: false });
        }
      },

      getItemCount: () => {
        const { cart } = get();
        if (!cart) return 0;
        return cart.items.reduce((total, item) => total + item.quantity, 0);
      },

      getCartTotal: () => {
        const { cart } = get();
        if (!cart) return 0;
        return cart.totals.total;
      },
    }),
    {
      name: "cart-storage",
      partialize: (state) => ({
        cart: state.cart,
      }),
    }
  )
);
