import { Card, Input, Select, Space, Table, Tag } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useShiftPlanningContext } from "../../../../contexts/ShiftPlanningContext";
import useTenders from "../../../../hooks/useTenders";
import { Role } from "../../../../types/types-file";
import { ResponseFilter } from "../types";
import { resolveSurveyType } from "../../../../firebase/api/shiftPlanning";

type UserSelectionColumnProps = {
  selectedUserId: string | undefined;
  onSelectedUserIdChange: (userId: string | undefined) => void;
};

export default function UserSelectionColumn({ selectedUserId, onSelectedUserIdChange }: UserSelectionColumnProps) {
  const { periodState, responseState, selectedPeriodId } = useShiftPlanningContext();
  const { tenderState } = useTenders();

  const [userSearch, setUserSearch] = useState("");
  const [responseFilter, setResponseFilter] = useState<ResponseFilter>("all");

  const selectedPeriod = useMemo(
    () => periodState.periods.find((p) => p.id === selectedPeriodId) ?? null,
    [periodState.periods, selectedPeriodId]
  );

  const selectedPeriodSurveyType = selectedPeriod ? resolveSurveyType(selectedPeriod) : null;

  const tenderById = useMemo(
    () => new Map(tenderState.tenders.map((t) => [t.uid, t])),
    [tenderState.tenders]
  );

  const responseByUserId = useMemo(
    () => new Map(responseState.responses.map((r) => [r.userId, r])),
    [responseState.responses]
  );

  const expectedSurveyUsers = useMemo(() => {
    const requiredRole = selectedPeriodSurveyType === "newbieShiftPlanning" ? Role.NEWBIE : Role.TENDER;
    return tenderState.tenders
      .filter((t) => t.active && t.roles?.includes(requiredRole) === true)
      .map((t) => ({
        uid: t.uid,
        name: t.displayName,
        email: t.email,
        responded: responseByUserId.has(t.uid),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [responseByUserId, selectedPeriodSurveyType, tenderState.tenders]);

  const filteredUsers = useMemo(() => {
    const searchTerm = userSearch.trim().toLowerCase();
    return expectedSurveyUsers.filter((user) => {
      const response = responseByUserId.get(user.uid);
      const userIsAnchor = tenderById.get(user.uid)?.roles?.includes(Role.ANCHOR) === true;

      if (responseFilter === "responded" && !user.responded) return false;
      if (responseFilter === "missing" && user.responded) return false;
      if (responseFilter === "allAnchors" && !response?.wantsAnchor) return false;
      if (responseFilter === "newAnchors" && (!response?.wantsAnchor || userIsAnchor)) return false;
      if (responseFilter === "passiveMembers" && (response?.participationStatus ?? "active") !== "passive") return false;
      if (responseFilter === "legacyMembers" && (response?.participationStatus ?? "active") !== "legacy") return false;
      if (responseFilter === "leavingBar" && (response?.participationStatus ?? "active") !== "leave") return false;
      if (!searchTerm) return true;
      return user.name.toLowerCase().includes(searchTerm) || (user.email ?? "").toLowerCase().includes(searchTerm);
    });
  }, [expectedSurveyUsers, responseByUserId, responseFilter, tenderById, userSearch]);

  useEffect(() => {
    if (!selectedUserId && filteredUsers.length > 0) {
      onSelectedUserIdChange(filteredUsers[0].uid);
      return;
    }
    if (selectedUserId && !filteredUsers.some((u) => u.uid === selectedUserId)) {
      onSelectedUserIdChange(filteredUsers[0]?.uid);
    }
  }, [filteredUsers, selectedUserId, onSelectedUserIdChange]);

  return (
    <Card size="small" title="Users">
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <Input
          placeholder="Search by name or email"
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
        />
        <Select
          value={responseFilter}
          onChange={(value) => setResponseFilter(value)}
          style={{ minWidth: 220, width: 220 }}
          options={[
            { value: "all", label: "All users" },
            { value: "responded", label: "Already responded" },
            { value: "missing", label: "Missing response" },
            { value: "allAnchors", label: "All anchors" },
            { value: "newAnchors", label: "New anchors" },
            { value: "passiveMembers", label: "Passive members" },
            { value: "legacyMembers", label: "Legacy members" },
            { value: "leavingBar", label: "Leaving the bar" },
          ]}
        />
        <Table
          size="small"
          rowKey="uid"
          dataSource={filteredUsers}
          tableLayout="fixed"
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50", "100"],
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
          }}
          rowSelection={{
            type: "radio",
            selectedRowKeys: selectedUserId ? [selectedUserId] : [],
            onChange: (selectedRowKeys) => {
              onSelectedUserIdChange(selectedRowKeys[0] as string | undefined);
            },
          }}
          onRow={(record) => ({
            onClick: () => onSelectedUserIdChange(record.uid),
          })}
          columns={[
            {
              title: "Name",
              dataIndex: "name",
              render: (value: string) => (
                <div style={{ whiteSpace: "normal", overflowWrap: "anywhere" }}>
                  <div>{value}</div>
                </div>
              ),
            },
            {
              title: "Status",
              dataIndex: "responded",
              width: 120,
              render: (responded: boolean) => (
                <Tag color={responded ? "green" : "orange"}>
                  {responded ? "Responded" : "Missing"}
                </Tag>
              ),
            },
            {
              title: "Email",
              dataIndex: "email",
              responsive: ["md"],
              render: (value: string | undefined) => (
                <div style={{ whiteSpace: "normal", overflowWrap: "anywhere" }}>
                  {value ?? "-"}
                </div>
              ),
            },
          ]}
        />
      </Space>
    </Card>
  );
}
