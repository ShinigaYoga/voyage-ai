"use client";

import React, { useState, useEffect, useRef } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { SearchBar } from "@/components/ui/SearchBar";
import { Chip } from "@/components/ui/Chip";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LandscapeFooter } from "@/components/illustrations/LandscapeFooter";
import { Compass, Map, Tent, Castle, Moon, Anchor, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IndexedDbTripRepository } from "@/lib/repositories/indexeddb/IndexedDbTripRepository";
import { DESTINATIONS, searchDestinations, DestinationMetadata } from "@/lib/data/destinations";

const categories = [
  { label: "Hikes & Trails", icon: <Map size={16} /> },
  { label: "Beaches", icon: <Compass size={16} /> },
  { label: "Cozy Cabins", icon: <Tent size={16} /> },
  { label: "Heritage", icon: <Castle size={16} /> },
  { label: "Nightlife", icon: <Moon size={16} /> },
  { label: "Lakeside", icon: <Anchor size={16} /> },
];

export default function HomePage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [tripCount, setTripCount] = useState(0);
  const [recIndex, setRecIndex] = useState(0);
  const [lastOpenedTripId, setLastOpenedTripId] = useState<string | null>(null);
  const [lastOpenedTripName, setLastOpenedTripName] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DestinationMetadata[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Recommendation rotation
    setRecIndex(Math.floor(Math.random() * DESTINATIONS.length));
    
    // Load last trip and count
    async function loadTrips() {
      const repo = new IndexedDbTripRepository();
      const trips = await repo.list();
      setTripCount(trips.length);
      
      const lastId = localStorage.getItem('lastOpenedTripId');
      const lastName = localStorage.getItem('lastOpenedTripName');
      if (lastId) {
        setLastOpenedTripId(lastId);
        setLastOpenedTripName(lastName);
      }
    }
    loadTrips();

    // Click outside to close search
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle Search
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      setSearchResults(searchDestinations(searchQuery));
      setIsSearchOpen(true);
    } else {
      setSearchResults([]);
      setIsSearchOpen(false);
    }
  }, [searchQuery]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsSearchOpen(false);
      setSearchQuery("");
    } else if (e.key === "Enter" && searchResults.length > 0) {
      router.push(`/destination/${searchResults[0].slug}`);
    }
  };

  const handleStartPlanning = async () => {
    try {
      const repo = new IndexedDbTripRepository();
      const newTrip = await repo.create({
        name: "Untitled Trip",
        destination: "Unknown",
        travelers: 1,
      });
      // Sync to server so it exists on chat page load
      await fetch("/api/trips/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip: newTrip }),
      });
      router.push('/chat');
    } catch (e) {
      console.error(e);
      router.push('/chat'); // Fallback
    }
  };

  const handleCategoryClick = (label: string) => {
    if (activeCategory === label) {
      setActiveCategory(null);
    } else {
      setActiveCategory(label);
    }
  };

  const filteredDestinations = activeCategory 
    ? DESTINATIONS.filter(d => d.categories.includes(activeCategory))
    : DESTINATIONS;

  // Use the filtered list for recommendation if possible, else fallback to full
  const recommendationList = filteredDestinations.length > 0 ? filteredDestinations : DESTINATIONS;
  const currentRec = recommendationList[recIndex % recommendationList.length];

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-6 pt-6 pb-2 relative z-50">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="hidden md:inline-flex mb-2 px-3 py-1 bg-sage-100 text-sage-800 rounded-pill text-xs font-semibold">
              Handcrafted Expedition Stream
            </div>
            <h1 className="font-display font-bold text-3xl text-ink-900">Hello, traveler 👋</h1>
          </div>
          <Avatar src="https://i.pravatar.cc/150?img=32" />
        </div>

        <div ref={searchRef} className="relative w-full">
          <SearchBar 
            placeholder="Where to next? Try 'Goa for 4 days'" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            onFocus={() => { if(searchQuery) setIsSearchOpen(true) }}
          />
          
          {/* Search Dropdown */}
          {isSearchOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-cream-200 rounded-cardLg shadow-float border border-cream-200 overflow-hidden z-50 max-h-[300px] overflow-y-auto">
              {searchResults.length > 0 ? (
                searchResults.map(dest => (
                  <Link 
                    key={dest.id} 
                    href={`/destination/${dest.slug}`}
                    className="flex items-center gap-4 p-4 hover:bg-cream-50 transition-colors border-b border-cream-100 last:border-0"
                    onClick={() => setIsSearchOpen(false)}
                  >
                    <div className="w-12 h-12 rounded-xl bg-sage-50 flex items-center justify-center text-2xl shrink-0">
                      {dest.image}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-ink-900">{dest.name}</div>
                      <div className="text-xs text-ink-500 truncate">{dest.description}</div>
                    </div>
                    <ChevronRight size={18} className="text-ink-400" />
                  </Link>
                ))
              ) : (
                <div className="p-6 text-center text-ink-500 text-sm">
                  No matches found. Try 'Goa' or 'Manali'.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-4 overflow-x-auto hide-scrollbar z-10 relative">
        <div className="flex gap-3 w-max">
          {categories.map((cat) => (
            <Chip 
              key={cat.label} 
              active={activeCategory === cat.label}
              onClick={() => handleCategoryClick(cat.label)}
              icon={cat.icon}
            >
              {cat.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="px-6 py-4 flex flex-col md:flex-row gap-6 relative z-10">
        {/* Left Column / Mobile Top */}
        <div className="flex-1 flex flex-col gap-8">
          
          {lastOpenedTripId && (
            <Link href={`/trip/${lastOpenedTripId}`}>
              <Card className="p-4 bg-sage-50 border border-sage-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="text-xs font-semibold text-sage-600 mb-1">CONTINUE PLANNING</div>
                  <div className="font-display font-bold text-ink-900">{lastOpenedTripName || 'Your Trip'}</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-white dark:bg-cream-200 flex items-center justify-center text-sage-600 shadow-sm">
                  <ChevronRight size={20} />
                </div>
              </Card>
            </Link>
          )}

          <Card className="p-6 relative bg-sage-100 border-none overflow-hidden">
            <div className="relative z-10 md:w-2/3">
              <h2 className="font-display font-bold text-2xl text-sage-800 mb-2">Plan any trip.<br/>One conversation.</h2>
              <p className="text-sage-700 mb-6 text-sm">Tell us where you're dreaming of — we'll map the route, stays, food, and forecasts.</p>
              <Button variant="accent" className="mb-3" onClick={handleStartPlanning}>Start planning &rarr;</Button>
              <div className="text-xs text-sage-600 font-medium">2-min setup &bull; Powered by Voyage Companion</div>
            </div>
            <div className="absolute right-0 bottom-0 w-48 h-48 opacity-30 md:opacity-100 pointer-events-none">
              <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
                <circle cx="50" cy="50" r="40" fill="var(--color-sage-200)"/>
                <path d="M20 70 Q50 30 80 70 Z" fill="var(--color-sage-400)"/>
                <path d="M40 70 L50 50 L60 70 Z" fill="var(--color-coral-400)"/>
                <path d="M80 70 Q85 40 90 70 Z" fill="var(--color-sage-600)"/>
              </svg>
            </div>
          </Card>

          <div>
            <h3 className="font-display font-bold text-xl text-ink-900 mb-4">Popular Destinations</h3>
            {filteredDestinations.length === 0 ? (
              <div className="text-sm text-ink-500 italic py-4">No destinations match this category yet.</div>
            ) : (
              <div className="flex overflow-x-auto md:grid md:grid-cols-2 gap-4 pb-4 hide-scrollbar">
                {filteredDestinations.map((dest) => (
                  <Link key={dest.id} href={`/destination/${dest.slug}`} className="min-w-[160px] flex-shrink-0">
                    <div className="flex items-center gap-3 bg-white dark:bg-cream-200 p-3 rounded-2xl shadow-sm border border-cream-200 hover:border-sage-300 transition-colors h-full">
                      <div className="w-12 h-12 rounded-xl bg-cream-100 flex items-center justify-center text-2xl shrink-0">
                        {dest.image}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-ink-900 text-sm line-clamp-1">{dest.name}</div>
                        <div className="text-xs text-ink-500">{dest.trails} trails</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column / Mobile Bottom */}
        <div className="md:w-[350px] shrink-0">
          <h3 className="font-display font-bold text-xl text-ink-900 mb-4 md:hidden">Voyage Pick</h3>
          {currentRec && (
            <Link href={`/destination/${currentRec.slug}`} className="block">
              <Card className="overflow-hidden relative h-[300px] flex flex-col justify-end p-5 hover:shadow-lift transition-shadow group">
                <div className="absolute inset-0 bg-sage-800 flex items-center justify-center text-6xl group-hover:scale-110 transition-transform duration-700">
                  {currentRec.image}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                <div className="relative z-10 text-white">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="sage" className="bg-sage-500/80 text-white border-none backdrop-blur-sm">
                      ★ 4.8 &middot; Voyage pick
                    </Badge>
                    <Badge variant="coral" className="font-bold">
                      {currentRec.avgCostPerDay}
                    </Badge>
                  </div>
                  <h4 className="font-display font-bold text-2xl mb-1">{currentRec.name}</h4>
                  <p className="text-white/80 text-sm mb-4 line-clamp-2">{currentRec.tagline}</p>
                  <Button variant="ghost" className="w-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md pointer-events-none">
                    Explore &rarr;
                  </Button>
                </div>
              </Card>
            </Link>
          )}
        </div>
      </div>

      <div className="mt-auto pt-10 px-6 text-center text-ink-500 text-sm italic relative z-10">
        "From Goa beaches to Himalayan trails — one conversation, any journey."
      </div>
      
      <div className="mt-4 pointer-events-none">
        <LandscapeFooter />
      </div>
    </div>
  );
}
