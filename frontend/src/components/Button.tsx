import Link from "next/link";
import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  type?: "button" | "submit" | "reset";
  href?: string;
  variant?: "primary" | "secondary" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function Button({
  children,
  type = "button",
  href,
  variant = "primary",
  size = "md",
  icon,
  isLoading = false,
  disabled = false,
  onClick,
  className = "",
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800";
  
  const variants = {
    primary: "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 focus:ring-purple-500",
    secondary: "bg-gray-700 text-gray-200 hover:bg-gray-600 focus:ring-gray-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500",
  };
  
  const sizes = {
    sm: "px-3 py-1.5 text-sm space-x-1",
    md: "px-4 py-2 text-sm space-x-2",
    lg: "px-6 py-3 text-base space-x-2",
  };
  
  const combinedClassName = `${baseStyles} ${variants[variant]} ${sizes[size]} ${
    disabled || isLoading ? "opacity-50 cursor-not-allowed" : ""
  } ${className}`;
  
  const content = (
    <>
      {isLoading ? (
        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : icon ? (
        <span className="inline-flex">{icon}</span>
      ) : null}
      <span>{children}</span>
    </>
  );
  
  if (href) {
    return (
      <Link href={href} className={combinedClassName}>
        {content}
      </Link>
    );
  }
  
  return (
    <button type={type} onClick={onClick} disabled={disabled || isLoading} className={combinedClassName}>
      {content}
    </button>
  );
}