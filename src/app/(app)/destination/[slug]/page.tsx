"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Calendar, IndianRupee, Clock, ArrowRight, Sun, Train, Compass } from "lucide-react";
import { IndexedDbTripRepository } from "@/lib/repositories/indexeddb/IndexedDbTripRepository";
import { LandscapeFooter } from "@/components/illustrations/LandscapeFooter";
import Link from "next/link";

export default function DestinationPage() {
  const params = useParams();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  
  const slug = params.slug as string;
  const destination = getDestinationBySlug(slug);

  if (!destination) {
    return (
      <div className="min-h-screen bg-cream-50 dark:bg-[#141412] flex flex-col">
        <PageHeader title="Not Found" showBack />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="text-4xl mb-4">🏜️</div>
          <h2 className="text-xl font-bold text-ink-900 mb-2">Destination not found</h2>
          <p className="text-ink-500 mb-6">We couldn't find the destination you're looking for.</p>
          <Button onClick={() => router.push('/home')}>Back to Home</Button>
        </div>
      </div>
    );
  }

  const handlePlanTrip = async () => {
    setIsCreating(true);
    try {
      const repo = new IndexedDbTripRepository();
      const newTrip = await repo.create({
        name: `Trip to ${destination.name}`,
        destination: destination.name,
        travelers: 2,
      });

      // Navigate immediately — do NOT await server sync
      const prompt = `I want to visit ${destination.name} for 4 days with 2 people.`;
      router.push(`/chat?tripId=${newTrip.id}&prompt=${encodeURIComponent(prompt)}`);

      // Fire-and-forget: sync to server after navigation
      fetch("/api/trips/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip: newTrip }),
      }).catch(err => console.warn("[plan trip sync] failed", err));
    } catch (e) {
      console.error(e);
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-cream-50 dark:bg-[#141412] pb-24 md:pb-12">
      <PageHeader title={destination.name} showBack />
      
      <main className="max-w-4xl mx-auto px-4 md:px-8 mt-6">
        
        {/* Premium Hero Section */}
        <div className={`relative rounded-cardLg mb-8 bg-gradient-to-br ${destination.heroBg} shadow-sm border border-white/20 flex flex-col overflow-hidden`}>
          <div className="p-8 md:p-12 relative z-10 text-white drop-shadow-md">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-2">
              {destination.name}
            </h1>
            <p className="text-lg md:text-xl opacity-90 mb-6 font-medium">
              {destination.tagline}
            </p>
            <div className="flex flex-wrap gap-2">
              {destination.categories.map(cat => (
                <span key={cat} className="bg-black/20 backdrop-blur-md px-3 py-1 rounded-pill text-sm font-medium">
                  {cat}
                </span>
              ))}
            </div>
          </div>
          <div className="w-full mt-auto translate-y-12 opacity-90 mix-blend-overlay">
            <LandscapeFooter scene={destination.heroIllustration} className="w-full" />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Left Column: Quick Stats & Facts */}
          <div className="md:col-span-1 flex flex-col gap-4">
            <Card className="p-5 flex flex-col gap-4 bg-white dark:bg-cream-200 border border-cream-200 shadow-sm">
              <h3 className="font-display font-bold text-ink-900 border-b border-cream-100 pb-2">Trip Overview</h3>
              <div className="flex items-center gap-3">
                <Calendar className="text-sage-600 shrink-0" size={20} />
                <div>
                  <div className="text-xs text-ink-500 uppercase font-bold tracking-wider">Best Season</div>
                  <div className="text-sm font-semibold text-ink-900">{destination.bestSeason}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <IndianRupee className="text-sage-600 shrink-0" size={20} />
                <div>
                  <div className="text-xs text-ink-500 uppercase font-bold tracking-wider">Avg Cost</div>
                  <div className="text-sm font-semibold text-ink-900">{destination.avgCostPerDay} / day</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="text-sage-600 shrink-0" size={20} />
                <div>
                  <div className="text-xs text-ink-500 uppercase font-bold tracking-wider">Ideal Duration</div>
                  <div className="text-sm font-semibold text-ink-900">{destination.idealDuration}</div>
                </div>
              </div>
            </Card>

            {destination.quickFacts && destination.quickFacts.length > 0 && (
              <Card className="p-5 bg-white dark:bg-cream-200 border border-cream-200 shadow-sm">
                <h3 className="font-display font-bold text-ink-900 mb-3 border-b border-cream-100 pb-2">Quick Facts</h3>
                <ul className="space-y-3">
                  {destination.quickFacts.map((fact, idx) => (
                    <li key={idx} className="flex flex-col">
                      <span className="text-xs text-ink-500 font-bold uppercase tracking-wider">{fact.label}</span>
                      <span className="text-sm font-semibold text-ink-900">{fact.value}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          {/* Right Column: Description, Transport, Best Time */}
          <div className="md:col-span-2 flex flex-col gap-8">
            <div>
              <h2 className="text-2xl font-display font-bold text-ink-900 mb-4">About {destination.name}</h2>
              <p className="text-ink-700 leading-relaxed text-lg">
                {destination.description}
              </p>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="p-5 bg-sage-50 border border-sage-100">
                <div className="flex items-center gap-2 mb-3 text-sage-800 font-bold">
                  <Sun size={20} />
                  <h3>Best Time to Visit</h3>
                </div>
                <div className="font-semibold text-ink-900 mb-1">{destination.bestTime.months}</div>
                <p className="text-sm text-ink-700">{destination.bestTime.reason}</p>
              </Card>

              <Card className="p-5 bg-sky-50 border border-sky-100">
                <div className="flex items-center gap-2 mb-3 text-sky-800 font-bold">
                  <Train size={20} />
                  <h3>Getting Around</h3>
                </div>
                <ul className="space-y-2">
                  {destination.transportModes.map((mode, idx) => (
                    <li key={idx} className="text-sm text-ink-700">
                      <strong className="text-ink-900 font-semibold">{mode.mode}: </strong>
                      {mode.desc}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* Top Attractions */}
            <div>
              <h2 className="text-2xl font-display font-bold text-ink-900 mb-4">Top Attractions</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {destination.attractions.map((attraction, idx) => (
                  <div key={idx} className="flex gap-4 p-4 bg-white dark:bg-cream-200 rounded-card shadow-sm border border-cream-200 items-start group hover:border-sage-300 transition-colors">
                    <div className="w-14 h-14 rounded-xl bg-cream-50 border border-cream-100 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform">
                      {attraction.image}
                    </div>
                    <div>
                      <h4 className="font-bold text-ink-900 mb-1">{attraction.name}</h4>
                      <p className="text-sm text-ink-600 leading-snug line-clamp-2">{attraction.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sticky CTA */}
        <div className="sticky bottom-4 z-20 md:static md:bottom-auto">
          <Card className="p-6 md:p-8 bg-sage-800 text-white text-center rounded-cardLg overflow-hidden relative border-none shadow-float">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-left max-w-md">
                <h3 className="text-2xl font-display font-bold mb-2">Ready to explore {destination.name}?</h3>
                <p className="text-sage-100 text-sm md:text-base">
                  Let VoyageAI plan your perfect itinerary, including stays, transport, and daily activities tailored to you.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <Button size="lg" variant="accent" className="gap-2" onClick={handlePlanTrip} isLoading={isCreating}>
                  Plan a trip here <ArrowRight size={18} />
                </Button>
                <Link href={`/guide?destination=${encodeURIComponent(destination.name)}`}>
                  <Button size="lg" variant="ghost" className="gap-2 w-full bg-white/10 hover:bg-white/20 text-white border-white/20">
                    <Compass size={16} /> Ask the Guide
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>

      </main>
    </div>
  );
}
