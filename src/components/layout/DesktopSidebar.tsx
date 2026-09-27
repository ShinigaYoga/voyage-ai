"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, Compass, MessageCircle, User, Compass as BrandCompass } from "lucide-react";
import { Avatar } from "../ui/Avatar";

const navItems = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Trips", href: "/trips", icon: Map },
  { label: "Explore", href: "/explore", icon: Compass },
  { label: "Chat", href: "/chat", icon: MessageCircle },
  { label: "Profile", href: "/profile", icon: User },
];

export function DesktopSidebar() {
  const pathname = usePathname();

  const [lastTrip, setLastTrip] = React.useState<{id: string, name: string} | null>(null);

  React.useEffect(() => {
    const id = localStorage.getItem("lastOpenedTripId");
    const name = localStorage.getItem("lastOpenedTripName");
    if (id && name) {
      setLastTrip({ id, name });
    }
  }, [pathname]);

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-white dark:bg-[#141412] border-r border-cream-200 dark:border-white/10 fixed left-0 top-0 pt-8 pb-6 px-4">
      <div className="flex items-center gap-3 px-4 mb-10">
        <div className="w-8 h-8 rounded-lg bg-sage-600 flex items-center justify-center text-white">
          <BrandCompass size={20} />
        </div>
        <span className="font-display font-bold text-xl text-ink-900 dark:text-[#F5F5F3] tracking-tight">VoyageAI</span>
      </div>

      <nav className="flex-1">
        <ul className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-card transition-colors ${
                    isActive
                      ? "bg-sage-100 dark:bg-sage-800/40 text-sage-800 dark:text-sage-300 font-semibold"
                      : "text-ink-700 dark:text-[#D4D4D4] hover:bg-cream-200 dark:hover:bg-white/8 hover:text-ink-900 dark:hover:text-white"
                  }`}
                >
                  <Icon size={20} className={isActive ? "stroke-[2.5px]" : "stroke-2"} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}

          {lastTrip && (
            <li className="mt-4 pt-4 border-t border-cream-200 dark:border-white/10">
              <Link
                href={`/trip/${lastTrip.id}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-card transition-colors ${
                  pathname?.includes(`/trip/${lastTrip.id}`)
                    ? "bg-sage-100 dark:bg-sage-800/40 text-sage-800 dark:text-sage-300 font-semibold"
                    : "text-ink-700 dark:text-[#D4D4D4] hover:bg-cream-200 dark:hover:bg-white/8 hover:text-ink-900 dark:hover:text-white"
                }`}
              >
                <div className="w-5 h-5 rounded flex items-center justify-center bg-sage-200 dark:bg-sage-800/50 text-sage-700 dark:text-sage-400 text-xs shrink-0">
                  <Map size={12} />
                </div>
                <span className="truncate text-sm font-medium">Continue: {lastTrip.name}</span>
              </Link>
            </li>
          )}
        </ul>
      </nav>
    </aside>
  );
}
