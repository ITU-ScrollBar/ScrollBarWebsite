import { DrinkAmount, DrinkCategory, DrinkPour } from "../types/drinkRecipe";

// Shared by the public drink builder and the board's drink responses page.
export const drinkAmountLabels: Record<DrinkAmount, string> = {
  "2cl": "2 cl",
  "4cl": "4 cl",
  "8cl": "8 cl",
  half: "Half fill",
  fill: "Fill",
  top: "Top with",
};

export const drinkCategoryLabels: Record<DrinkCategory, string> = {
  alcohol: "Alcohol",
  soda: "Soda & juice",
  syrup: "Syrup & lime",
};

export const formatCl = (cl: number) => `${Math.round(cl * 10) / 10} cl`;

export const formatShots = (shots: number) => String(Math.round(shots * 10) / 10);

const isFixedAmount = (amount: DrinkAmount) => amount.endsWith("cl");

/** "2 cl Vodka", "Half fill (17 cl) Coca-Cola", "Top with (2 cl) Grenadine Syrup". */
export const describeDrinkPour = (pour: DrinkPour) =>
  isFixedAmount(pour.amount)
    ? `${formatCl(pour.cl)} ${pour.ingredient.name}`
    : `${drinkAmountLabels[pour.amount]} (${formatCl(pour.cl)}) ${pour.ingredient.name}`;

type Rgba = { r: number; g: number; b: number; a: number };

/** Reads the "#rrggbb" and "rgba(r, g, b, a)" colors used in the drink catalog. */
const parseDrinkColor = (color: string): Rgba | null => {
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color.trim());
  if (hex) {
    return { r: parseInt(hex[1], 16), g: parseInt(hex[2], 16), b: parseInt(hex[3], 16), a: 1 };
  }

  const rgba = /^rgba?\(([^)]+)\)$/i.exec(color.trim());
  if (!rgba) {
    return null;
  }

  const [r, g, b, a = 1] = rgba[1].split(",").map((part) => Number(part.trim()));
  return [r, g, b, a].every(Number.isFinite) ? { r, g, b, a } : null;
};

/**
 * The color of the stirred drink: every pour weighs in by its volume. Clear liquids have a low
 * alpha, so they thin the drink out instead of turning it white.
 */
export const mixDrinkColor = (pours: DrinkPour[]): string | null => {
  let volume = 0;
  let pigment = 0;
  const sum = { r: 0, g: 0, b: 0, a: 0 };

  for (const pour of pours) {
    const color = parseDrinkColor(pour.ingredient.color);
    if (!color || pour.cl <= 0) {
      continue;
    }
    const weight = pour.cl * color.a;
    sum.r += color.r * weight;
    sum.g += color.g * weight;
    sum.b += color.b * weight;
    sum.a += weight;
    pigment += weight;
    volume += pour.cl;
  }

  if (volume === 0 || pigment === 0) {
    return null;
  }

  const channel = (value: number) => Math.round(value / pigment);
  const alpha = Math.round((sum.a / volume) * 100) / 100;
  return `rgba(${channel(sum.r)}, ${channel(sum.g)}, ${channel(sum.b)}, ${alpha})`;
};
