import jwt from "jsonwebtoken";
import crypto from "crypto";
import { config } from "@/config/config";
import { IUser } from "@/models/User";
import RefreshToken from "@/models/RefreshToken";
import {
  TokenPayload,
  RefreshTokenPayload,
  AuthTokens,
  DeviceInfo,
} from "@/types/auth";

class TokenUtils {
  // Generate JWT access token
  generateAccessToken(user: IUser): string {
    const payload: Omit<TokenPayload, "iat" | "exp"> = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn || "7d",
    } as jwt.SignOptions);
  }

  // Generate JWT refresh token
  async generateRefreshToken(
    user: IUser,
    deviceInfo?: DeviceInfo
  ): Promise<string> {
    // Create refresh token document
    const refreshTokenDoc = new RefreshToken({
      userId: user._id,
      token: crypto.randomBytes(64).toString("hex"),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      deviceInfo: deviceInfo?.userAgent,
      ipAddress: deviceInfo?.ipAddress,
    });

    await refreshTokenDoc.save();

    const payload: Omit<RefreshTokenPayload, "iat" | "exp"> = {
      userId: user._id.toString(),
      tokenId: refreshTokenDoc._id.toString(),
    };

    return jwt.sign(payload, config.jwt.jwtRefreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn || "30d",
    } as jwt.SignOptions);
  }

  // Generate both access and refresh tokens
  async generateTokens(
    user: IUser,
    deviceInfo?: DeviceInfo
  ): Promise<AuthTokens> {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user, deviceInfo);

    return {
      accessToken,
      refreshToken,
    };
  }

  // Verify access token
  verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, config.jwt.secret) as TokenPayload;
    } catch (error) {
      throw new Error("Invalid access token");
    }
  }

  // Verify refresh token
  verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      return jwt.verify(
        token,
        config.jwt.jwtRefreshSecret
      ) as RefreshTokenPayload;
    } catch (error) {
      throw new Error("Invalid refresh token");
    }
  }

  // Refresh access token using refresh token
  async refreshAccessToken(
    refreshToken: string
  ): Promise<{ accessToken: string; user: IUser }> {
    const payload = this.verifyRefreshToken(refreshToken);

    // Find the refresh token in database
    const refreshTokenDoc = await RefreshToken.findById(payload.tokenId)
      .populate("userId")
      .exec();

    if (
      !refreshTokenDoc ||
      !refreshTokenDoc.isActive ||
      refreshTokenDoc.expiresAt < new Date()
    ) {
      throw new Error("Invalid or expired refresh token");
    }

    const user = refreshTokenDoc.userId as unknown as IUser;
    const accessToken = this.generateAccessToken(user);

    return {
      accessToken,
      user,
    };
  }

  // Revoke refresh token
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    try {
      const payload = this.verifyRefreshToken(refreshToken);
      await RefreshToken.findByIdAndUpdate(payload.tokenId, {
        isActive: false,
      });
    } catch (error) {
      // Token might be invalid, but we don't throw error for logout
    }
  }

  // Revoke all refresh tokens for a user
  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await RefreshToken.updateMany(
      { userId, isActive: true },
      { isActive: false }
    );
  }

  // Generate random token for email verification, password reset, etc.
  generateRandomToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  // Generate email verification token
  generateEmailVerificationToken(userId: string): string {
    const payload = {
      userId,
      type: "email_verification",
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: "24h",
    });
  }

  // Generate password reset token
  generatePasswordResetToken(userId: string): string {
    const payload = {
      userId,
      type: "password_reset",
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: "1h",
    });
  }

  // Verify email verification token
  verifyEmailVerificationToken(token: string): { userId: string } {
    try {
      const payload = jwt.verify(token, config.jwt.secret) as any;

      if (payload.type !== "email_verification") {
        throw new Error("Invalid token type");
      }

      return { userId: payload.userId };
    } catch (error) {
      throw new Error("Invalid or expired verification token");
    }
  }

  // Verify password reset token
  verifyPasswordResetToken(token: string): { userId: string } {
    try {
      const payload = jwt.verify(token, config.jwt.secret) as any;

      if (payload.type !== "password_reset") {
        throw new Error("Invalid token type");
      }

      return { userId: payload.userId };
    } catch (error) {
      throw new Error("Invalid or expired reset token");
    }
  }

  // Clean up expired refresh tokens
  async cleanupExpiredTokens(): Promise<void> {
    await RefreshToken.deleteMany({
      $or: [{ expiresAt: { $lt: new Date() } }, { isActive: false }],
    });
  }

  // Get active refresh tokens for a user
  async getActiveTokensForUser(userId: string): Promise<any[]> {
    return await RefreshToken.find({
      userId,
      isActive: true,
      expiresAt: { $gt: new Date() },
    }).select("deviceInfo ipAddress createdAt");
  }
}

export default new TokenUtils();
