import { DrinkIngredient } from "../types/drinkRecipe";

type DrinkSwatchProps = {
  ingredient: DrinkIngredient;
  size?: number;
};

/** Small dot in the liquid's color. Clear liquids get an outline so they don't vanish. */
export default function DrinkSwatch({ ingredient, size = 12 }: DrinkSwatchProps) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        flex: "none",
        width: size,
        height: size,
        borderRadius: "50%",
        background: ingredient.color,
        border: "1px solid rgba(0, 0, 0, 0.25)",
        verticalAlign: "middle",
      }}
    />
  );
}
