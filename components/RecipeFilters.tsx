"use client";

import { useState } from "react";
import { Button, Card, CardContent } from "./ui";
import { Tag, RecipeCategory } from "@/lib/types";
import { X, Filter, Clock } from "lucide-react";

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
}: RecipeFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

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
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-4">
        <Button
          variant="secondary"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </Button>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {isOpen && (
        <Card>
          <CardContent className="p-6 space-y-6">
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
