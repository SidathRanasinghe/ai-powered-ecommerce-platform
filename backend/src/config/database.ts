import mongoose from "mongoose";
import { config } from "./config";

class Database {
  private connection: mongoose.Connection | null = null;

  async connect(): Promise<void> {
    try {
      const conn = await mongoose.connect(config.mongodb.uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
      });

      this.connection = conn.connection;

      console.log(`MongoDB connected: ${conn.connection.host}`);

      // Handle connection events
      this.connection.on("connected", () => {
        console.log("MongoDB connected successfully");
      });

      this.connection.on("error", (err) => {
        console.error("MongoDB connection error:", err);
      });

      this.connection.on("disconnected", () => {
        console.log("MongoDB disconnected");
      });

      // Handle application termination
      process.on("SIGINT", async () => {
        await this.close();
        process.exit(0);
      });
    } catch (error) {
      console.error("Database connection failed:", error);
      process.exit(1);
    }
  }

  async close(): Promise<void> {
    if (this.connection) {
      await mongoose.connection.close();
      console.log("MongoDB connection closed");
    }
  }

  getConnection(): mongoose.Connection | null {
    return this.connection;
  }
}

export default new Database();
