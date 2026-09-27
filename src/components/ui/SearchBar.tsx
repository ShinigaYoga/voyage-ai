import React, { forwardRef } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { IconButton } from "./IconButton";

export interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onFilterClick?: () => void;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  ({ className = "", onFilterClick, ...props }, ref) => {
    return (
      <div className={`relative flex items-center ${className}`}>
        <div className="absolute left-4 text-ink-500">
          <Search size={20} />
        </div>
        <input
          ref={ref}
          className="w-full bg-cream-50 rounded-pill pl-12 pr-14 py-4 text-ink-900 placeholder-ink-500 border border-transparent focus:outline-none focus:border-sage-400 focus:ring-2 focus:ring-sage-200 transition-all shadow-sm"
          {...props}
        />
        {onFilterClick && (
          <div className="absolute right-2">
            <IconButton
              icon={<SlidersHorizontal size={18} />}
              variant="default"
              size="sm"
              onClick={onFilterClick}
              type="button"
            />
          </div>
        )}
      </div>
    );
  }
);
SearchBar.displayName = "SearchBar";
