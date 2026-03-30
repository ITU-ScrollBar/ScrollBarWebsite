import {
  Card,
  Select,
  Space,
  Typography,
  message,
  Divider,
} from "antd";
import {
  Shift,
  Engagement,
  engagementType,
  Role,
} from "../../../types/types-file";
import { useEngagementContext } from "../../../contexts/EngagementContext";
import useTenders from "../../../hooks/useTenders";
import EngagementList from "./EngagementList";

const { Title, Text } = Typography;

interface ShiftInfoProps {
  shift: Shift;
}

export default function ShiftInfo({ shift }: ShiftInfoProps) {
  const { engagementState, addEngagement, removeEngagement } =
    useEngagementContext();
  const { tenderState } = useTenders();

  const shiftEngagements = engagementState.engagements.filter(
    (e) => e.shiftId === shift.id
  );

  const anchors = shiftEngagements.filter(
    (e) => e.type === engagementType.ANCHOR
  );
  const tenders = shiftEngagements.filter(
    (e) => e.type === engagementType.TENDER
  );

  const availableTenders = tenderState.tenders.filter(
    (t) => t.active && !shiftEngagements.some((e) => e.userId === t.uid)
  );

  const availableAnchors = tenderState.tenders.filter(
    (t) =>
      t.active &&
      t.roles?.includes(Role.ANCHOR) &&
      !shiftEngagements.some((e) => e.userId === t.uid)
  );

  const handleAddTender = (userId: string) => {
    if (!userId) return;

    const engagement: Engagement = {
      id: "",
      key: "",
      shiftId: shift.id!,
      shiftEnd: new Date(shift.end),
      userId: userId,
      type: engagementType.TENDER,
      upForGrabs: false,
    };

    addEngagement(engagement)
    .then(() => message.success("Tender added successfully"))
    .catch(() => message.error("Failed to add tender"));
  };

  const handleAddAnchor = (userId: string) => {
    if (!userId) return;

    const engagement: Engagement = {
      id: "",
      key: "",
      shiftId: shift.id!,
      shiftEnd: new Date(shift.end),
      userId: userId,
      type: engagementType.ANCHOR,
      upForGrabs: false,
    };

    addEngagement(engagement)
      .then(() => message.success("Anchor added successfully"))
      .catch(() => message.error("Failed to add anchor"));
  };

  const handleRemove = (engagement: Engagement) => {
    removeEngagement(engagement)
      .then(() => message.success("Removed successfully"))
      .catch(() => message.error("Failed to remove"));
  };

  return (
    <div>
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        <div>
          <Title level={3} style={{ marginBottom: "8px" }}>
            {shift.title}
          </Title>
          <Text type="secondary">
            {shift.location} • {new Date(shift.start).toLocaleString()} -{" "}
            {new Date(shift.end).toLocaleTimeString()}
          </Text>
        </div>

        <Divider />

        <EngagementList
          engagements={anchors}
          title="Anchors"
          tenders={tenderState.tenders}
          onRemove={handleRemove}
        />

        <Card
          title={<Text strong>Add Anchor</Text>}
          bodyStyle={{ padding: "16px" }}
        >
          <Select
            size="large"
            style={{ width: "100%" }}
            placeholder="Select an anchor to add"
            onChange={handleAddAnchor}
            showSearch
            optionFilterProp="children"
          >
            {availableAnchors.map((tender) => (
              <Select.Option key={tender.uid} value={tender.uid}>
                {tender.displayName} - {tender.email}
              </Select.Option>
            ))}
          </Select>
        </Card>

        <EngagementList
          engagements={tenders}
          title="Tenders"
          tenders={tenderState.tenders}
          onRemove={handleRemove}
        />

        <Card
          title={<Text strong>Add Tender</Text>}
          bodyStyle={{ padding: "16px" }}
        >
          <Select
            size="large"
            style={{ width: "100%" }}
            placeholder="Select a tender to add"
            onChange={handleAddTender}
            showSearch
            optionFilterProp="children"
          >
            {availableTenders.map((tender) => (
              <Select.Option key={tender.uid} value={tender.uid}>
                {tender.displayName} - {tender.email}
              </Select.Option>
            ))}
          </Select>
        </Card>
      </Space>
    </div>
  );
}
