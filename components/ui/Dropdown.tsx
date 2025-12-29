"use client";

import { useState, useRef, useEffect, ReactNode, HTMLAttributes } from "react";
import { createPortal } from "react-dom";

interface DropdownProps extends HTMLAttributes<HTMLDivElement> {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  onOpenChange?: (open: boolean) => void;
}

export function Dropdown({
  trigger,
  children,
  align = "right",
  onOpenChange,
  className = "",
  ...props
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHoverable, setIsHoverable] = useState(false);
  const [position, setPosition] = useState<{ showAbove: boolean; triggerTop: number; triggerBottom: number; left?: number; right?: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Detect if device supports hover
  useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: hover)");
    setIsHoverable(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsHoverable(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Calculate position when dropdown opens
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // Show above if not enough space below (use 200px as threshold)
      const showAbove = spaceBelow < 200 && spaceAbove > spaceBelow;
      
      setPosition({
        showAbove,
        triggerTop: rect.top,
        triggerBottom: rect.bottom,
        left: align === 'left' ? rect.left : undefined,
        right: align === 'left' ? undefined : window.innerWidth - rect.right,
      });
    } else {
      setPosition(null);
    }
  }, [isOpen, align]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideTrigger = triggerRef.current?.contains(target);
      const isInsideDropdown = dropdownRef.current?.contains(target);
      
      if (!isInsideTrigger && !isInsideDropdown) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  // Notify parent of open state changes
  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const clearCloseTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const startCloseTimeout = () => {
    clearCloseTimeout();
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 300); // Longer delay for easier navigation
  };

  const handleTriggerMouseEnter = () => {
    if (isHoverable) {
      clearCloseTimeout();
      setIsOpen(true);
    }
  };

  const handleTriggerMouseLeave = () => {
    if (isHoverable) {
      startCloseTimeout();
    }
  };

  const handleDropdownMouseEnter = () => {
    if (isHoverable) {
      clearCloseTimeout();
    }
  };

  const handleDropdownMouseLeave = () => {
    if (isHoverable) {
      startCloseTimeout();
    }
  };

  const handleClick = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <>
      <div
        ref={triggerRef}
        className={`relative inline-block ${className}`}
        onMouseEnter={handleTriggerMouseEnter}
        onMouseLeave={handleTriggerMouseLeave}
        {...props}
      >
        <button 
          type="button"
          onClick={handleClick} 
          className="cursor-pointer bg-transparent border-none p-0"
          aria-expanded={isOpen}
          aria-haspopup="menu"
        >
          {trigger}
        </button>
      </div>
      {mounted && isOpen && position && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] min-w-[200px] bg-card border border-border rounded-xl shadow-lg overflow-hidden"
          onMouseEnter={handleDropdownMouseEnter}
          onMouseLeave={handleDropdownMouseLeave}
          style={{
            ...(position.showAbove 
              ? { bottom: `${window.innerHeight - position.triggerTop}px` }
              : { top: `${position.triggerBottom}px` }
            ),
            ...(position.left !== undefined ? { left: `${position.left}px` } : {}),
            ...(position.right !== undefined ? { right: `${position.right}px` } : {}),
          }}
        >
          {children}
        </div>,
        document.body
      )}
    </>
  );
}

interface DropdownItemProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  onClick?: () => void;
}

export function DropdownItem({
  children,
  onClick,
  className = "",
  ...props
}: DropdownItemProps) {
  return (
    <div
      className={`px-4 py-3 text-sm text-foreground hover:bg-muted cursor-pointer transition-colors ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}

interface DropdownSeparatorProps {
  className?: string;
}

export function DropdownSeparator({
  className = "",
}: DropdownSeparatorProps) {
  return <div className={`h-px bg-border ${className}`} />;
}
