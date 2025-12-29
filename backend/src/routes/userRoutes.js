import express from "express";
import { clerkClient, requireAuth } from "@clerk/express";
import { User } from "../lib/db.js";
import { upsertStreamUser } from "../lib/stream.js";

const router = express.Router();

// Endpoint to sync current user from Clerk to DB
router.post("/sync", requireAuth(), async (req, res) => {
  try {
    const clerkUser = req.auth;
    const clerkId = clerkUser?.userId;

    if (!clerkId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Check if user already exists
    let user = await User.findOne({ clerkId });

    if (user) {
      return res.status(200).json({ message: "User already exists", user });
    }

    // Get user data from Clerk
    const clerkUserData = await clerkClient.users.getUser(clerkId);

    // Create new user
    const newUser = {
      clerkId: clerkId,
      email: clerkUserData.emailAddresses[0]?.emailAddress,
      name: `${clerkUserData.firstName || ""} ${clerkUserData.lastName || ""}`.trim() || "User",
      profileImage: clerkUserData.imageUrl || "",
    };

    user = await User.create(newUser);

    // Create user in Stream
    await upsertStreamUser({
      id: user.clerkId.toString(),
      name: user.name,
      image: user.profileImage,
    });

    res.status(201).json({ message: "User synced successfully", user });
  } catch (error) {
    console.error("Error in sync user:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
});

// Get current user
router.get("/me", requireAuth(), async (req, res) => {
  try {
    const clerkId = req.auth?.userId;
    const user = await User.findOne({ clerkId });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("Error getting user:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
