import React, { forwardRef } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full bg-cream-50 rounded-pill px-5 py-3 text-ink-900 placeholder-ink-500 border border-transparent focus:outline-none focus:border-sage-400 focus:ring-2 focus:ring-sage-200 transition-all ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
