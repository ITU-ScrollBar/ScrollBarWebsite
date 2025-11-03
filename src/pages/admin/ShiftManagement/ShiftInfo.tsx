import {
  Card,
  Select,
  Button,
  Space,
  Typography,
  List,
  Avatar,
  Popconfirm,
  message,
  Divider,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import {
  Shift,
  Engagement,
  Tender,
  engagementType,
} from "../../../types/types-file";
import { useEngagementContext } from "../../../contexts/EngagementContext";
import useTenders from "../../../hooks/useTenders";

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
      t.roles?.includes("anchor") &&
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

    addEngagement(engagement).catch(() =>
      message.error("Failed to add tender")
    );
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

    addEngagement(engagement).catch(() =>
      message.error("Failed to add anchor")
    );
  };

  const handleRemove = (engagement: Engagement) => {
    removeEngagement(engagement)
      .then(() => message.success("Removed successfully"))
      .catch(() => message.error("Failed to remove"));
  };

  const getTenderById = (userId: string | undefined): Tender | undefined => {
    if (!userId) return undefined;
    return tenderState.tenders.find((t) => t.uid === userId);
  };

  const renderEngagementList = (engagements: Engagement[], title: string) => (
    <Card
      title={<Text strong>{title}</Text>}
      style={{ marginBottom: "16px" }}
      bodyStyle={{ padding: "12px" }}
    >
      {engagements.length > 0 ? (
        <List
          dataSource={engagements}
          renderItem={(engagement) => {
            const tender = getTenderById(engagement.userId);
            return (
              <List.Item
                actions={[
                  <Popconfirm
                    title="Remove this person?"
                    onConfirm={() => handleRemove(engagement)}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                    />
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      src={tender?.photoUrl}
                      style={{
                        backgroundColor:
                          engagement.type === engagementType.ANCHOR
                            ? "#FFD600"
                            : "#1890ff",
                      }}
                    >
                      {tender?.displayName?.[0] || "?"}
                    </Avatar>
                  }
                  title={tender?.displayName || "Unknown"}
                  description={tender?.email}
                />
              </List.Item>
            );
          }}
        />
      ) : (
        <Text
          type="secondary"
          style={{ display: "block", padding: "12px", textAlign: "center" }}
        >
          No {title.toLowerCase()} assigned
        </Text>
      )}
    </Card>
  );

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

        {renderEngagementList(anchors, "Anchors")}

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

        {renderEngagementList(tenders, "Tenders")}

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
