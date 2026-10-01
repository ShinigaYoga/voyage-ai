"use client";

import { useEffect, useState } from "react";
import { UserProfile } from "@/lib/types";
import { IndexedDbUserRepository } from "@/lib/repositories/indexeddb/IndexedDbUserRepository";

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    let active = true;
    const repo = new IndexedDbUserRepository();
    const loadProfile = async () => {
      try {
        const next = await repo.getProfile();
        if (active) setProfile(next);
      } catch (error) {
        console.error("[profile] failed to load profile", error);
      }
    };
    const handleProfileUpdate = (event: Event) => {
      const updated = (event as CustomEvent<UserProfile>).detail;
      if (updated) setProfile(updated);
      else void loadProfile();
    };

    void loadProfile();
    window.addEventListener("profile-updated", handleProfileUpdate);
    return () => {
      active = false;
      window.removeEventListener("profile-updated", handleProfileUpdate);
    };
  }, []);

  return profile;
}

export function getProfileDisplayName(profile: UserProfile | null): string {
  return profile?.name.trim() || profile?.email?.split("@")[0]?.trim() || "Traveler";
}
