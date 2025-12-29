"use client";

import { Tag } from "@/lib/types";
import { X } from "lucide-react";

interface TagSelectorProps {
  availableTags: Tag[];
  selectedTagIds: string[];
  onSelectionChange: (tagIds: string[]) => void;
  label?: string;
}

export default function TagSelector({
  availableTags,
  selectedTagIds,
  onSelectionChange,
  label = "Tags",
}: TagSelectorProps) {
  const toggleTag = (tagId: string) => {
    const newSelection = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId];
    onSelectionChange(newSelection);
  };

  const selectedTags = availableTags.filter((tag) =>
    selectedTagIds.includes(tag.id)
  );

  // Group tags by category
  const tagsByCategory = availableTags.reduce((acc, tag) => {
    if (!acc[tag.category]) {
      acc[tag.category] = [];
    }
    acc[tag.category].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>);

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium">{label}</label>

      {/* Selected tags display */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-sm rounded-full"
            >
              {tag.name}
              <button
                onClick={() => toggleTag(tag.id)}
                className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                type="button"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Available tags by category */}
      <div className="space-y-3">
        {Object.entries(tagsByCategory).map(([category, tags]) => (
          <div key={category}>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
              {category.replace("_", " ")}
            </label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    selectedTagIds.includes(tag.id)
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
