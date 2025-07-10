import { IUser } from "@/models/User";

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: IUser;
    accessToken: string;
    refreshToken: string;
  };
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  iat: number;
  exp: number;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface DeviceInfo {
  userAgent?: string;
  ipAddress?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
}

export interface LoginAttempt {
  email: string;
  ipAddress: string;
  success: boolean;
  timestamp: Date;
  userAgent?: string;
}
