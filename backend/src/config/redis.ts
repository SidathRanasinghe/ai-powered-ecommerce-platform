import Redis from "ioredis";
import { config } from "./config";

class RedisClient {
  private client: Redis;
  private subscriber: Redis;
  private publisher: Redis;

  constructor() {
    const redisConfig = {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    };

    this.client = new Redis(redisConfig);
    this.subscriber = new Redis(redisConfig);
    this.publisher = new Redis(redisConfig);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.client.on("connect", () => {
      console.log("Redis client connected");
    });

    this.client.on("error", (err) => {
      console.error("Redis client error:", err);
    });

    this.client.on("ready", () => {
      console.log("Redis client ready");
    });

    this.client.on("close", () => {
      console.log("Redis client connection closed");
    });
  }

  // Session Management
  async setSession(
    sessionId: string,
    data: any,
    ttl: number = 3600
  ): Promise<void> {
    await this.client.setex(`session:${sessionId}`, ttl, JSON.stringify(data));
  }

  async getSession(sessionId: string): Promise<any> {
    const data = await this.client.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.client.del(`session:${sessionId}`);
  }

  // Caching
  async setCache(key: string, data: any, ttl: number = 3600): Promise<void> {
    await this.client.setex(`cache:${key}`, ttl, JSON.stringify(data));
  }

  async getCache(key: string): Promise<any> {
    const data = await this.client.get(`cache:${key}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteCache(key: string): Promise<void> {
    await this.client.del(`cache:${key}`);
  }

  async deleteCachePattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(`cache:${pattern}`);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  // Cart Management
  async setCart(
    userId: string,
    cartData: any,
    ttl: number = 7 * 24 * 3600
  ): Promise<void> {
    await this.client.setex(`cart:${userId}`, ttl, JSON.stringify(cartData));
  }

  async getCart(userId: string): Promise<any> {
    const data = await this.client.get(`cart:${userId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteCart(userId: string): Promise<void> {
    await this.client.del(`cart:${userId}`);
  }

  // Rate Limiting
  async checkRateLimit(
    key: string,
    limit: number,
    window: number
  ): Promise<boolean> {
    const current = await this.client.incr(`rate:${key}`);
    if (current === 1) {
      await this.client.expire(`rate:${key}`, window);
    }
    return current <= limit;
  }

  // Pub/Sub for real-time features
  async publish(channel: string, message: any): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(message));
  }

  async subscribe(
    channel: string,
    callback: (message: any) => void
  ): Promise<void> {
    await this.subscriber.subscribe(channel);
    this.subscriber.on("message", (receivedChannel, message) => {
      if (receivedChannel === channel) {
        callback(JSON.parse(message));
      }
    });
  }

  // Get Redis client for advanced operations
  getClient(): Redis {
    return this.client;
  }

  // Close connections
  async close(): Promise<void> {
    await this.client.quit();
    await this.subscriber.quit();
    await this.publisher.quit();
  }
}

export default new RedisClient();
