"use client";

import React, { useEffect, useState, useRef } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { IndexedDbUserRepository } from "@/lib/repositories/indexeddb/IndexedDbUserRepository";
import { IndexedDbTripRepository } from "@/lib/repositories/indexeddb/IndexedDbTripRepository";
import { UserProfile } from "@/lib/types";
import { Camera, MapPin, Globe, Users, CreditCard, Bell, ChevronLeft } from "lucide-react";
import { useToast } from "@/lib/hooks/useToast";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState({ trips: 0, places: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const userRepo = useRef(new IndexedDbUserRepository()).current;
  const tripRepo = useRef(new IndexedDbTripRepository()).current;

  useEffect(() => {
    console.log("[ProfilePage] mount effect starting");
    let cancelled = false;

    async function loadData() {
      try {
        const p = await userRepo.getProfile();
        if (!cancelled) {
          setProfile(p);
          setEditForm(p);
        }

        const trips = await tripRepo.list();
        if (!cancelled) {
          const uniquePlaces = new Set(trips.map(t => t.destination)).size;
          setStats({ trips: trips.length, places: uniquePlaces });
          console.log("[ProfilePage] mount effect done");
        }
      } catch (e) {
        console.error("[ProfilePage] mount effect threw:", e);
      }
    }
    loadData();

    return () => {
      cancelled = true;
    };
  }, [userRepo, tripRepo]);

  const handleSave = async () => {
    if (!profile) return;
    const prev = profile;
    const optimistic = { ...profile, ...editForm };
    setProfile(optimistic);
    try {
      const updated = await userRepo.upsert(editForm);
      setProfile(updated);
      setEditForm(updated);
      setIsEditing(false);
      showToast("Profile updated successfully");
    } catch (e) {
      console.error("[Profile] save failed:", e);
      setProfile(prev);
      setEditForm(prev);
      showToast("Couldn't save. Try again.");
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("Image too large. Max 5 MB.");
      return;
    }

    setIsUploading(true);
    const prev = profile;
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) throw new Error("Upload failed");
      
      const data = await res.json();
      
      setProfile(p => p ? { ...p, avatarUrl: data.url } : null);
      const updated = await userRepo.upsert({ avatarUrl: data.url });
      setProfile(updated);
      setEditForm(prevForm => ({ ...prevForm, avatarUrl: data.url }));
      showToast("Avatar updated");
    } catch (err: any) {
      console.error("[Profile] avatar save failed:", err);
      setProfile(prev);
      showToast("Couldn't save avatar. Try again.");
    } finally {
      setIsUploading(false);
    }
  };

  if (!profile) return <div className="p-8 text-center text-ink-500 animate-pulse">Loading profile...</div>;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 md:px-0">
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm font-medium text-sage-600 hover:text-sage-800 transition-colors mb-6 md:hidden"
      >
        <ChevronLeft size={16} />
        Back
      </button>

      {/* Header */}
      <div className="bg-white  rounded-cardLg p-6 md:p-8 shadow-sm border border-cream-200 mb-6 flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
        <div className="relative group">
          <Avatar size="xl" src={profile.avatarUrl} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="absolute bottom-0 right-0 w-8 h-8 bg-sage-600 text-white rounded-full flex items-center justify-center shadow-soft border-2 border-white hover:bg-sage-700 transition-colors disabled:opacity-50"
          >
            <Camera size={14} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarUpload}
          />
        </div>
        
        <div className="flex-1">
          {isEditing ? (
            <input 
              type="text" 
              value={editForm.name || ""} 
              onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              className="font-display font-bold text-3xl text-ink-900 border-b-2 border-sage-200 focus:border-sage-500 outline-none bg-transparent mb-2 w-full max-w-xs text-center md:text-left"
            />
          ) : (
            <h1 className="font-display font-bold text-3xl text-ink-900 mb-1">{profile.name}</h1>
          )}
          
          <div className="flex items-center justify-center md:justify-start gap-1 text-ink-500 text-sm mb-4">
            <MapPin size={14} />
            {isEditing ? (
              <input 
                type="text"
                value={editForm.homeCity || ""}
                onChange={e => setEditForm(prev => ({ ...prev, homeCity: e.target.value }))}
                className="border-b border-sage-200 outline-none bg-transparent w-32"
                placeholder="Home City"
              />
            ) : (
              <span>{profile.homeCity}</span>
            )}
          </div>
          
          <div className="flex justify-center md:justify-start gap-6">
            <div>
              <div className="font-bold text-ink-900 text-lg">{stats.trips}</div>
              <div className="text-xs text-ink-500 font-medium uppercase tracking-wider">Trips</div>
            </div>
            <div>
              <div className="font-bold text-ink-900 text-lg">{stats.places}</div>
              <div className="text-xs text-ink-500 font-medium uppercase tracking-wider">Places</div>
            </div>
          </div>
        </div>
        
        <div>
          {isEditing ? (
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => { setIsEditing(false); setEditForm(profile); }}>Cancel</Button>
              <Button onClick={handleSave}>Save</Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(true)}>Edit Profile</Button>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="bg-white  rounded-cardLg shadow-sm border border-cream-200 overflow-hidden">
        <div className="p-6 border-b border-cream-100">
          <h3 className="font-display font-bold text-lg text-ink-900 mb-4">About Me</h3>
          {isEditing ? (
            <textarea 
              value={editForm.bio || ""}
              onChange={e => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
              className="w-full p-3 bg-cream-50 rounded-lg border border-cream-200 outline-none focus:border-sage-400 resize-none h-24"
              placeholder="Write a short bio..."
            />
          ) : (
            <p className="text-ink-700 leading-relaxed">{profile.bio}</p>
          )}
        </div>
        
        <div className="p-6">
          <h3 className="font-display font-bold text-lg text-ink-900 mb-4">Preferences</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-cream-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-coral-100 text-coral-600 flex items-center justify-center">
                  <CreditCard size={16} />
                </div>
                <div>
                  <div className="font-medium text-ink-900 text-sm">Currency</div>
                  <div className="text-xs text-ink-500">Default for budgeting</div>
                </div>
              </div>
              {isEditing ? (
                <select 
                  value={editForm.currency || "USD"}
                  onChange={e => setEditForm(prev => ({ ...prev, currency: e.target.value }))}
                  className="bg-white  border border-cream-200 rounded p-1 text-sm outline-none"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              ) : (
                <div className="font-semibold text-ink-700">{profile.currency}</div>
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-cream-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-sage-100 text-sage-600 flex items-center justify-center">
                  <Users size={16} />
                </div>
                <div>
                  <div className="font-medium text-ink-900 text-sm">Travelers</div>
                  <div className="text-xs text-ink-500">Default party size</div>
                </div>
              </div>
              {isEditing ? (
                <input 
                  type="number"
                  min="1"
                  value={editForm.defaultTravelers || 2}
                  onChange={e => setEditForm(prev => ({ ...prev, defaultTravelers: parseInt(e.target.value) || 1 }))}
                  className="bg-white  border border-cream-200 rounded p-1 text-sm w-16 text-center outline-none"
                />
              ) : (
                <div className="font-semibold text-ink-700">{profile.defaultTravelers}</div>
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-cream-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-sage-100 text-sage-600 flex items-center justify-center">
                  <Globe size={16} />
                </div>
                <div>
                  <div className="font-medium text-ink-900 text-sm">Travel Styles</div>
                  <div className="text-xs text-ink-500">Your favorite types of trips</div>
                </div>
              </div>
              {isEditing ? (
                  <input 
                  type="text"
                  value={editForm.travelStyles?.join(", ") || ""}
                  onChange={e => setEditForm(prev => ({ ...prev, travelStyles: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))}
                  className="bg-white  border border-cream-200 rounded p-1 text-sm outline-none text-right w-36"
                  placeholder="e.g. Culture, Nature"
                />
              ) : (
                <div className="font-semibold text-ink-700 text-sm">{profile.travelStyles.join(", ")}</div>
              )}
            </div>
            
            <div className="flex items-center justify-between p-3 bg-cream-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center">
                  <Bell size={16} />
                </div>
                <div>
                  <div className="font-medium text-ink-900 text-sm">Notifications</div>
                  <div className="text-xs text-ink-500">Trip updates and reminders</div>
                </div>
              </div>
              {isEditing ? (
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={editForm.notificationsEnabled}
                    onChange={e => setEditForm(prev => ({ ...prev, notificationsEnabled: e.target.checked }))}
                  />
                  <div className="w-9 h-5 bg-cream-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-cream-300  after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sage-600"></div>
                </label>
              ) : (
                <div className="font-semibold text-ink-700 text-sm">{profile.notificationsEnabled ? "On" : "Off"}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
