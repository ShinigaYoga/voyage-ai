import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "outlined";
}

export function Card({
  className = "",
  variant = "default",
  children,
  ...props
}: CardProps) {
  const baseStyles = "rounded-[var(--radius-card)] overflow-hidden transition-shadow";
  
  const variants = {
    default: "bg-[#FDFBF7]  shadow-[var(--shadow-soft)]",
    elevated: "bg-white  shadow-[var(--shadow-lift)]",
    outlined: "bg-transparent border border-[var(--color-cream-200)] ",
  };

  return (
    <div className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
}
