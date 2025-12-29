import express from "express";
import path from "path";
import cors from "cors";
import { serve } from "inngest/express";
import { clerkMiddleware } from "@clerk/express";

import { ENV } from "../src/lib/env.js";
import { connectDB } from "../src/lib/db.js";
import { inngest, functions } from "../src/lib/inngest.js";

import chatRoutes from "../src/routes/chatRoutes.js";
import sessionRoutes from "../src/routes/sessionRoute.js";
import userRoutes from "../src/routes/userRoutes.js";

const app = express();

app.use(express.json());

// CORS Configuration for production and development
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  ENV.CLIENT_URL || "http://localhost:5173",
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
].filter(Boolean);

app.use(
  cors({
    origin: ENV.NODE_ENV === "development" ? true : allowedOrigins,
    credentials: true,
  })
);

app.use(clerkMiddleware());

app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/chat", chatRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/user", userRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({ msg: "api is up and running" });
});

// Connect DB before handling requests
let dbConnected = false;

const ensureDbConnection = async (req, res, next) => {
  if (!dbConnected) {
    try {
      await connectDB();
      dbConnected = true;
    } catch (error) {
      console.error("Database connection error:", error);
      return res.status(500).json({ error: "Database connection failed" });
    }
  }
  next();
};

app.use(ensureDbConnection);

export default app;
