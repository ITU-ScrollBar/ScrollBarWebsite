import { Typography } from "antd";
import { DrinkPour } from "../types/drinkRecipe";
import { describeDrinkPour } from "../utils/drinks";
import DrinkSwatch from "./DrinkSwatch";

const { Text } = Typography;

type DrinkRecipeListProps = {
  pours: DrinkPour[];
  emptyText?: string;
};

export default function DrinkRecipeList({
  pours,
  emptyText = "The cup is empty.",
}: DrinkRecipeListProps) {
  if (pours.length === 0) {
    return <Text type="secondary">{emptyText}</Text>;
  }

  return (
    <ol style={{ margin: 0, paddingLeft: 20 }}>
      {pours.map((pour, index) => (
        <li key={`${index}-${pour.ingredient.id}-${pour.amount}`} style={{ marginBottom: 2 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <DrinkSwatch ingredient={pour.ingredient} />
            {describeDrinkPour(pour)}
          </span>
        </li>
      ))}
    </ol>
  );
}
