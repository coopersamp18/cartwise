"use client";

import { useState, useEffect, useRef, ReactNode } from "react";

interface TooltipProps {
  children: ReactNode;
  content: string;
  delay?: number; // Delay in milliseconds before showing tooltip
  position?: "top" | "bottom" | "left" | "right";
}

export function Tooltip({ children, content, delay = 500, position = "top" }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 -mt-1 border-t-gray-900",
    bottom: "bottom-full left-1/2 -translate-x-1/2 -mb-1 border-b-gray-900",
    left: "left-full top-1/2 -translate-y-1/2 -ml-1 border-l-gray-900",
    right: "right-full top-1/2 -translate-y-1/2 -mr-1 border-r-gray-900",
  };

  const arrowBorderClasses = {
    top: "border-4 border-transparent border-t-gray-900",
    bottom: "border-4 border-transparent border-b-gray-900",
    left: "border-4 border-transparent border-l-gray-900",
    right: "border-4 border-transparent border-r-gray-900",
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div className={`absolute z-50 px-2 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap pointer-events-none ${positionClasses[position]}`}>
          {content}
          <div className={`absolute ${arrowClasses[position]}`}>
            <div className={arrowBorderClasses[position]}></div>
          </div>
        </div>
      )}
    </div>
  );
}
