import { useMemo } from "react";
import { DeleteOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Popconfirm, Typography } from "antd";
import DrinkCup from "../../../../components/DrinkCup";
import DrinkRecipeList from "../../../../components/DrinkRecipeList";
import { DrinkSubmission, buildDrink } from "../../../../types/drinkRecipe";
import { formatCl, formatShots } from "../../../../utils/drinks";
import { formatFormDateTime } from "../../../../utils/formResponses";

const { Text, Title } = Typography;

type DrinkSubmissionCardProps = {
  drink: DrinkSubmission;
  deleting: boolean;
  onDelete: (drink: DrinkSubmission) => void;
};

export default function DrinkSubmissionCard({ drink, deleting, onDelete }: DrinkSubmissionCardProps) {
  // Rebuilt from the stored steps so names and colors follow the current catalog.
  const { state, error } = useMemo(() => buildDrink(drink.steps), [drink.steps]);

  return (
    <Card
      style={{ borderRadius: 12, height: "100%" }}
      styles={{ body: { display: "flex", gap: 16 } }}
    >
      <div style={{ flex: "0 0 96px" }}>
        <DrinkCup pours={state.pours} animate={false} showFillLine={false} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <Title level={5} style={{ margin: 0, overflowWrap: "anywhere" }}>
            {drink.drinkName}
          </Title>
          <Popconfirm
            title="Delete this drink?"
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => onDelete(drink)}
          >
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              loading={deleting}
              aria-label={`Delete ${drink.drinkName}`}
            />
          </Popconfirm>
        </div>
        <Text type="secondary" style={{ display: "block" }}>
          {drink.creatorName} ({drink.ituInitials}) · {formatFormDateTime(drink.createdAt)}
        </Text>
        <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
          {formatCl(drink.totalCl)} · {formatShots(drink.shots)} shots
        </Text>
        {error ? (
          <Alert
            type="warning"
            showIcon
            message="Part of this recipe no longer matches the ingredient list."
            description={error}
            style={{ marginBottom: 8 }}
          />
        ) : null}
        <DrinkRecipeList pours={state.pours} />
      </div>
    </Card>
  );
}
