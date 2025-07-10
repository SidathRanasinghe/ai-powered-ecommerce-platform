import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env["PORT"] || 3001,
  nodeEnv: process.env["NODE_ENV"] || "development",

  frontend: {
    url: process.env["FRONTEND_URL"] || "http://localhost:3000",
  },

  backend: {
    url: process.env["BACKEND_URL"] || "http://localhost:3001",
  },

  mlService: {
    url: process.env["ML_SERVICE_URL"] || "http://localhost:8001",
  },

  mongodb: {
    uri: process.env["MONGODB_URI"] || "mongodb://localhost:27017/ecommerce",
  },

  redis: {
    host: process.env["REDIS_HOST"] || "localhost",
    port: parseInt(process.env["REDIS_PORT"] || "6379"),
    password: process.env["REDIS_PASSWORD"] || undefined,
    db: parseInt(process.env["REDIS_DB"] || "0"),
  },

  jwt: {
    secret: process.env["JWT_SECRET"] || "your-super-secret-jwt-key",
    expiresIn: process.env["JWT_EXPIRES_IN"] || "7d",
    jwtRefreshSecret: process.env["JWT_REFRESH_SECRET"]!,
    refreshExpiresIn: process.env["JWT_REFRESH_EXPIRES_IN"] || "30d",
  },

  stripe: {
    secretKey: process.env["STRIPE_SECRET_KEY"] || "",
    publishableKey: process.env["STRIPE_PUBLISHABLE_KEY"] || "",
    webhookSecret: process.env["STRIPE_WEBHOOK_SECRET"] || "",
  },

  aws: {
    accessKeyId: process.env["AWS_ACCESS_KEY_ID"] || "",
    secretAccessKey: process.env["AWS_SECRET_ACCESS_KEY"] || "",
    region: process.env["AWS_REGION"] || "us-west-2",
    s3Bucket: process.env["AWS_S3_BUCKET"] || "ecommerce-images",
    cloudFrontDomain: process.env["AWS_CLOUDFRONT_DOMAIN"] || "",
  },

  email: {
    fromName: process.env["EMAIL_FROM_NAME"] || "Your Company",
    fromEmail: process.env["EMAIL_FROM_EMAIL"] || "no-reply@yourcompany.com",
    host: process.env["EMAIL_HOST"]!,
    port: parseInt(process.env["EMAIL_PORT"] || "587", 10),
    secure: process.env["EMAIL_SECURE"] === "true",
    service: process.env["EMAIL_SERVICE"] || "gmail",
    user: process.env["EMAIL_USER"] || "",
    password: process.env["EMAIL_PASS"] || "",
  },
};
