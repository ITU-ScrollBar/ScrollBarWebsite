import { DRINK_INGREDIENTS, DrinkCategory, DrinkIngredient } from "../../../../types/drinkRecipe";
import { drinkCategoryLabels } from "../../../../utils/drinks";
import { CheckPour } from "../utils";
import IngredientPanel from "./IngredientPanel";

const categoryMeta: Record<DrinkCategory, { icon: string; hint: string }> = {
  alcohol: {
    icon: "🍾",
    hint: "2 or 4 cl, max 2 shots in total. Pure and Råstoff count 4 cl as one shot, so up to 8 cl.",
  },
  soda: {
    icon: "🥤",
    hint: "Half fill, fill, or top with. Two half fills make a fill, and there is always room left to top it off.",
  },
  syrup: {
    icon: "🍋",
    hint: "2 or 4 cl, or a 2 cl splash on top. Max 4 cl of syrup and lime juice in total.",
  },
};

const ingredientsByCategory = (category: DrinkCategory) =>
  DRINK_INGREDIENTS.filter((ingredient) => ingredient.category === category);

type CategoryPanelProps = {
  category: DrinkCategory;
  selectedId: string | null;
  check: CheckPour;
  onSelect: (ingredient: DrinkIngredient | null) => void;
};

export default function CategoryPanel({ category, selectedId, check, onSelect }: CategoryPanelProps) {
  return (
    <IngredientPanel
      title={drinkCategoryLabels[category]}
      icon={categoryMeta[category].icon}
      hint={categoryMeta[category].hint}
      ingredients={ingredientsByCategory(category)}
      selectedId={selectedId}
      check={check}
      onSelect={onSelect}
    />
  );
}
