import mongoose from "mongoose";
import { ENV } from "./env.js";
import { mockUser, mockSession } from "./mockDb.js";

let dbConnected = false;
export let User = null;
export let Session = null;

export const connectDB = async () => {
  try {
    if (!ENV.DB_URL) {
      console.warn("⚠️  DB_URL not set. Using mock in-memory database.");
      User = mockUser;
      Session = mockSession;
      dbConnected = false;
      return;
    }
    console.log("Connecting to DB...");
    const conn = await mongoose.connect(ENV.DB_URL, { serverSelectionTimeoutMS: 5000 });
    console.log("✅ Connected to MongoDB:", conn.connection.host);
    
    // Import real models after successful connection
    const userModule = await import("../models/User.js");
    const sessionModule = await import("../models/Session.js");
    User = userModule.default;
    Session = sessionModule.default;
    dbConnected = true;
  } catch (error) {
    console.error("❌ Error connecting to MongoDB", error.message);
    console.warn("⚠️  Falling back to mock in-memory database.");
    User = mockUser;
    Session = mockSession;
    dbConnected = false;
  }
};

export const isDBConnected = () => dbConnected;
