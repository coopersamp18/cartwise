"use client";

import Link from "next/link";
import { Tag, RecipeCategory } from "@/lib/types";
import { Button } from "./ui";
import { ProfileDropdown } from "./ProfileDropdown";
import { X, Filter, Clock, BookOpen, ShoppingCart, Star, Archive, ArchiveRestore, Plus, PanelLeft } from "lucide-react";

export interface RecipeFilters {
  category: RecipeCategory | null;
  tags: string[]; // Tag IDs
  prepTimeMax: number | null; // Maximum prep time in minutes
  cookTimeMax: number | null; // Maximum cook time in minutes
  totalTimeMax: number | null; // Maximum total time in minutes
}

interface RecipeFiltersProps {
  tags: Tag[];
  filters: RecipeFilters;
  onFiltersChange: (filters: RecipeFilters) => void;
  isOpen: boolean;
  onToggle: () => void;
  // Toolbar controls
  activeTab: "recipes" | "shopping";
  onTabChange: (tab: "recipes" | "shopping") => void;
  showFavorites: boolean;
  onToggleFavorites: () => void;
  showArchived: boolean;
  onToggleArchived: () => void;
  shoppingListCount?: number;
}

const CATEGORIES: RecipeCategory[] = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snack",
  "Appetizer",
  "Dessert",
  "Beverage",
  "Side Dish",
  "Soup",
  "Salad",
];

const TIME_RANGES = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 hour", value: 60 },
  { label: "1.5 hours", value: 90 },
  { label: "2+ hours", value: 120 },
];

