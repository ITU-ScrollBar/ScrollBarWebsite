import {
  DrinkAmount,
  DrinkCheck,
  DrinkIngredient,
  amountsForIngredient,
} from "../../../types/drinkRecipe";

export type CheckPour = (ingredient: DrinkIngredient, amount: DrinkAmount) => DrinkCheck;

export type IngredientAvailability = { available: true } | { available: false; reason: string };

/** An ingredient can be picked when at least one of its amounts can still be poured. */
export const ingredientAvailability = (
  ingredient: DrinkIngredient,
  check: CheckPour
): IngredientAvailability => {
  let reason = "";

  for (const amount of amountsForIngredient(ingredient)) {
    const result = check(ingredient, amount);
    if (result.ok) {
      return { available: true };
    }
    reason ||= result.reason;
  }

  return { available: false, reason };
};
