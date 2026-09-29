import { useRef, useState } from "react";
import { ConfigProvider, Grid, Layout, Typography } from "antd";
import HeaderBar from "../../components/HomePage/HeaderBar";
import useDrinkSubmissions from "../../hooks/useDrinkSubmissions";
import { DrinkAmount, DrinkIngredient } from "../../types/drinkRecipe";
import AmountPicker from "./DrinkBuilder/components/AmountPicker";
import CategoryPanel from "./DrinkBuilder/components/CategoryPanel";
import CupStation from "./DrinkBuilder/components/CupStation";
import SubmitDrinkModal from "./DrinkBuilder/components/SubmitDrinkModal";
import useDrinkBuilder from "./DrinkBuilder/hooks/useDrinkBuilder";

const { Content } = Layout;
const { Paragraph } = Typography;

/** Public drink builder: pour a drink from what the bar stocks and send it to the board. */
export default function DrinkBuilderPage() {
  const screens = Grid.useBreakpoint();
  // Grid.useBreakpoint is empty on the very first render, so treat "unknown" as narrow.
  const isWide = Boolean(screens.lg);
  const builder = useDrinkBuilder();
  const { submitDrink } = useDrinkSubmissions({ autoLoad: false });
  const [selected, setSelected] = useState<DrinkIngredient | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const cupRef = useRef<HTMLDivElement>(null);

  const handlePour = (ingredient: DrinkIngredient, amount: DrinkAmount) => {
    if (!builder.pour(ingredient, amount)) {
      return;
    }

    setSelected(null);
    if (!isWide) {
      // The panels sit below the cup on narrow screens; bring the cup back to watch it pour.
      cupRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const startOver = () => {
    builder.reset();
    setSubmitOpen(false);
    setSelected(null);
  };

  const amountPicker = (
    <AmountPicker
      ingredient={selected}
      check={builder.check}
      onPour={handlePour}
      onClose={() => setSelected(null)}
    />
  );

  const panel = (category: "alcohol" | "soda" | "syrup") => (
    <CategoryPanel
      category={category}
      selectedId={selected?.id ?? null}
      check={builder.check}
      onSelect={setSelected}
    />
  );

  const cupStation = (
    <CupStation
      builder={builder}
      cupRef={cupRef}
      amountPicker={isWide ? amountPicker : undefined}
      onSubmit={() => setSubmitOpen(true)}
    />
  );

  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#202020" } }}>
      <Layout style={{ minHeight: "100vh", background: "#fff" }}>
        <HeaderBar />
        <div
          style={{
            background: "#202020",
            color: "#fff",
            minHeight: isWide ? 320 : 260,
            display: "flex",
            alignItems: "flex-end",
            padding: isWide ? "0 10% 32px" : "0 8% 24px",
          }}
        >
          <div>
            <h1 style={{ color: "#fff", margin: 0, fontSize: isWide ? "3.5rem" : "2.2rem" }}>
              Build a drink
            </h1>
            <Paragraph style={{ color: "rgba(255, 255, 255, 0.8)", margin: 0, fontSize: 16 }}>
              Mix your own drink from what we have in the bar. Pick an ingredient, choose how much
              to pour, and send your creation to the board.
            </Paragraph>
          </div>
        </div>

        <Content style={{ padding: isWide ? "32px 24px 48px" : `16px 16px ${selected ? 200 : 48}px` }}>
          {isWide ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) minmax(360px, 440px) minmax(0, 1fr)",
                gap: 24,
                maxWidth: 1400,
                margin: "0 auto",
                alignItems: "start",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {panel("alcohol")}
                {panel("syrup")}
              </div>
              {cupStation}
              {panel("soda")}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 640, margin: "0 auto" }}>
              {cupStation}
              {panel("alcohol")}
              {panel("soda")}
              {panel("syrup")}
            </div>
          )}
        </Content>

        {!isWide && selected ? (
          <div
            style={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10,
              background: "#fff",
              borderTop: "2px solid #202020",
              boxShadow: "0 -4px 16px rgba(0, 0, 0, 0.12)",
              padding: "12px 16px calc(16px + env(safe-area-inset-bottom))",
            }}
          >
            {amountPicker}
          </div>
        ) : null}

        <SubmitDrinkModal
          open={submitOpen}
          drink={builder.drink}
          steps={builder.steps}
          submitDrink={submitDrink}
          onClose={() => setSubmitOpen(false)}
          onStartOver={startOver}
        />
      </Layout>
    </ConfigProvider>
  );
}
