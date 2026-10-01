"use client";

import React, { useState, useEffect } from "react";
import { Activity, ActivityCategory } from "@/lib/types";
import { X } from "lucide-react";
import { IconButton } from "../ui/IconButton";
import { Button } from "../ui/Button";

interface ActivityEditSheetProps {
  activity: Activity | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (activity: Activity) => void;
}

export function ActivityEditSheet({ activity, isOpen, onClose, onSave }: ActivityEditSheetProps) {
  const [formData, setFormData] = useState<Partial<Activity>>({});

  useEffect(() => {
    if (activity) {
      setFormData({ ...activity });
    } else {
      setFormData({
        name: "",
        location: "",
        startTime: "10:00",
        durationMinutes: 60,
        price: 0,
        category: "culture",
        description: "",
      });
    }
  }, [activity, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.startTime || !formData.category) return;
    onSave(formData as Activity);
  };

  const categories: ActivityCategory[] = ['food', 'culture', 'nature', 'nightlife', 'rest', 'shopping', 'transport'];

  return (
    <>
      <div 
        className="fixed inset-0 bg-ink-900/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      <div className={`
        fixed z-50 bg-white  shadow-float flex flex-col
        transition-transform duration-300 ease-out
        md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[480px] md:h-auto md:max-h-[90vh] md:rounded-cardLg
        bottom-0 left-0 right-0 h-[85vh] rounded-t-cardLg
      `}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-cream-200 shrink-0">
          <h2 className="text-xl font-display font-bold text-ink-900">
            {activity ? 'Edit Activity' : 'Add Activity'}
          </h2>
          <IconButton icon={<X size={20} />} variant="ghost" onClick={onClose} />
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Name</label>
            <input 
              required
              type="text" 
              className="w-full px-4 py-2 bg-cream-50 border border-cream-200 rounded-xl focus:outline-none focus:border-sage-500 focus:ring-1 focus:ring-sage-500 transition-shadow"
              value={formData.name || ""}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Start Time</label>
              <input 
                required
                type="time" 
                className="w-full px-4 py-2 bg-cream-50 border border-cream-200 rounded-xl focus:outline-none focus:border-sage-500"
                value={formData.startTime || "10:00"}
                onChange={e => setFormData({...formData, startTime: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Duration (min)</label>
              <input 
                required
                type="number" 
                min="15"
                step="15"
                className="w-full px-4 py-2 bg-cream-50 border border-cream-200 rounded-xl focus:outline-none focus:border-sage-500"
                value={formData.durationMinutes || 60}
                onChange={e => setFormData({...formData, durationMinutes: parseInt(e.target.value)})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Location</label>
            <input 
              type="text" 
              className="w-full px-4 py-2 bg-cream-50 border border-cream-200 rounded-xl focus:outline-none focus:border-sage-500"
              value={formData.location || ""}
              onChange={e => setFormData({...formData, location: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Price (₹ per person)</label>
              <input 
                required
                type="number" 
                min="0"
                className="w-full px-4 py-2 bg-cream-50 border border-cream-200 rounded-xl focus:outline-none focus:border-sage-500"
                value={formData.price || 0}
                onChange={e => setFormData({...formData, price: parseInt(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Category</label>
              <select 
                required
                className="w-full px-4 py-2 bg-cream-50 border border-cream-200 rounded-xl focus:outline-none focus:border-sage-500 capitalize"
                value={formData.category || "culture"}
                onChange={e => setFormData({...formData, category: e.target.value as ActivityCategory})}
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Notes</label>
            <textarea 
              rows={3}
              className="w-full px-4 py-2 bg-cream-50 border border-cream-200 rounded-xl focus:outline-none focus:border-sage-500 resize-none"
              value={formData.description || ""}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>
        </form>

        <div className="p-4 border-t border-cream-200 bg-cream-50 shrink-0 md:rounded-b-cardLg flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Save Activity</Button>
        </div>
      </div>
    </>
  );
}
