import { useState } from "react";
import { ReloadOutlined } from "@ant-design/icons";
import { App as AntdApp, Alert, Button, Col, Empty, Layout, Row, Typography } from "antd";
import { Loading } from "../../components/Loading";
import useDrinkSubmissions from "../../hooks/useDrinkSubmissions";
import { DrinkSubmission } from "../../types/drinkRecipe";
import DrinkSubmissionCard from "./DrinkResponses/components/DrinkSubmissionCard";

const { Content } = Layout;
const { Title, Text } = Typography;

/** Board-only list of the drinks people built on /forms/drinks. */
export default function DrinkResponsesPage() {
  const { notification, message } = AntdApp.useApp();
  const { drinksState, deleteDrink, refreshDrinks } = useDrinkSubmissions();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const removeDrink = async (drink: DrinkSubmission) => {
    setDeletingId(drink.id);
    try {
      await deleteDrink(drink.id);
      message.success(`"${drink.drinkName}" deleted.`);
    } catch (error) {
      notification.error({
        message: "Unable to delete drink",
        description: error instanceof Error ? error.message : "Failed to delete drink.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const { drinks } = drinksState;

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <Content style={{ padding: "24px 16px 32px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <div>
            <Title level={3} style={{ marginBottom: 8 }}>
              Drink Submissions
            </Title>
            <Text type="secondary">
              Drinks built on the public drink builder at /forms/drinks.
              {drinksState.isLoaded ? ` ${drinks.length} submitted so far.` : ""}
            </Text>
          </div>
          <Button
            icon={<ReloadOutlined />}
            loading={drinksState.loading && drinksState.isLoaded}
            onClick={() => void refreshDrinks(false)}
          >
            Refresh
          </Button>
        </div>

        {drinksState.error ? (
          <Alert
            type="error"
            showIcon
            message="Could not load drinks"
            description={drinksState.error}
            style={{ marginBottom: 16 }}
          />
        ) : null}

        {drinksState.loading && !drinksState.isLoaded ? (
          <Loading />
        ) : drinks.length === 0 ? (
          <Empty description="No drinks submitted yet." />
        ) : (
          <Row gutter={[16, 16]}>
            {drinks.map((drink) => (
              <Col key={drink.id} xs={24} md={12} xl={8}>
                <DrinkSubmissionCard
                  drink={drink}
                  deleting={deletingId === drink.id}
                  onDelete={removeDrink}
                />
              </Col>
            ))}
          </Row>
        )}
      </Content>
    </Layout>
  );
}
