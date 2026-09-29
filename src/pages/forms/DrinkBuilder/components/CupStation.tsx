import { ReactNode, Ref } from "react";
import { Button, Card, Divider, Typography } from "antd";
import DrinkCup from "../../../../components/DrinkCup";
import DrinkRecipeList from "../../../../components/DrinkRecipeList";
import { DrinkState } from "../../../../types/drinkRecipe";
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

  return (
    <Card style={{ borderRadius: 12, border: "2px solid #202020" }}>
      <div ref={cupRef} style={{ display: "flex", justifyContent: "center", scrollMarginTop: 16 }}>
        <DrinkCup pours={drink.pours} width={260} />
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
