"use client";

import { Card, CardContent } from "./ui";
import { NutritionData } from "@/lib/types";

interface NutritionTableProps {
  nutrition: NutritionData;
  servings?: string | null;
}

export default function NutritionTable({ nutrition, servings }: NutritionTableProps) {
  if (!nutrition || Object.keys(nutrition).length === 0) {
    return null;
  }

  const hasAnyData = Object.values(nutrition).some((val) => val !== null && val !== undefined);

  if (!hasAnyData) {
    return null;
  }

  const formatValue = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return "—";
    return typeof value === "number" ? value.toFixed(value % 1 === 0 ? 0 : 1) : "—";
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="font-serif text-xl font-bold mb-4">Nutrition Facts</h2>
        {servings && (
          <p className="text-sm text-muted-foreground mb-4">Per serving ({servings})</p>
        )}
        <div className="space-y-2">
          {nutrition.calories !== null && nutrition.calories !== undefined && (
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="font-medium">Calories</span>
              <span className="text-lg font-bold">{formatValue(nutrition.calories)}</span>
            </div>
          )}
          
          <div className="pt-2 space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Macronutrients
            </div>
            
            {nutrition.protein_g !== null && nutrition.protein_g !== undefined && (
              <div className="flex justify-between items-center py-1">
                <span className="text-sm">Protein</span>
                <span className="text-sm font-medium">{formatValue(nutrition.protein_g)}g</span>
              </div>
            )}
            
            {nutrition.carbs_g !== null && nutrition.carbs_g !== undefined && (
              <div className="flex justify-between items-center py-1">
                <span className="text-sm">Carbohydrates</span>
                <span className="text-sm font-medium">{formatValue(nutrition.carbs_g)}g</span>
              </div>
            )}
            
            {nutrition.fat_g !== null && nutrition.fat_g !== undefined && (
              <div className="flex justify-between items-center py-1">
                <span className="text-sm">Total Fat</span>
                <span className="text-sm font-medium">{formatValue(nutrition.fat_g)}g</span>
              </div>
            )}
            
            {nutrition.saturated_fat_g !== null && nutrition.saturated_fat_g !== undefined && (
              <div className="flex justify-between items-center py-1 pl-4 text-xs text-muted-foreground">
                <span>Saturated Fat</span>
                <span>{formatValue(nutrition.saturated_fat_g)}g</span>
              </div>
            )}
          </div>

          <div className="pt-2 space-y-1.5 border-t border-border">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Other Nutrients
            </div>
            
            {nutrition.fiber_g !== null && nutrition.fiber_g !== undefined && (
              <div className="flex justify-between items-center py-1">
                <span className="text-sm">Dietary Fiber</span>
                <span className="text-sm font-medium">{formatValue(nutrition.fiber_g)}g</span>
              </div>
            )}
            
            {nutrition.sugar_g !== null && nutrition.sugar_g !== undefined && (
              <div className="flex justify-between items-center py-1">
                <span className="text-sm">Sugar</span>
                <span className="text-sm font-medium">{formatValue(nutrition.sugar_g)}g</span>
              </div>
            )}
            
            {nutrition.sodium_mg !== null && nutrition.sodium_mg !== undefined && (
              <div className="flex justify-between items-center py-1">
                <span className="text-sm">Sodium</span>
                <span className="text-sm font-medium">{formatValue(nutrition.sodium_mg)}mg</span>
              </div>
            )}
            
            {nutrition.cholesterol_mg !== null && nutrition.cholesterol_mg !== undefined && (
              <div className="flex justify-between items-center py-1">
                <span className="text-sm">Cholesterol</span>
                <span className="text-sm font-medium">{formatValue(nutrition.cholesterol_mg)}mg</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
