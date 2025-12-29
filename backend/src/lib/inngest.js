import { Inngest } from "inngest";
import { connectDB } from "./db.js";
import { deleteStreamUser, upsertStreamUser } from "./stream.js";

export const inngest = new Inngest({ id: "talent-iq" });

const syncUser = inngest.createFunction(
  { id: "sync-user" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    await connectDB();
    
    // Import User after DB connection to ensure it's initialized
    const dbModule = await import("./db.js");
    const User = dbModule.User;

    if (!User) {
      console.error("User model not available. Database may not be connected.");
      return;
    }

    const { id, email_addresses, first_name, last_name, image_url } = event.data;

    const newUser = {
      clerkId: id,
      email: email_addresses[0]?.email_address,
      name: `${first_name || ""} ${last_name || ""}`.trim() || "User",
      profileImage: image_url || "",
    };

    await User.create(newUser);

    await upsertStreamUser({
      id: newUser.clerkId.toString(),
      name: newUser.name,
      image: newUser.profileImage,
    });
  }
);

const deleteUserFromDB = inngest.createFunction(
  { id: "delete-user-from-db" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    await connectDB();
    
    // Import User after DB connection to ensure it's initialized
    const dbModule = await import("./db.js");
    const User = dbModule.User;

    if (!User) {
      console.error("User model not available. Database may not be connected.");
      return;
    }

    const { id } = event.data;
    await User.deleteOne({ clerkId: id });

    await deleteStreamUser(id.toString());
  }
);

export const functions = [syncUser, deleteUserFromDB];
