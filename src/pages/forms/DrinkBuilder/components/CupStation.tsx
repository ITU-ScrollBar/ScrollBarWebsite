import { ReactNode, Ref, useState } from "react";
import { Button, Card, Divider, Typography } from "antd";
import { BgColorsOutlined, BarsOutlined } from "@ant-design/icons";
import DrinkCup from "../../../../components/DrinkCup";
import DrinkRecipeList from "../../../../components/DrinkRecipeList";
import { DrinkState, DrinkStep } from "../../../../types/drinkRecipe";
import { mixDrinkColor } from "../../../../utils/drinks";
import { UseDrinkBuilderResult } from "../hooks/useDrinkBuilder";
import DrinkStats from "./DrinkStats";
import HistoryControls from "./HistoryControls";

const { Title } = Typography;

type CupStationProps = {
  builder: UseDrinkBuilderResult;
  cupRef: Ref<HTMLDivElement>;
  /** The amount picker sits under the cup on wide screens, like the sketch. */
  amountPicker?: ReactNode;
  onSubmit: () => void;
};

const recipeTitle = (drink: DrinkState) => (drink.topped ? "Your drink" : "Recipe so far");

export default function CupStation({ builder, cupRef, amountPicker, onSubmit }: CupStationProps) {
  const { drink } = builder;
  // Remembers which recipe was stirred, so any pour, Back or Forward shows the layers again.
  const [mixedSteps, setMixedSteps] = useState<DrinkStep[] | null>(null);
  const mixed = mixedSteps === builder.steps && drink.pours.length > 0;
  const mixedColor = mixed ? mixDrinkColor(drink.pours) : null;

  return (
    <Card style={{ borderRadius: 12, border: "2px solid #202020" }}>
      <div ref={cupRef} style={{ display: "flex", justifyContent: "center", scrollMarginTop: 16 }}>
        <DrinkCup pours={drink.pours} width={260} mixed={mixed} />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 12,
          marginTop: 12,
          flexWrap: "wrap",
        }}
      >
        <Button
          icon={mixed ? <BarsOutlined /> : <BgColorsOutlined />}
          disabled={drink.pours.length === 0}
          onClick={() => setMixedSteps(mixed ? null : builder.steps)}
        >
          {mixed ? "Show layers" : "Mix drink"}
        </Button>
        {mixedColor ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span
              aria-hidden="true"
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                border: "1px solid rgba(0, 0, 0, 0.25)",
                background: `linear-gradient(${mixedColor}, ${mixedColor}), #f4f8fb`,
              }}
            />
            Final color
          </span>
        ) : null}
      </div>
      <div style={{ marginTop: 16 }}>
        <DrinkStats drink={drink} />
      </div>
      {amountPicker ? (
        <>
          <Divider style={{ margin: "16px 0" }} />
          {amountPicker}
        </>
      ) : null}
      <Divider style={{ margin: "16px 0" }} />
      <HistoryControls
        canUndo={builder.canUndo}
        canRedo={builder.canRedo}
        onUndo={builder.undo}
        onRedo={builder.redo}
        onReset={builder.reset}
      />
      <Divider style={{ margin: "16px 0" }} />
      <Title level={5} style={{ marginTop: 0 }}>
        {recipeTitle(drink)}
      </Title>
      <DrinkRecipeList pours={drink.pours} emptyText="The cup is empty. Pick something to pour." />
      <Button
        type="primary"
        size="large"
        block
        disabled={drink.pours.length === 0}
        onClick={onSubmit}
        style={{ marginTop: 16 }}
      >
        Submit drink
      </Button>
    </Card>
  );
}
