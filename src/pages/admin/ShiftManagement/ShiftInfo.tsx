import {
  Alert,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import {
  Shift,
  Engagement,
  engagementType,
  Role,
  ShiftPlanningResponse,
} from "../../../types/types-file";
import { useEngagementContext } from "../../../contexts/EngagementContext";
import useTenders from "../../../hooks/useTenders";
import { UserAvatar } from "../../../components/UserAvatar";

const { Text } = Typography;

interface ShiftInfoProps {
  shift: Shift;
  periodResponses: ShiftPlanningResponse[];
  eventTitle: string;
}

export default function ShiftInfo({ shift, periodResponses, eventTitle }: ShiftInfoProps) {
  const { engagementState, addEngagement, removeEngagement } =
    useEngagementContext();
  const { tenderState } = useTenders();
  const [anchorSelection, setAnchorSelection] = useState<string | undefined>(undefined);
  const [tenderSelection, setTenderSelection] = useState<string | undefined>(undefined);

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
      .then(() => {
        message.success("Tender added successfully");
        setTenderSelection(undefined);
      })
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
      .then(() => {
        message.success("Anchor added successfully");
        setAnchorSelection(undefined);
      })
      .catch(() => message.error("Failed to add anchor"));
  };

  const handleRemove = (engagement: Engagement) => {
    removeEngagement(engagement)
      .then(() => message.success("Removed successfully"))
      .catch(() => message.error("Failed to remove"));
  };

  const getTenderLabel = (userId: string | undefined): string => {
    if (!userId) {
      return "Unknown";
    }

    const tender = tenderState.tenders.find((candidate) => candidate.uid === userId);
    return tender?.displayName ?? userId;
  };

  const tenderById = useMemo(() => {
    return new Map(tenderState.tenders.map((tender) => [tender.uid, tender]));
  }, [tenderState.tenders]);

  const responseByUserId = useMemo(() => {
    return new Map(periodResponses.map((r) => [r.userId, r]));
  }, [periodResponses]);

  const unavailabilityWarnings = useMemo(() => {
    const shiftPeriod = `${dayjs(shift.start).format("HH:mm")}–${dayjs(shift.end).format("HH:mm")}`;
    const warnings: string[] = [];
    for (const engagement of shiftEngagements) {
      if (!engagement.userId) continue;
      const response = responseByUserId.get(engagement.userId);
      if (!response || response.participationStatus !== "active") continue;
      if (response.availability?.[shift.id] === false) {
        const name = tenderById.get(engagement.userId)?.displayName ?? engagement.userId;
        warnings.push(`${name} has indicated they cannot work during ${shiftPeriod} at ${eventTitle}.`);
      }
    }
    return warnings;
  }, [shiftEngagements, responseByUserId, tenderById, shift, eventTitle]);

  const conflictWarnings = useMemo(() => {
    const usersOnShift = shiftEngagements
      .map((engagement) => engagement.userId)
      .filter((userId): userId is string => typeof userId === "string");

    const warnings: string[] = [];
    for (let i = 0; i < usersOnShift.length; i += 1) {
      for (let j = i + 1; j < usersOnShift.length; j += 1) {
        const userA = tenderById.get(usersOnShift[i]);
        const userB = tenderById.get(usersOnShift[j]);
        if (!userA || !userB) {
          continue;
        }

        const avoidA = new Set(userA.avoidShiftWithUserIds ?? []);
        const avoidB = new Set(userB.avoidShiftWithUserIds ?? []);
        if (!avoidA.has(userB.uid) && !avoidB.has(userA.uid)) {
          continue;
        }

        warnings.push(
          `${userA.displayName} should avoid shifts with ${userB.displayName}.`
        );
      }
    }

    return warnings;
  }, [shiftEngagements, tenderById]);

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="small">
      {unavailabilityWarnings.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message="Availability conflict"
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {unavailabilityWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          }
        />
      )}

      {conflictWarnings.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message="Manual assignment conflict"
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {conflictWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          }
        />
      )}

      <div>
        <Text strong style={{ fontSize: 12 }}>Anchors</Text>
        <div style={{ marginTop: 6 }}>
          {anchors.length > 0 ? (
            <Space size={[6, 6]} wrap>
              {anchors.map((engagement) => (
                <Popconfirm
                  key={engagement.id}
                  title="Remove this anchor?"
                  onConfirm={() => handleRemove(engagement)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Tag color="gold" style={{ cursor: "pointer", marginRight: 0 }}>
                    <Space size={4}>
                      <UserAvatar
                        user={tenderById.get(engagement.userId ?? "") ?? { uid: "", email: "", displayName: "", active: true, isAdmin: false }}
                        size={32}
                        showHats={true}
                      />
                      <span>{getTenderLabel(engagement.userId)}</span>
                    </Space>
                  </Tag>
                </Popconfirm>
              ))}
            </Space>
          ) : (
            <Text type="secondary">None</Text>
          )}
        </div>
      </div>

      <Select
        size="small"
        style={{ width: "100%" }}
        value={anchorSelection}
        placeholder="Add anchor"
        onChange={(value) => {
          setAnchorSelection(value);
          handleAddAnchor(value);
        }}
        showSearch
        optionFilterProp="children"
      >
        {availableAnchors.map((tender) => (
          <Select.Option key={tender.uid} value={tender.uid}>
            {tender.displayName} - {tender.email}
          </Select.Option>
        ))}
      </Select>

      <div>
        <Text strong style={{ fontSize: 12 }}>Tenders</Text>
        <div style={{ marginTop: 6 }}>
          {tenders.length > 0 ? (
            <Space size={[6, 6]} wrap>
              {tenders.map((engagement) => (
                <Popconfirm
                  key={engagement.id}
                  title="Remove this tender?"
                  onConfirm={() => handleRemove(engagement)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Tag color="blue" style={{ cursor: "pointer", marginRight: 0 }}>
                    <Space size={4}>
                      <UserAvatar
                        user={tenderById.get(engagement.userId ?? "") ?? { uid: "", email: "", displayName: "", active: true, isAdmin: false }}
                        size={32}
                        showHats={true}
                      />
                      <span>{getTenderLabel(engagement.userId)}</span>
                    </Space>
                  </Tag>
                </Popconfirm>
              ))}
            </Space>
          ) : (
            <Text type="secondary">None</Text>
          )}
        </div>
      </div>

      <Select
        size="small"
        style={{ width: "100%" }}
        value={tenderSelection}
        placeholder="Add tender"
        onChange={(value) => {
          setTenderSelection(value);
          handleAddTender(value);
        }}
        showSearch
        optionFilterProp="children"
      >
        {availableTenders.map((tender) => (
          <Select.Option key={tender.uid} value={tender.uid}>
            {tender.displayName} - {tender.email}
          </Select.Option>
        ))}
      </Select>
    </Space>
  );
}
