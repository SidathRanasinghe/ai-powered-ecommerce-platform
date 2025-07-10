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
