# Express Server Setup with TypeScript - Complete Guide

## Table of Contents

1. [Project Structure](#project-structure)
2. [Dependencies Installation](#dependencies-installation)
3. [TypeScript Configuration](#typescript-configuration)
4. [Express Server Setup](#express-server-setup)
5. [Middleware Configuration](#middleware-configuration)
6. [Route Organization](#route-organization)
7. [Error Handling](#error-handling)
8. [Development Scripts](#development-scripts)

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── config.ts
│   │   ├── database.ts
│   │   └── redis.ts
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── userController.ts
│   │   ├── productController.ts
│   │   ├── cartController.ts
│   │   └── orderController.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── validation.ts
│   │   ├── errorHandler.ts
│   │   ├── rateLimiter.ts
│   │   └── cors.ts
│   ├── models/
│   │   ├── User.ts
│   │   ├── Product.ts
│   │   ├── Cart.ts
│   │   ├── Order.ts
│   │   └── Review.ts
│   ├── routes/
│   │   ├── index.ts
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── products.ts
│   │   ├── cart.ts
│   │   └── orders.ts
│   ├── services/
│   │   ├── userService.ts
│   │   ├── productService.ts
│   │   ├── cartService.ts
│   │   ├── orderService.ts
│   │   └── emailService.ts
│   ├── utils/
│   │   ├── validators.ts
│   │   ├── helpers.ts
│   │   ├── constants.ts
│   │   └── logger.ts
│   ├── types/
│   │   ├── express.ts
│   │   ├── user.ts
│   │   └── product.ts
│   ├── app.ts
│   └── server.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── logs/
├── uploads/
├── .env
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── nodemon.json
└── README.md
```

## Dependencies Installation

### 1. Package.json Setup

```json
{
  "name": "ecommerce-backend",
  "version": "1.0.0",
  "description": "AI-powered e-commerce platform backend",
  "main": "dist/server.js",
  "scripts": {
    "start": "node dist/server.js",
    "dev": "nodemon",
    "build": "tsc",
    "build:watch": "tsc --watch",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "clean": "rimraf dist",
    "prebuild": "npm run clean",
    "postbuild": "npm run copy:assets",
    "copy:assets": "copyfiles -u 1 src/**/*.json dist/"
  },
  "keywords": [
    "ecommerce",
    "express",
    "typescript",
    "mongodb",
    "redis",
    "stripe"
  ],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.5.0",
    "ioredis": "^5.3.2",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "express-validator": "^7.0.1",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "morgan": "^1.10.0",
    "compression": "^1.7.4",
    "express-rate-limit": "^6.10.0",
    "express-slow-down": "^1.6.0",
    "multer": "^1.4.5-lts.1",
    "sharp": "^0.32.5",
    "nodemailer": "^6.9.5",
    "stripe": "^13.6.0",
    "winston": "^3.10.0",
    "dotenv": "^16.3.1",
    "uuid": "^9.0.0",
    "moment": "^2.29.4",
    "lodash": "^4.17.21"
  },
  "devDependencies": {
    "@types/node": "^20.5.9",
    "@types/express": "^4.17.17",
    "@types/bcryptjs": "^2.4.4",
    "@types/jsonwebtoken": "^9.0.3",
    "@types/cors": "^2.8.14",
    "@types/morgan": "^1.9.5",
    "@types/compression": "^1.7.3",
    "@types/multer": "^1.4.7",
    "@types/nodemailer": "^6.4.10",
    "@types/uuid": "^9.0.3",
    "@types/lodash": "^4.14.197",
    "@types/jest": "^29.5.5",
    "@types/supertest": "^2.0.12",
    "typescript": "^5.2.2",
    "nodemon": "^3.0.1",
    "ts-node": "^10.9.1",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "supertest": "^6.3.3",
    "eslint": "^8.48.0",
    "@typescript-eslint/eslint-plugin": "^6.7.0",
    "@typescript-eslint/parser": "^6.7.0",
    "rimraf": "^5.0.1",
    "copyfiles": "^2.4.1"
  }
}
```

### 2. Install Commands

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Install dev dependencies
npm install --save-dev @types/node @types/express @types/bcryptjs @types/jsonwebtoken @types/cors @types/morgan @types/compression @types/multer @types/nodemailer @types/uuid @types/lodash @types/jest @types/supertest typescript nodemon ts-node jest ts-jest supertest eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser rimraf copyfiles
```

## TypeScript Configuration

### 1. tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@/config/*": ["config/*"],
      "@/controllers/*": ["controllers/*"],
      "@/middleware/*": ["middleware/*"],
      "@/models/*": ["models/*"],
      "@/routes/*": ["routes/*"],
      "@/services/*": ["services/*"],
      "@/utils/*": ["utils/*"],
      "@/types/*": ["types/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 2. nodemon.json

```json
{
  "watch": ["src"],
  "ext": "ts,json",
  "ignore": ["src/**/*.spec.ts"],
  "exec": "ts-node -r tsconfig-paths/register src/server.ts",
  "env": {
    "NODE_ENV": "development"
  }
}
```

## Express Server Setup

### 1. Server Entry Point

```typescript
// src/server.ts
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
```

### 2. Express App Configuration

```typescript
// src/app.ts
import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { config } from "@/config/config";
import { logger } from "@/utils/logger";
import { errorHandler } from "@/middleware/errorHandler";
import { rateLimiter } from "@/middleware/rateLimiter";
import { corsOptions } from "@/middleware/cors";
import routes from "@/routes";

// Create Express app
const app: Application = express();

// Trust proxy (for load balancers)
app.set("trust proxy", 1);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging middleware
const morganFormat = config.nodeEnv === "production" ? "combined" : "dev";
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message: string) => {
        logger.info(message.trim());
      },
    },
  })
);

// Rate limiting
app.use(rateLimiter);

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
  });
});

// API routes
app.use("/api/v1", routes);

// Handle 404 errors
app.use("*", (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use(errorHandler);

export default app;
```

## Middleware Configuration

### 1. CORS Configuration

```typescript
// src/middleware/cors.ts
import { CorsOptions } from "cors";
import { config } from "@/config/config";

const allowedOrigins = [
  "http://localhost:3000", // Frontend development
  "http://localhost:3001", // Backend development
  "https://yourdomain.com", // Production frontend
];

if (config.nodeEnv === "development") {
  allowedOrigins.push("http://localhost:3000");
}

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "Cache-Control",
    "X-Access-Token",
  ],
};
```

### 2. Rate Limiting

```typescript
// src/middleware/rateLimiter.ts
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import { Request, Response } from "express";

// General rate limiter
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: "Too many requests from this IP, please try again later.",
    });
  },
});

// Strict rate limiter for auth endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Speed limiter for heavy operations
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 2, // allow 2 requests per windowMs at full speed
  delayMs: 500, // slow down subsequent requests by 500ms per request
});

// API rate limiter
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 requests per minute
  message: {
    error: "API rate limit exceeded. Please try again later.",
  },
});
```

### 3. Error Handler

```typescript
// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';
import { config } from '@/config/config';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req
```
