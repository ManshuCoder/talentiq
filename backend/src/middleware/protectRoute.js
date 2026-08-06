import { clerkClient, requireAuth } from "@clerk/express";
import User from "../models/User.js";
import { upsertStreamUser } from "../lib/stream.js";

export const protectRoute = [
  requireAuth(),
  async (req, res, next) => {
    try {
      const clerkId = req.auth().userId;

      if (!clerkId) return res.status(401).json({ message: "Unauthorized - invalid token" });

      // find user in db by clerk ID
      let user = await User.findOne({ clerkId });

      if (!user) {
        // Auto-sync user if they don't exist in the DB yet (prevents 404 race conditions)
        const clerkUserData = await clerkClient.users.getUser(clerkId);
        const email = clerkUserData.emailAddresses[0]?.emailAddress;
        const name = `${clerkUserData.firstName || ""} ${clerkUserData.lastName || ""}`.trim() || "User";
        const profileImage = clerkUserData.imageUrl || "";

        // Link existing account by email, or create a new one
        user = await User.findOneAndUpdate(
          { email: email },
          { clerkId, name, profileImage },
          { new: true, upsert: true }
        );
        
        // Ensure they exist in Stream as well
        await upsertStreamUser({
          id: user.clerkId.toString(),
          name: user.name,
          image: user.profileImage,
        });
      }

      // attach user to req
      req.user = user;

      next();
    } catch (error) {
      console.error("Error in protectRoute middleware", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
];
