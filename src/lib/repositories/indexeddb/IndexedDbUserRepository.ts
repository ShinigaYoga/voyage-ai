import { UserProfile } from "../../types";
import { getDB } from "./db";

const DEFAULT_USER_ID = "default_user";

export class IndexedDbUserRepository {
  async getProfile(): Promise<UserProfile> {
    const db = await getDB();
    if (!db) {
      return this.getDefaultProfile();
    }
    const profile = await db.get("user_profile", DEFAULT_USER_ID);
    if (!profile) {
      const defaults = this.getDefaultProfile();
      await db.put("user_profile", defaults);
      return defaults;
    }
    return profile;
  }

  async upsert(profile: Partial<UserProfile>): Promise<UserProfile> {
    console.log("[UserRepo] upserting profile:", profile);
    const current = await this.getProfile();
    const updated: UserProfile = { ...current, ...profile, id: DEFAULT_USER_ID };
    
    const db = await getDB();
    if (db) {
      await db.put("user_profile", updated);
    }
    return updated;
  }

  async updateProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    return this.upsert(profile);
  }
  
  private getDefaultProfile(): UserProfile {
    return {
      id: DEFAULT_USER_ID,
      name: "Traveler",
      bio: "I love exploring new places and trying local cuisines.",
      currency: "USD",
      defaultTravelers: 2,
      homeCity: "New York, USA",
      travelStyles: ["Culture", "Nature"],
      notificationsEnabled: true,
    };
  }
}
