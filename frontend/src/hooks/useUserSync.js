import { useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import axiosInstance from "../lib/axios";

export const useUserSync = () => {
  const { user, isSignedIn } = useUser();

  useEffect(() => {
    const syncUser = async () => {
      if (!isSignedIn || !user) return;

      try {
        // Try to sync the user with the backend
        await axiosInstance.post("/user/sync");
        console.log("User synced successfully");
      } catch (error) {
        // Only log if it's not a "user already exists" error
        if (error.response?.status !== 200) {
          console.error("Error syncing user:", error);
        }
      }
    };

    syncUser();
  }, [isSignedIn, user]);
};
