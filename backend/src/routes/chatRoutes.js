import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import { streamClient } from "../lib/stream.js";

const router = express.Router();

router.get("/token", protectRoute, async (req, res) => {
    try {
        const userId = req.user.clerkId;
        const userName = req.user.name;
        const userImage = req.user.profileImage;

        // Create a Stream token for both video and chat access
        const token = streamClient.createToken(userId);
        res.status(200).json({ token, userId, userName, userImage });
    } catch (error) {
        console.error("Error generating token:", error);
        res.status(500).json({ message: "Error generating token" });
    }
});

export default router;