export default function RecipeFiltersComponent({
  tags,
  filters,
  onFiltersChange,
  isOpen,
  onToggle,
  activeTab,
  onTabChange,
  showFavorites,
  onToggleFavorites,
  showArchived,
  onToggleArchived,
  shoppingListCount = 0,
}: RecipeFiltersProps) {

  const updateFilter = <K extends keyof RecipeFilters>(
    key: K,
    value: RecipeFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleTag = (tagId: string) => {
    const newTags = filters.tags.includes(tagId)
      ? filters.tags.filter((id) => id !== tagId)
      : [...filters.tags, tagId];
    updateFilter("tags", newTags);
  };

  const clearFilters = () => {
    onFiltersChange({
      category: null,
      tags: [],
      prepTimeMax: null,
      cookTimeMax: null,
      totalTimeMax: null,
    });
  };

  const activeFilterCount =
    (filters.category ? 1 : 0) +
    filters.tags.length +
    (filters.prepTimeMax ? 1 : 0) +
    (filters.cookTimeMax ? 1 : 0) +
    (filters.totalTimeMax ? 1 : 0);

  return (
    <div
      className={`h-full bg-background border-r border-border transition-all duration-300 ease-in-out flex-shrink-0 flex flex-col ${
        isOpen ? "w-64" : "w-16"
      }`}
    >
      {/* Top Section - Always visible */}
      <div className="p-3 space-y-2 flex-shrink-0">
          {/* Filter Toggle - Sidebar icon */}
          <button
            onClick={onToggle}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg transition-colors ${
              isOpen
                ? "bg-muted hover:bg-muted/80"
                : "hover:bg-muted/50"
            }`}
            title={isOpen ? "Close sidebar" : "Open sidebar"}
          >
            {/* Custom sidebar/filter panel icon */}
            <svg
              className={`w-5 h-5 ${isOpen ? "text-foreground" : "text-muted-foreground"}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="18" rx="1" />
              <rect x="14" y="3" width="7" height="18" rx="1" />
              <line x1="10" y1="8" x2="10" y2="8" />
              <line x1="10" y1="12" x2="10" y2="12" />
            </svg>
            {isOpen && (
              <span className="text-sm font-medium">Filters</span>
            )}
          </button>

          {/* New Recipe Button - At top */}
          <Link href="/recipe/new" className="block">
            <button
              className={`w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors ${
                isOpen ? "px-3 py-2 text-sm font-medium" : "p-2.5"
              }`}
              title="New Recipe"
            >
              <Plus className="w-5 h-5" />
              {isOpen && "New Recipe"}
            </button>
          </Link>

          {/* Tabs - Show opposite tab icon when minimized */}
          {isOpen ? (
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              <button
                onClick={() => onTabChange("recipes")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "recipes"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Recipes
              </button>
              <button
                onClick={() => onTabChange("shopping")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors relative ${
                  activeTab === "shopping"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                Shopping List
                {shoppingListCount > 0 && (
                  <span className="bg-primary text-white text-xs px-1.5 py-0.5 rounded-full">
                    {shoppingListCount}
                  </span>
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={() => onTabChange(activeTab === "recipes" ? "shopping" : "recipes")}
              className="w-full p-2.5 rounded-lg transition-colors hover:bg-muted/50 text-muted-foreground relative"
              title={activeTab === "recipes" ? "Switch to Shopping List" : "Switch to Recipes"}
            >
              {activeTab === "recipes" ? (
                <>
                  <ShoppingCart className="w-5 h-5" />
                  {shoppingListCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-white text-xs px-1.5 py-0.5 rounded-full">
                      {shoppingListCount}
                    </span>
                  )}
                </>
              ) : (
                <BookOpen className="w-5 h-5" />
              )}
            </button>
          )}

          {/* Favorites Button */}
          <button
            onClick={onToggleFavorites}
            className={`w-full flex items-center justify-center gap-2 rounded-lg transition-colors ${
              isOpen ? "px-3 py-2 text-sm font-medium" : "p-2.5"
            } ${
              showFavorites
                ? "bg-muted hover:bg-muted/80"
                : "hover:bg-muted/50"
            }`}
            title={showFavorites ? "Show All Recipes" : "Show Favorites"}
          >
            <Star className={`w-5 h-5 ${showFavorites ? "fill-current" : ""}`} />
            {isOpen && (
              <span>{showFavorites ? "All Recipes" : "Favorites"}</span>
            )}
          </button>
      </div>

      {/* Middle Section - Scrollable Filters when open, or spacer when closed */}
      {isOpen ? (
          <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent overflow-x-hidden">
            <div className="p-4 space-y-6">
              {/* Category Filter */}
              <div>
                <label className="text-sm font-medium mb-3 block">Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((category) => (
                    <button
                      key={category}
                      onClick={() =>
                        updateFilter("category", filters.category === category ? null : category)
                      }
                      className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                        filters.category === category
                          ? "bg-primary text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Filters */}
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-3">
                    <Clock className="w-4 h-4" />
                    Prep Time (max)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TIME_RANGES.map((range) => (
                      <button
                        key={range.value}
                        onClick={() =>
                          updateFilter(
                            "prepTimeMax",
                            filters.prepTimeMax === range.value ? null : range.value
                          )
                        }
                        className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                          filters.prepTimeMax === range.value
                            ? "bg-primary text-white"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-3 block">
                    Cook Time (max)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TIME_RANGES.map((range) => (
                      <button
                        key={range.value}
                        onClick={() =>
                          updateFilter(
                            "cookTimeMax",
                            filters.cookTimeMax === range.value ? null : range.value
                          )
                        }
                        className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                          filters.cookTimeMax === range.value
                            ? "bg-primary text-white"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-3 block">
                    Total Time (max)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TIME_RANGES.map((range) => (
                      <button
                        key={range.value}
                        onClick={() =>
                          updateFilter(
                            "totalTimeMax",
                            filters.totalTimeMax === range.value ? null : range.value
                          )
                        }
                        className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                          filters.totalTimeMax === range.value
                            ? "bg-primary text-white"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dietary Tags Filter */}
              {tags.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-3 block">
                    Dietary & Preferences
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                          filters.tags.includes(tag.id)
                            ? "bg-primary text-white"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Show Archived - At bottom of filter section */}
              <div className="pt-4 border-t border-border">
                <button
                  onClick={onToggleArchived}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                    showArchived
                      ? "bg-muted hover:bg-muted/80"
                      : "hover:bg-muted/50"
                  }`}
                  title={showArchived ? "Show Active" : "Show Archived"}
                >
                  {showArchived ? (
                    <ArchiveRestore className="w-4 h-4" />
                  ) : (
                    <Archive className="w-4 h-4" />
                  )}
                  <span>{showArchived ? "Show Active" : "Show Archived"}</span>
                </button>
              </div>

              {/* Clear Filters Button */}
              {activeFilterCount > 0 && (
                <div className="pt-2">
                  <Button
                    variant="secondary"
                    onClick={clearFilters}
                    className="w-full"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          </div>
      ) : (
        <div className="flex-1"></div>
      )}

      {/* Profile at bottom - Always anchored */}
      <div className="flex-shrink-0 p-3 border-t border-border mt-auto">
        <div className={`flex items-center justify-center ${isOpen ? "px-2" : ""}`}>
          <ProfileDropdown />
        </div>
      </div>
    </div>
  );
}

// Export button component separately - now just a simple toggle button
export function RecipeFiltersButton({
  filters,
  onToggle,
  isOpen,
}: {
  filters: RecipeFilters;
  onToggle: () => void;
  isOpen: boolean;
}) {
  const activeFilterCount =
    (filters.category ? 1 : 0) +
    filters.tags.length +
    (filters.prepTimeMax ? 1 : 0) +
    (filters.cookTimeMax ? 1 : 0) +
    (filters.totalTimeMax ? 1 : 0);

  return (
    <button
      onClick={onToggle}
      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors ${
        isOpen
          ? "bg-muted hover:bg-muted/80"
          : "hover:bg-muted/50 border border-border"
      }`}
      title={isOpen ? "Close filters" : "Open filters"}
    >
      <Filter className="w-4 h-4" />
      {activeFilterCount > 0 && (
        <span className="bg-primary text-white text-xs px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
          {activeFilterCount}
        </span>
      )}
    </button>
  );
}
