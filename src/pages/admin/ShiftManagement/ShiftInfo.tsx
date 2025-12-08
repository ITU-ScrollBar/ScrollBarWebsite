import {
  Card,
  Select,
  Button,
  Space,
  Typography,
  List,
  Popconfirm,
  message,
  Divider,
  Row,
  Col,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import {
  Shift,
  Engagement,
  Tender,
  engagementType,
  Role,
} from "../../../types/types-file";
import { useEngagementContext } from "../../../contexts/EngagementContext";
import useTenders from "../../../hooks/useTenders";
import { UserAvatar } from "../../../components/UserAvatar";
import { useState } from "react";

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

  const renderEngagementList = (engagements: Engagement[], title: string) => {
    const [hovered, setHovered] = useState<string | null>(null);

    return (
    <Card
      title={<Text strong>{title}</Text>}
      style={{ marginBottom: "16px" }}
      bodyStyle={{ padding: "12px" }}
    >
      {engagements.length > 0 ? (
        <List
          itemLayout="horizontal"
          grid={{ column: 5, xl: 4, lg: 3, md: 2, sm: 2, xs: 1 }}
          dataSource={engagements}
          renderItem={(engagement) => {
            const tender = getTenderById(engagement.userId);
            if (!tender) return null;
            return (
              <List.Item
                onMouseEnter={() => setHovered(engagement.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <Popconfirm
                  title="Remove this person?"
                  onConfirm={() => handleRemove(engagement)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      opacity: hovered === engagement.id ? 0.8 : 0,
                      transition: "opacity 0.2s ease-in-out",
                      zIndex: 2,
                      cursor: "pointer",
                    }}
                    type="text"
                    danger
                    icon={<DeleteOutlined style={{ opacity: 1 }} />}
                  />
                </Popconfirm>
                <Row style={{ opacity: hovered === engagement.id ? 1 : 1, transition: "opacity 0.2s ease-in-out" }} align="middle" gutter={8}>
                  <Col span={4}>
                    <UserAvatar
                        user={tender}
                        size={40}
                        style={{
                          backgroundColor:
                            engagement.type === engagementType.ANCHOR
                              ? "#FFD600"
                              : "#1890ff",
                        }}
                      />
                  </Col>
                  <Col span={18}>
                    <Text>{tender?.displayName || "Unknown"}</Text><br />
                    <Text type="secondary">{tender?.email}</Text>
                  </Col>
                </Row>
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
    )
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
