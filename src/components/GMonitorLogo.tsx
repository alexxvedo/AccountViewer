"use client";

import { cn } from "@/lib/utils";

interface GMonitorLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export function GMonitorLogo({ className, size = 32, showText = true }: GMonitorLogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className="shrink-0 rounded-lg bg-accent flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg
          width={size * 0.7}
          height={size * 0.7}
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Chart bars */}
          <rect x="2" y="16" width="5" height="10" rx="1.5" className="fill-accent-foreground" opacity="0.5" />
          <rect x="9" y="10" width="5" height="16" rx="1.5" className="fill-accent-foreground" opacity="0.7" />
          <rect x="16" y="4" width="5" height="22" rx="1.5" className="fill-accent-foreground" opacity="0.9" />

          {/* Rising trend line */}
          <path
            d="M3 22 L10 14 L17 8 L25 3"
            className="stroke-accent-foreground"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Pulse dot */}
          <circle cx="25" cy="3" r="2.5" className="fill-accent-foreground" />
        </svg>
      </div>

      {showText && (
        <span className="text-lg font-bold tracking-tight text-foreground">
          <span className="text-accent">G</span>Monitor
        </span>
      )}
    </div>
  );
}
