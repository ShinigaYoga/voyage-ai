"use client";

import React, { useState } from "react";
import Link from "next/link";
import { DESTINATIONS } from "@/lib/data/destinations";
import { PageHeader } from "@/components/layout/PageHeader";
import { Chip } from "@/components/ui/Chip";

export default function ExplorePage() {
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = [
    { label: "All", icon: "🌍" },
    { label: "Beach", icon: "🏖️" },
    { label: "Mountain", icon: "⛰️" },
    { label: "Heritage", icon: "🏛️" },
    { label: "City", icon: "🏙️" },
    { label: "Lake", icon: "🏞️" },
  ];

  const filteredDestinations = activeCategory === "All" 
    ? DESTINATIONS 
    : DESTINATIONS.filter(d => d.type.toLowerCase() === activeCategory.toLowerCase());

  return (
    <div className="min-h-screen bg-cream-50  pb-24 md:pb-12">
      <PageHeader title="Explore" showBack={false} />
      
      <div className="px-6 py-4 overflow-x-auto hide-scrollbar z-10 relative">
        <div className="flex gap-3 w-max">
          {categories.map((cat) => (
            <Chip 
              key={cat.label} 
              active={activeCategory === cat.label}
              onClick={() => setActiveCategory(cat.label)}
              icon={cat.icon}
            >
              {cat.label}
            </Chip>
          ))}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 md:px-8 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDestinations.map(dest => (
            <Link key={dest.id} href={`/destination/${dest.slug}`} className="block group">
              <div className="bg-white  rounded-cardLg shadow-sm border border-cream-200 overflow-hidden hover:shadow-md hover:border-sage-300 transition-all h-full flex flex-col">
                <div className={`h-32 bg-gradient-to-br ${dest.heroBg || 'from-sky-300 to-sage-200'} relative flex items-center justify-center text-5xl`}>
                  {dest.image}
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-display font-bold text-lg text-ink-900 group-hover:text-sage-700 transition-colors">{dest.name}</h3>
                    <span className="text-[10px] uppercase font-bold text-ink-500 bg-cream-100  px-2 py-1 rounded">{dest.type}</span>
                  </div>
                  <p className="text-sm text-ink-600 line-clamp-2 mb-4 flex-1">{dest.tagline}</p>
                  <div className="text-xs font-semibold text-sage-600 flex items-center gap-1 mt-auto">
                    Explore destination &rarr;
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {filteredDestinations.length === 0 && (
          <div className="text-center py-12 text-ink-500">
            No destinations found for this category.
          </div>
        )}
      </main>
    </div>
  );
}
