import { Button, Card, Tooltip, Typography } from "antd";
import DrinkSwatch from "../../../../components/DrinkSwatch";
import { DrinkIngredient } from "../../../../types/drinkRecipe";
import { CheckPour, ingredientAvailability } from "../utils";

const { Text } = Typography;

type IngredientPanelProps = {
  title: string;
  icon: string;
  hint: string;
  ingredients: DrinkIngredient[];
  selectedId: string | null;
  check: CheckPour;
  onSelect: (ingredient: DrinkIngredient | null) => void;
};

export default function IngredientPanel({
  title,
  icon,
  hint,
  ingredients,
  selectedId,
  check,
  onSelect,
}: IngredientPanelProps) {
  const availability = ingredients.map((ingredient) => ingredientAvailability(ingredient, check));
  const blocked = availability.find((entry) => !entry.available);
  // Tooltips don't show on phones, so say it once when the whole group is out of reach.
  const allBlocked = availability.every((entry) => !entry.available);

  return (
    <Card
      style={{ borderRadius: 12, border: "2px solid #202020" }}
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 18 }}>
          <span aria-hidden="true">{icon}</span>
          {title}
        </span>
      }
    >
      <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
        {allBlocked && blocked && !blocked.available ? blocked.reason : hint}
      </Text>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {ingredients.map((ingredient, index) => {
          const entry = availability[index];
          const selected = ingredient.id === selectedId;
          const button = (
            <Button
              type={selected ? "primary" : "default"}
              disabled={!entry.available}
              aria-pressed={selected}
              icon={<DrinkSwatch ingredient={ingredient} />}
              onClick={() => onSelect(selected ? null : ingredient)}
              style={entry.available ? undefined : { pointerEvents: "none" }}
            >
              {ingredient.name}
            </Button>
          );

          return entry.available ? (
            <span key={ingredient.id}>{button}</span>
          ) : (
            <Tooltip key={ingredient.id} title={entry.reason}>
              <span style={{ display: "inline-block", cursor: "not-allowed" }}>{button}</span>
            </Tooltip>
          );
        })}
      </div>
    </Card>
  );
}
