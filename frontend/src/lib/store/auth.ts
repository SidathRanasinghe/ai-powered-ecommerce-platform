import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, LoginCredentials, RegisterData } from "@/lib/types";
import { authApi } from "@/lib/api/auth";
import toast from "react-hot-toast";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<boolean>;
  resetPassword: (token: string, password: string) => Promise<boolean>;
  setUser: (user: User | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login(credentials);
          if (response.success && response.data) {
            set({
              user: response.data.user,
              isAuthenticated: true,
              isLoading: false,
            });
            toast.success("Login successful!");
            return true;
          } else {
            toast.error(response.message || "Login failed");
            set({ isLoading: false });
            return false;
          }
        } catch (error: any) {
          const message = error.response?.data?.message || "Login failed";
          toast.error(message);
          set({ isLoading: false });
          return false;
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true });
        try {
          const response = await authApi.register(data);
          if (response.success) {
            toast.success(
              "Registration successful! Please check your email to verify your account."
            );
            set({ isLoading: false });
            return true;
          } else {
            toast.error(response.message || "Registration failed");
            set({ isLoading: false });
            return false;
          }
        } catch (error: any) {
          const message =
            error.response?.data?.message || "Registration failed";
          toast.error(message);
          set({ isLoading: false });
          return false;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch (error) {
          console.error("Logout error:", error);
        } finally {
          set({
            user: null,
            isAuthenticated: false,
          });
          toast.success("Logged out successfully");
        }
      },

      forgotPassword: async (email: string) => {
        try {
          const response = await authApi.forgotPassword(email);
          if (response.success) {
            toast.success("Password reset email sent!");
            return true;
          } else {
            toast.error(response.message || "Failed to send reset email");
            return false;
          }
        } catch (error: any) {
          const message =
            error.response?.data?.message || "Failed to send reset email";
          toast.error(message);
          return false;
        }
      },

      resetPassword: async (token: string, password: string) => {
        try {
          const response = await authApi.resetPassword({ token, password });
          if (response.success) {
            toast.success("Password reset successful!");
            return true;
          } else {
            toast.error(response.message || "Password reset failed");
            return false;
          }
        } catch (error: any) {
          const message =
            error.response?.data?.message || "Password reset failed";
          toast.error(message);
          return false;
        }
      },

      setUser: (user: User | null) => {
        set({
          user,
          isAuthenticated: !!user,
        });
      },

      clearAuth: () => {
        set({
          user: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
