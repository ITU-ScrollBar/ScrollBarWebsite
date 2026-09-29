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
