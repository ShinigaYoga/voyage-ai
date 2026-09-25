"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { IconButton } from "../ui/IconButton";

export interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export function PageHeader({ title, showBack = false, rightAction }: PageHeaderProps) {
  const router = useRouter();

  return (
    <header className="flex items-center justify-between py-4 px-6 md:px-0 bg-transparent sticky top-0 z-10">
      <div className="flex items-center gap-3">
        {showBack && (
          <IconButton
            icon={<ArrowLeft size={20} />}
            variant="ghost"
            onClick={() => router.back()}
            aria-label="Go back"
          />
        )}
        <h1 className="text-2xl font-display font-bold text-ink-900 dark:text-[#F5F5F3]">{title}</h1>
      </div>
      {rightAction && <div>{rightAction}</div>}
    </header>
  );
}
