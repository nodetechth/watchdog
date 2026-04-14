import { kv } from "@vercel/kv";
import { User, UserStore } from "../types";

function userKey(userId: string): string {
  return `user:${userId}`;
}

export const vercelUserStore: UserStore = {
  async getUser(userId: string): Promise<User | null> {
    const user = await kv.get<User>(userKey(userId));
    return user;
  },

  async createUser(user: User): Promise<void> {
    await kv.set(userKey(user.userId), user);
  },

  async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    const existingUser = await kv.get<User>(userKey(userId));

    if (!existingUser) {
      throw new Error(`User ${userId} not found`);
    }

    const updatedUser: User = {
      ...existingUser,
      ...updates,
    };

    await kv.set(userKey(userId), updatedUser);
  },
};
