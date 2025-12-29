"use client";

import { useState, useRef, useEffect, ReactNode, HTMLAttributes } from "react";

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
  const [position, setPosition] = useState<{ top: number; left?: number; right?: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setPosition({
        top: rect.bottom + 8,
        ...(align === 'left' ? { left: rect.left } : { right: window.innerWidth - rect.right }),
      });
    } else {
      setPosition(null);
    }
  }, [isOpen, align]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        triggerRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
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

  const handleMouseEnter = () => {
    if (isHoverable) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (isHoverable) {
      timeoutRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 150); // Small delay to allow moving to dropdown
    }
  };

  const handleClick = () => {
    if (!isHoverable) {
      setIsOpen((prev) => !prev);
    } else {
      // On desktop with hover, click closes it
      setIsOpen(false);
    }
  };

  const alignClasses = {
    left: "left-0",
    right: "right-0",
  };

  return (
    <>
      <div
        ref={triggerRef}
        className={`relative inline-block ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <div onClick={handleClick} className="cursor-pointer">
          {trigger}
        </div>
      </div>
      {isOpen && position && (
        <div
          ref={dropdownRef}
          className="fixed z-[100] min-w-[200px] bg-card border border-border rounded-xl shadow-lg overflow-hidden"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            top: `${position.top}px`,
            ...(position.left !== undefined ? { left: `${position.left}px` } : {}),
            ...(position.right !== undefined ? { right: `${position.right}px` } : {}),
          }}
        >
          {children}
        </div>
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
