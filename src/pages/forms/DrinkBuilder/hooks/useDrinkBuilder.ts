import { useCallback, useMemo, useState } from "react";
import {
  DrinkAmount,
  DrinkCheck,
  DrinkIngredient,
  DrinkState,
  DrinkStep,
  applyDrinkStep,
  buildDrink,
  checkDrinkStep,
} from "../../../../types/drinkRecipe";

type History = {
  steps: DrinkStep[];
  /** Steps taken out with Back, most recent last, so Forward can put them back in order. */
  undone: DrinkStep[];
};

export type UseDrinkBuilderResult = {
  steps: DrinkStep[];
  drink: DrinkState;
  canUndo: boolean;
  canRedo: boolean;
  check: (ingredient: DrinkIngredient, amount: DrinkAmount) => DrinkCheck;
  pour: (ingredient: DrinkIngredient, amount: DrinkAmount) => boolean;
  undo: () => void;
  redo: () => void;
  reset: () => void;
};

const emptyHistory: History = { steps: [], undone: [] };

/**
 * Browser-style history for the drink builder: Back takes the last pour out, Forward puts it back,
 * and a new pour drops whatever Forward could have restored.
 */
export default function useDrinkBuilder(): UseDrinkBuilderResult {
  const [history, setHistory] = useState<History>(emptyHistory);

  // Replaying keeps half fills right after Back: their size depends on what was poured before.
  const drink = useMemo(() => buildDrink(history.steps).state, [history.steps]);

  const check = useCallback(
    (ingredient: DrinkIngredient, amount: DrinkAmount) => checkDrinkStep(drink, ingredient, amount),
    [drink]
  );

  const pour = useCallback(
    (ingredient: DrinkIngredient, amount: DrinkAmount) => {
      if (!checkDrinkStep(drink, ingredient, amount).ok) {
        return false;
      }

      setHistory((prev) => {
        // Re-checked against the queued history so two quick pours can't slip past the rules.
        const step: DrinkStep = { ingredientId: ingredient.id, amount };
        return "error" in applyDrinkStep(buildDrink(prev.steps).state, step)
          ? prev
          : { steps: [...prev.steps, step], undone: [] };
      });
      return true;
    },
    [drink]
  );

  const undo = useCallback(() => {
    setHistory((prev) => {
      const last = prev.steps[prev.steps.length - 1];
      return last
        ? { steps: prev.steps.slice(0, -1), undone: [...prev.undone, last] }
        : prev;
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((prev) => {
      const next = prev.undone[prev.undone.length - 1];
      return next
        ? { steps: [...prev.steps, next], undone: prev.undone.slice(0, -1) }
        : prev;
    });
  }, []);

  // Emptying the cup is one big Back, so Forward can still bring the pours back one by one.
  const reset = useCallback(() => {
    setHistory((prev) => ({
      steps: [],
      undone: [...prev.undone, ...[...prev.steps].reverse()],
    }));
  }, []);

  return {
    steps: history.steps,
    drink,
    canUndo: history.steps.length > 0,
    canRedo: history.undone.length > 0,
    check,
    pour,
    undo,
    redo,
    reset,
  };
}
