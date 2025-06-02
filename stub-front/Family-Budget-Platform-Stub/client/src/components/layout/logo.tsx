import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className, size = 24 }: LogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-primary", className)}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M3 10H21" stroke="currentColor" strokeWidth="2" />
      <circle cx="8" cy="15" r="2" fill="currentColor" />
      <path d="M13 14H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M13 17H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 7H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 7H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}