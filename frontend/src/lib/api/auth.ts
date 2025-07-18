import { apiClient } from "./client";
import type {
  ApiResponse,
  AuthTokens,
  LoginCredentials,
  RegisterData,
  ResetPasswordData,
  User,
} from "@/lib/types";

export const authApi = {
  async register(data: RegisterData): Promise<ApiResponse<{ user: User }>> {
    const response = await apiClient.post("/auth/register", data);
    return response.data;
  },

  async login(
    credentials: LoginCredentials
  ): Promise<ApiResponse<{ user: User } & AuthTokens>> {
    const response = await apiClient.post("/auth/login", credentials);
    const result = response.data;

    if (result.success && result.data) {
      apiClient.setTokens({
        accessToken: result.data.accessToken,
        refreshToken: result.data.refreshToken,
      });
    }

    return result;
  },

  async logout(): Promise<ApiResponse> {
    try {
      const response = await apiClient.post("/auth/logout");
      apiClient.clearAuth();
      return response.data;
    } catch (error) {
      apiClient.clearAuth();
      throw error;
    }
  },

  async forgotPassword(email: string): Promise<ApiResponse> {
    const response = await apiClient.post("/auth/forgot-password", { email });
    return response.data;
  },

  async resetPassword(data: ResetPasswordData): Promise<ApiResponse> {
    const response = await apiClient.post("/auth/reset-password", data);
    return response.data;
  },

  async verifyEmail(token: string): Promise<ApiResponse> {
    const response = await apiClient.get(`/auth/verify-email/${token}`);
    return response.data;
  },

  async resendVerification(email: string): Promise<ApiResponse> {
    const response = await apiClient.post("/auth/resend-verification", {
      email,
    });
    return response.data;
  },

  async refreshToken(refreshToken: string): Promise<ApiResponse<AuthTokens>> {
    const response = await apiClient.post("/auth/refresh-token", {
      refreshToken,
    });
    return response.data;
  },
};
