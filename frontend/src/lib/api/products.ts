import { apiClient } from "./client";
import type {
  ApiResponse,
  Product,
  ProductsResponse,
  SearchFilters,
  Review,
} from "@/lib/types";

export const productsApi = {
  async getProducts(
    filters: SearchFilters = {}
  ): Promise<ApiResponse<ProductsResponse>> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/products?${params.toString()}`);
    return response.data;
  },

  async getProductById(id: string): Promise<ApiResponse<{ product: Product }>> {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  },

  async searchProducts(
    filters: SearchFilters
  ): Promise<ApiResponse<ProductsResponse>> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(
      `/products/search?${params.toString()}`
    );
    return response.data;
  },

  async getProductsByCategory(
    category: string,
    page = 1,
    limit = 12
  ): Promise<ApiResponse<ProductsResponse>> {
    const response = await apiClient.get(
      `/products/category/${category}?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  async getProductReviews(
    productId: string,
    page = 1,
    limit = 10
  ): Promise<ApiResponse<{ reviews: Review[]; pagination: any }>> {
    const response = await apiClient.get(
      `/products/${productId}/reviews?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  async addProductReview(
    productId: string,
    review: { rating: number; comment: string }
  ): Promise<ApiResponse<{ review: Review }>> {
    const response = await apiClient.post(
      `/products/${productId}/reviews`,
      review
    );
    return response.data;
  },

  async updateProductReview(
    productId: string,
    reviewId: string,
    review: { rating: number; comment: string }
  ): Promise<ApiResponse<{ review: Review }>> {
    const response = await apiClient.put(
      `/products/${productId}/reviews/${reviewId}`,
      review
    );
    return response.data;
  },

  async deleteProductReview(
    productId: string,
    reviewId: string
  ): Promise<ApiResponse> {
    const response = await apiClient.delete(
      `/products/${productId}/reviews/${reviewId}`
    );
    return response.data;
  },

  async getFeaturedProducts(): Promise<ApiResponse<{ products: Product[] }>> {
    const response = await apiClient.get("/products?isFeatured=true&limit=8");
    return response.data;
  },

  async getRecommendations(
    userId?: string
  ): Promise<ApiResponse<{ products: Product[] }>> {
    const url = userId
      ? `/recommendations/user/${userId}`
      : "/recommendations/popular";
    const response = await apiClient.get(url);
    return response.data;
  },
};
