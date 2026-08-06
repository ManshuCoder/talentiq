import mongoose from "mongoose";
import { ENV } from "./env.js";

export const connectDB = async () => {
  try {
    if (!ENV.DB_URL) {
      throw new Error("DB_URL is not defined in environment variables");
    }
    const conn = await mongoose.connect(ENV.DB_URL);
    console.log("✅ Connected to MongoDB:", conn.connection.host);
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error.message);
    
    // Provide a helpful hint for common connection string errors (like unencoded @ symbols)
    if (error.message.includes("URI") || error.message.includes("must be a string")) {
      console.error("💡 Hint: Ensure your MongoDB password does not contain unencoded special characters like '@'. Use '%40' instead.");
    }
    
    process.exit(1); // 0 means success, 1 means failure
  }
};
// export default connectDB; // Assuming this function is called elsewhere