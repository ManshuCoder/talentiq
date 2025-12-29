import { StreamChat } from "stream-chat";
import { StreamClient } from "@stream-io/node-sdk";
import { ENV } from "./env.js";

const apiKey = ENV.STREAM_API_KEY;
const apiSecret = ENV.STREAM_API_SECRET;

if (!apiKey || !apiSecret) {
  console.warn("⚠️  STREAM_API_KEY or STREAM_API_SECRET is missing. Stream features will not work.");
}

// Create mock clients if keys are missing to prevent crashes
const createMockClient = () => {
  return {
    createToken: (userId) => `mock-token-${userId}`,
    video: {
      call: (type, callId) => ({
        getOrCreate: async (data) => ({ 
          id: callId || `mock-call-${Date.now()}`,
          ...data 
        }),
        delete: async (options) => ({ success: true }),
      }),
    },
  };
};

const createMockChatClient = () => {
  return {
    channel: (type, id, data) => ({
      create: async () => ({ id, ...data }),
      addMembers: async (members) => ({ members }),
      delete: async () => ({ success: true }),
    }),
    upsertUser: async (userData) => {
      console.log("Mock: upsertUser called with", userData);
      return userData;
    },
    deleteUser: async (userId) => {
      console.log("Mock: deleteUser called with", userId);
      return { success: true };
    },
  };
};

export const chatClient = (apiKey && apiSecret) 
  ? StreamChat.getInstance(apiKey, apiSecret)
  : createMockChatClient();
  
export const streamClient = (apiKey && apiSecret)
  ? new StreamClient(apiKey, apiSecret)
  : createMockClient();

export const upsertStreamUser = async (userData) => {
  try {
    await chatClient.upsertUser(userData);
    console.log("Stream user upserted successfully:", userData);
  } catch (error) {
    console.error("Error upserting Stream user:", error);
  }
};

export const deleteStreamUser = async (userId) => {
  try {
    await chatClient.deleteUser(userId);
    console.log("Stream user deleted successfully:", userId);
  } catch (error) {
    console.error("Error deleting the Stream user:", error);
  }
};
