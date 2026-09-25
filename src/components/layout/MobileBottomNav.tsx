"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, Compass, MessageCircle, User } from "lucide-react";

const navItems = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Trips", href: "/trips", icon: Map },
  { label: "Explore", href: "/explore", icon: Compass },
  { label: "Chat", href: "/chat", icon: MessageCircle, isAction: true },
  { label: "Profile", href: "/profile", icon: User },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#141412] border-t border-cream-200 dark:border-white/10 px-6 py-3 pb-safe z-50">
      <ul className="flex items-center justify-between">
        {navItems.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          const Icon = item.icon;

          if (item.isAction) {
            return (
              <li key={item.href} className="relative -top-5">
                <Link
                  href={item.href}
                  className="flex items-center justify-center w-14 h-14 bg-sage-600 rounded-full shadow-lift text-white hover:bg-sage-700 transition-transform hover:scale-105"
                >
                  <Icon size={24} className={isActive ? "fill-white" : ""} />
                </Link>
              </li>
            );
          }

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-1 p-2 transition-colors ${
                  isActive ? "text-sage-600 dark:text-sage-400" : "text-ink-500 hover:text-ink-700"
                }`}
              >
                <Icon size={24} className={isActive ? "stroke-[2.5px]" : "stroke-2"} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
