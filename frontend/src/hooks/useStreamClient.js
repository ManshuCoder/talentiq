import { useState, useEffect } from "react";
import { StreamChat } from "stream-chat";
import toast from "react-hot-toast";
import { initializeStreamClient, disconnectStreamClient } from "../lib/stream";
import { sessionApi } from "../api/sessions";

function useStreamClient(session, loadingSession, isHost, isParticipant) {
  const [streamClient, setStreamClient] = useState(null);
  const [call, setCall] = useState(null);
  const [chatClient, setChatClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [isInitializingCall, setIsInitializingCall] = useState(true);

  useEffect(() => {
    let videoCall = null;
    let chatClientInstance = null;

    const initCall = async () => {
      if (!session?.callId) {
        console.log("No callId in session");
        setIsInitializingCall(false);
        return;
      }
      if (!isHost && !isParticipant) {
        console.log("User is neither host nor participant, skipping call init");
        setIsInitializingCall(false);
        return;
      }
      if (session.status === "completed") {
        console.log("Session is completed, skipping call init");
        setIsInitializingCall(false);
        return;
      }

      console.log("Initializing video call...", { isHost, isParticipant, callId: session.callId });

      try {
        const { token, userId, userName, userImage } = await sessionApi.getStreamToken();

        const client = await initializeStreamClient(
          {
            id: userId,
            name: userName,
            image: userImage,
          },
          token
        );

        setStreamClient(client);

        videoCall = client.call("default", session.callId);
        console.log("Joining video call...");
        
        // Join the call first
        await videoCall.join({ create: true });
        console.log("Call joined successfully");
        
        // Enable camera and microphone after joining
        // Note: Browser will prompt for permissions if not already granted
        try {
          console.log("Enabling camera...");
          await videoCall.camera.enable();
          console.log("Camera enabled");
        } catch (cameraError) {
          console.warn("Camera enable error (user may need to grant permission):", cameraError);
        }
        
        try {
          console.log("Enabling microphone...");
          await videoCall.microphone.enable();
          console.log("Microphone enabled");
        } catch (micError) {
          console.warn("Microphone enable error (user may need to grant permission):", micError);
        }
        
        setCall(videoCall);
        console.log("Call initialized and ready");

        const apiKey = import.meta.env.VITE_STREAM_API_KEY;
        chatClientInstance = StreamChat.getInstance(apiKey);

        await chatClientInstance.connectUser(
          {
            id: userId,
            name: userName,
            image: userImage,
          },
          token
        );
        setChatClient(chatClientInstance);

        const chatChannel = chatClientInstance.channel("messaging", session.callId);
        await chatChannel.watch();
        setChannel(chatChannel);
      } catch (error) {
        toast.error("Failed to join video call");
        console.error("Error init call", error);
      } finally {
        setIsInitializingCall(false);
      }
    };

    if (session && !loadingSession) initCall();

    // cleanup - performance reasons
    return () => {
      // iife
      (async () => {
        try {
          if (videoCall) await videoCall.leave();
          if (chatClientInstance) await chatClientInstance.disconnectUser();
          await disconnectStreamClient();
        } catch (error) {
          console.error("Cleanup error:", error);
        }
      })();
    };
  }, [session, loadingSession, isHost, isParticipant]);

  return {
    streamClient,
    call,
    chatClient,
    channel,
    isInitializingCall,
  };
}

export default useStreamClient;
