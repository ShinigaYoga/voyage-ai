import React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "sage" | "coral" | "sky" | "cream";
}

export function Badge({
  className = "",
  variant = "sage",
  children,
  ...props
}: BadgeProps) {
  const baseStyles = "inline-flex items-center px-2 py-0.5 rounded-pill text-xs font-medium";
  
  const variants = {
    sage: "bg-sage-100 text-sage-800",
    coral: "bg-coral-100 text-coral-600",
    sky: "bg-sky-100 text-sky-800",
    cream: "bg-cream-200 text-ink-700",
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
}
