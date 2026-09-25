import React from "react";

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  icon?: React.ReactNode;
}

export function Chip({
  className = "",
  active = false,
  icon,
  children,
  ...props
}: ChipProps) {
  const baseStyles = "inline-flex items-center justify-center px-4 py-2 rounded-pill font-medium text-sm transition-colors";
  
  const stateStyles = active
    ? "bg-sage-600 text-white shadow-soft"
    : "bg-transparent border border-cream-200 text-ink-700 hover:bg-sage-100 hover:border-sage-200";

  return (
    <button className={`${baseStyles} ${stateStyles} ${className}`} {...props}>
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
}
