import { Progress, Typography } from "antd";
import {
  DRINK_CUP_CL,
  DRINK_MAX_SHOTS,
  DRINK_MAX_SYRUP_CL,
  DrinkState,
} from "../../../../types/drinkRecipe";
import { formatCl, formatShots } from "../../../../utils/drinks";

const { Text } = Typography;

type DrinkStatsProps = {
  drink: DrinkState;
};

export default function DrinkStats({ drink }: DrinkStatsProps) {
  const stats = [
    {
      key: "cup",
      label: "Cup",
      value: `${formatCl(drink.levelCl)} / ${DRINK_CUP_CL}`,
      percent: (drink.levelCl / DRINK_CUP_CL) * 100,
    },
    {
      key: "shots",
      label: "Shots",
      value: `${formatShots(drink.shots)} / ${DRINK_MAX_SHOTS}`,
      percent: (drink.shots / DRINK_MAX_SHOTS) * 100,
    },
    {
      key: "syrup",
      label: "Syrup & lime",
      value: `${formatCl(drink.syrupCl)} / ${DRINK_MAX_SYRUP_CL}`,
      percent: (drink.syrupCl / DRINK_MAX_SYRUP_CL) * 100,
    },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
      {stats.map((stat) => (
        <div key={stat.key}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {stat.label}
          </Text>
          <div style={{ fontWeight: 600 }}>{stat.value}</div>
          <Progress
            percent={Math.round(stat.percent)}
            showInfo={false}
            size="small"
            strokeColor="#202020"
          />
        </div>
      ))}
    </div>
  );
}
