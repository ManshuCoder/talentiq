import { chatClient, streamClient } from "../lib/stream.js";
import { Session } from "../lib/db.js";

export async function createSession(req, res) {
  try {
    console.log("Creating session - Body:", req.body);
    console.log("Creating session - User:", req.user);
    
    const { problem, difficulty } = req.body;
    const userId = req.user._id;
    const clerkId = req.user.clerkId;

    if (!problem || !difficulty) {
      return res.status(400).json({ message: "Problem and difficulty are required" });
    }

    const callId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const session = await Session.create({ problem, difficulty, host: userId, callId });

    await streamClient.video.call("default", callId).getOrCreate({
      data: {
        created_by_id: clerkId,
        custom: { problem, difficulty, sessionId: session._id.toString() },
      },
    });

    const channel = chatClient.channel("messaging", callId, {
      name: `${problem} Session`,
      created_by_id: clerkId,
      members: [clerkId],
    });

    await channel.create();

    res.status(201).json({ session });
  } catch (error) {
    console.log("Error in createSession controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getActiveSessions(_, res) {
  try {
    const sessions = await Session.find({ status: "active" })
      .populate("host", "name profileImage email clerkId")
      .populate("participant", "name profileImage email clerkId")
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ sessions });
  } catch (error) {
    console.log("Error in getActiveSessions controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getMyRecentSessions(req, res) {
  try {
    const userId = req.user._id;

    const sessions = await Session.find({
      status: "completed",
      $or: [{ host: userId }, { participant: userId }],
    })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ sessions });
  } catch (error) {
    console.log("Error in getMyRecentSessions controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getSessionById(req, res) {
  try {
    const { id } = req.params;
    console.log("Getting session by ID:", id);

    let session = await Session.findById(id);
    
    if (!session) {
      console.log("Session not found for ID:", id);
      return res.status(404).json({ message: "Session not found" });
    }

    // Populate host and participant if they exist
    if (session.populate) {
      session = await session.populate("host", "name email profileImage clerkId");
      session = await session.populate("participant", "name email profileImage clerkId");
    }

    res.status(200).json({ session });
  } catch (error) {
    console.error("Error in getSessionById controller:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
}

export async function joinSession(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const clerkId = req.user.clerkId;

    console.log("Joining session - ID:", id, "UserId:", userId);

    const session = await Session.findById(id);

    if (!session) {
      console.log("Session not found for ID:", id);
      return res.status(404).json({ message: "Session not found" });
    }

    console.log("Session found - Status:", session.status, "Host:", session.host, "Participant:", session.participant);

    if (session.status !== "active") {
      console.log("Session is not active, status:", session.status);
      return res.status(400).json({ message: "Cannot join a completed session" });
    }

    const hostId = typeof session.host === 'object' ? session.host._id || session.host : session.host;
    if (hostId?.toString() === userId.toString()) {
      console.log("Host trying to join own session");
      return res.status(400).json({ message: "Host cannot join their own session as participant" });
    }

    if (session.participant) {
      console.log("Session already has participant");
      return res.status(409).json({ message: "Session is full" });
    }

    session.participant = userId;
    await session.save();

    const channel = chatClient.channel("messaging", session.callId);
    await channel.addMembers([clerkId]);

    res.status(200).json({ session });
  } catch (error) {
    console.error("Error in joinSession controller:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
}

export async function endSession(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    console.log("Ending session - ID:", id, "UserId:", userId);

    const session = await Session.findById(id);

    if (!session) return res.status(404).json({ message: "Session not found" });

    console.log("Session found - Host:", session.host, "User ID:", userId);

    // Handle both populated host object and raw ID
    const hostId = typeof session.host === 'object' ? session.host._id || session.host : session.host;
    
    console.log("Host ID comparison - hostId:", hostId, "userId:", userId);

    if (hostId?.toString() !== userId.toString()) {
      console.log("User is not the host, denying access");
      return res.status(403).json({ message: "Only the host can end the session" });
    }

    if (session.status === "completed") {
      return res.status(400).json({ message: "Session is already completed" });
    }

    const call = streamClient.video.call("default", session.callId);
    await call.delete({ hard: true });

    const channel = chatClient.channel("messaging", session.callId);
    await channel.delete();

    session.status = "completed";
    await session.save();

    res.status(200).json({ session, message: "Session ended successfully" });
  } catch (error) {
    console.log("Error in endSession controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
