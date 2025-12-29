"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  children: ReactNode;
  content: string;
  delay?: number; // Delay in milliseconds before showing tooltip
  position?: "top" | "bottom" | "left" | "right";
}

export function Tooltip({ children, content, delay = 1200, position = "top" }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const calculatePosition = () => {
    if (!triggerRef.current) return;
    
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipEl = tooltipRef.current;
    const tooltipWidth = tooltipEl?.offsetWidth || 100;
    const tooltipHeight = tooltipEl?.offsetHeight || 30;
    
    let top = 0;
    let left = 0;
    
    switch (position) {
      case "top":
        top = rect.top - tooltipHeight - 8;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case "bottom":
        top = rect.bottom + 8;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case "left":
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - 8;
        break;
      case "right":
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + 8;
        break;
    }
    
    // Keep tooltip within viewport
    const padding = 8;
    if (left < padding) left = padding;
    if (left + tooltipWidth > window.innerWidth - padding) {
      left = window.innerWidth - tooltipWidth - padding;
    }
    if (top < padding) top = padding;
    if (top + tooltipHeight > window.innerHeight - padding) {
      top = window.innerHeight - tooltipHeight - padding;
    }
    
    setTooltipPosition({ top, left });
  };

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      // Calculate position after a short delay to allow DOM update
      requestAnimationFrame(calculatePosition);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
    setTooltipPosition(null);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Recalculate position when tooltip becomes visible
  useEffect(() => {
    if (isVisible) {
      calculatePosition();
    }
  }, [isVisible]);

  const arrowStyles: Record<string, string> = {
    top: "bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-l-transparent border-r-transparent border-b-transparent border-t-gray-900",
    bottom: "top-0 left-1/2 -translate-x-1/2 -translate-y-full border-l-transparent border-r-transparent border-t-transparent border-b-gray-900",
    left: "right-0 top-1/2 -translate-y-1/2 translate-x-full border-t-transparent border-b-transparent border-r-transparent border-l-gray-900",
    right: "left-0 top-1/2 -translate-y-1/2 -translate-x-full border-t-transparent border-b-transparent border-l-transparent border-r-gray-900",
  };

  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {mounted && isVisible && createPortal(
        <div
          ref={tooltipRef}
          className="fixed z-[9999] px-2 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap pointer-events-none"
          style={{
            top: tooltipPosition?.top ?? -9999,
            left: tooltipPosition?.left ?? -9999,
          }}
        >
          {content}
          <div className={`absolute w-0 h-0 border-4 ${arrowStyles[position]}`} />
        </div>,
        document.body
      )}
    </div>
  );
}
