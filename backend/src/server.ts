import app from "./app";
import { config } from "@/config/config";
import database from "@/config/database";
import redisClient from "@/config/redis";
import { logger } from "@/utils/logger";

const PORT = config.port;

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Close server
  server.close(() => {
    logger.info("HTTP server closed.");
  });

  // Close database connections
  try {
    await database.close();
    await redisClient.close();
    logger.info("Database connections closed.");
  } catch (error) {
    logger.error("Error during database shutdown:", error);
  }

  process.exit(0);
};

// Start server
const startServer = async () => {
  try {
    // Connect to databases
    await database.connect();
    logger.info("Database connected successfully");

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
    });

    // Handle graceful shutdown
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught Exception:", error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled Rejection at:", promise, "reason:", reason);
      process.exit(1);
    });

    return server;
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Declare server variable
let server: any;

// Start the server
startServer().then((s) => (server = s));
