import { v4 as uuidv4 } from "uuid";
import redisClient from "../config/redis";

export class SessionService {
  async createSession(userId: string, userData: any): Promise<string> {
    const sessionId = uuidv4();
    const sessionData = {
      userId,
      ...userData,
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    await redisClient.setSession(sessionId, sessionData, 24 * 3600); // 24 hours
    return sessionId;
  }

  async getSession(sessionId: string): Promise<any> {
    const sessionData = await redisClient.getSession(sessionId);

    if (sessionData) {
      // Update last activity
      sessionData.lastActivity = new Date();
      await redisClient.setSession(sessionId, sessionData, 24 * 3600);
    }

    return sessionData;
  }

  async updateSession(sessionId: string, updateData: any): Promise<void> {
    const sessionData = await redisClient.getSession(sessionId);

    if (sessionData) {
      const updatedData = {
        ...sessionData,
        ...updateData,
        lastActivity: new Date(),
      };

      await redisClient.setSession(sessionId, updatedData, 24 * 3600);
    }
  }

  async destroySession(sessionId: string): Promise<void> {
    await redisClient.deleteSession(sessionId);
  }

  async cleanupExpiredSessions(): Promise<void> {
    // This would typically be handled by Redis TTL
    // But you can implement custom cleanup logic here
  }
}
