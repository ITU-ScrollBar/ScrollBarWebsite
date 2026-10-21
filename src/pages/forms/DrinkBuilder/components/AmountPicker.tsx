import { CloseOutlined } from "@ant-design/icons";
import { Button, Tooltip, Typography } from "antd";
import DrinkSwatch from "../../../../components/DrinkSwatch";
import { DrinkAmount, DrinkIngredient, amountsForIngredient } from "../../../../types/drinkRecipe";
import { drinkAmountLabels, formatCl } from "../../../../utils/drinks";
import { CheckPour } from "../utils";

const { Text } = Typography;

type AmountPickerProps = {
  ingredient: DrinkIngredient | null;
  check: CheckPour;
  onPour: (ingredient: DrinkIngredient, amount: DrinkAmount) => void;
  onClose: () => void;
};

export default function AmountPicker({ ingredient, check, onPour, onClose }: AmountPickerProps) {
  if (!ingredient) {
    return (
      <Text type="secondary" style={{ display: "block", textAlign: "center" }}>
        Pick an ingredient, then choose how much to pour.
      </Text>
    );
  }

  const options = amountsForIngredient(ingredient).map((amount) => ({
    amount,
    result: check(ingredient, amount),
  }));
  const reasons = Array.from(
    new Set(options.flatMap(({ result }) => (result.ok ? [] : [result.reason])))
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
          <DrinkSwatch ingredient={ingredient} size={14} />
          Pour {ingredient.name}
        </span>
        <Button type="text" size="small" icon={<CloseOutlined />} aria-label="Cancel" onClick={onClose} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map(({ amount, result }) => {
          const label = amount.endsWith("cl")
            ? drinkAmountLabels[amount]
            : `${drinkAmountLabels[amount]}${result.ok ? ` (${formatCl(result.cl)})` : ""}`;

          return (
            <Tooltip key={amount} title={result.ok ? undefined : result.reason}>
              <Button
                type="primary"
                ghost
                disabled={!result.ok}
                onClick={() => onPour(ingredient, amount)}
              >
                + {label}
              </Button>
            </Tooltip>
          );
        })}
      </div>
      {reasons.length > 0 ? (
        <Text type="secondary" style={{ display: "block", marginTop: 8, fontSize: 12 }}>
          {reasons.join(" ")}
        </Text>
      ) : null}
    </div>
  );
}
