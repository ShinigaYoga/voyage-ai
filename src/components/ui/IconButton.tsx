import React from "react";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  variant?: "default" | "ghost" | "sage" | "coral";
  size?: "sm" | "md" | "lg";
}

export function IconButton({
  className = "",
  icon,
  variant = "ghost",
  size = "md",
  ...props
}: IconButtonProps) {
  const baseStyles = "inline-flex items-center justify-center rounded-full transition-colors focus:outline-none";
  
  const variants = {
    default: "bg-cream-50 text-ink-700 hover:bg-cream-200",
    ghost: "bg-transparent text-ink-700 hover:bg-sage-100",
    sage: "bg-sage-600 text-white hover:bg-sage-700 shadow-soft",
    coral: "bg-coral-500 text-white hover:bg-coral-600 shadow-soft",
  };

  const sizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {icon}
    </button>
  );
}
