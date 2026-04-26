import { Alert, Card, Col, Empty, Input, Row, Select, Space, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import ShiftAvailabilityForm from "../../../../components/ShiftAvailability/ShiftAvailabilityForm";
import { EventChoice, ParticipationStatus } from "../../../../types/types-file";
import { PeriodEventGroup, ResponseFilter, SurveyUser } from "../types";

const { Text } = Typography;

type ResponsesIndividualTabProps = {
  filteredUsers: SurveyUser[];
  selectedUserId?: string;
  onSelectedUserIdChange: (userId?: string) => void;
  userSearch: string;
  onUserSearchChange: (value: string) => void;
  responseFilter: ResponseFilter;
  onResponseFilterChange: (value: ResponseFilter) => void;
  selectedUserDisplayName: string;
  selectedUserPassiveConsecutiveWarning: boolean;
  selectedUserAvoidIds: string[];
  onAvoidListChange: (nextUserIds: string[]) => void;
  avoidListOptions: Array<{ value: string; label: string }>;
  avoidSaving: boolean;
  editorLoading: boolean;
  editorHasExistingResponse: boolean;
  editorSubmittedAt: Date | null;
  includesShiftStatusQuestions: boolean;
  isSelectedUserAnchor: boolean;
  editorParticipationStatus?: ParticipationStatus;
  onEditorParticipationStatusChange: (status: ParticipationStatus) => void;
  editorWantsAnchor?: boolean;
  onEditorWantsAnchorChange: (value: boolean) => void;
  editorAnchorOnly: boolean;
  onEditorAnchorOnlyChange: (value: boolean) => void;
  editorAnchorSeminarDays: string[];
  onEditorAnchorSeminarDaysChange: (value: string[]) => void;
  periodAnchorSeminarDays: string[];
  periodEventGroups: PeriodEventGroup[];
  editorEventChoices: Partial<Record<string, EventChoice>>;
  editorEventCanShiftIds: Record<string, string[]>;
  onEditorEventChoice: (eventId: string, value: EventChoice) => void;
  onEditorCanShiftIds: (eventId: string, shiftIds: string[]) => void;
  editorComments: string;
  onEditorCommentsChange: (value: string) => void;
  editorPassiveReason: string;
  onEditorPassiveReasonChange: (value: string) => void;
  editorPrivateEmail: string;
  onEditorPrivateEmailChange: (value: string) => void;
  editorSaving: boolean;
  onSubmitOrEditResponse: () => void;
};

export default function ResponsesIndividualTab({
  filteredUsers,
  selectedUserId,
  onSelectedUserIdChange,
  userSearch,
  onUserSearchChange,
  responseFilter,
  onResponseFilterChange,
  selectedUserDisplayName,
  selectedUserPassiveConsecutiveWarning,
  selectedUserAvoidIds,
  onAvoidListChange,
  avoidListOptions,
  avoidSaving,
  editorLoading,
  editorHasExistingResponse,
  editorSubmittedAt,
  includesShiftStatusQuestions,
  isSelectedUserAnchor,
  editorParticipationStatus,
  onEditorParticipationStatusChange,
  editorWantsAnchor,
  onEditorWantsAnchorChange,
  editorAnchorOnly,
  onEditorAnchorOnlyChange,
  editorAnchorSeminarDays,
  onEditorAnchorSeminarDaysChange,
  periodAnchorSeminarDays,
  periodEventGroups,
  editorEventChoices,
  editorEventCanShiftIds,
  onEditorEventChoice,
  onEditorCanShiftIds,
  editorComments,
  onEditorCommentsChange,
  editorPassiveReason,
  onEditorPassiveReasonChange,
  editorPrivateEmail,
  onEditorPrivateEmailChange,
  editorSaving,
  onSubmitOrEditResponse,
}: ResponsesIndividualTabProps) {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={8}>
        <Card size="small" title="Users">
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <Input
              placeholder="Search by name or email"
              value={userSearch}
              onChange={(event) => onUserSearchChange(event.target.value)}
            />
            <Select
              value={responseFilter}
              onChange={(value) => onResponseFilterChange(value)}
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
      </Col>

      <Col xs={24} lg={16}>
        {!selectedUserId ? (
          <Card size="small">
            <Empty description="Select a user to view or edit response." />
          </Card>
        ) : (
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <Alert
              type="warning"
              showIcon
              message="Shift manager editing mode"
              description={`You are editing shift availability for ${selectedUserDisplayName}.`}
            />

            {selectedUserPassiveConsecutiveWarning && (
              <Alert
                type="warning"
                showIcon
                message="Possible consecutive passive status"
                description="This user already has passive role and is marked passive again for a regular semester survey, indicating two or more consecutive periods as passive."
              />
            )}

            <Card size="small" title="Avoid shifts with">
              <Space direction="vertical" style={{ width: "100%" }}>
                <Text type="secondary">
                  Users listed here should not be assigned on the same shift together.
                </Text>
                <Select
                  mode="multiple"
                  style={{ width: "100%" }}
                  placeholder="Add users to avoid pairing"
                  value={selectedUserAvoidIds}
                  onChange={onAvoidListChange}
                  options={avoidListOptions}
                  loading={avoidSaving}
                  optionFilterProp="label"
                  showSearch
                />
              </Space>
            </Card>

            <Card size="small" title="Shift availability response" loading={editorLoading}>
              <Space direction="vertical" style={{ width: "100%" }} size="middle">
                <Text type="secondary">
                  {editorHasExistingResponse
                    ? `Latest submitted at ${editorSubmittedAt ? dayjs(editorSubmittedAt).format("DD/MM/YYYY HH:mm") : "-"}.`
                    : "No existing response for this user in the selected period."}
                </Text>

                <ShiftAvailabilityForm
                  includesShiftStatusQuestions={includesShiftStatusQuestions}
                  isCurrentlyPassive={false}
                  isCurrentlyLegacy={false}
                  participationStatus={editorParticipationStatus}
                  onParticipationStatusChange={onEditorParticipationStatusChange}
                  isAnchor={isSelectedUserAnchor}
                  wantsAnchor={editorWantsAnchor}
                  onWantsAnchorChange={onEditorWantsAnchorChange}
                  anchorOnly={editorAnchorOnly}
                  onAnchorOnlyChange={onEditorAnchorOnlyChange}
                  anchorSeminarDays={editorAnchorSeminarDays}
                  onAnchorSeminarDaysChange={onEditorAnchorSeminarDaysChange}
                  periodAnchorSeminarDays={periodAnchorSeminarDays}
                  periodEventGroups={periodEventGroups}
                  eventChoices={editorEventChoices}
                  eventCanShiftIds={editorEventCanShiftIds}
                  onEventChoiceChange={onEditorEventChoice}
                  onEventCanShiftIdsChange={onEditorCanShiftIds}
                  passiveReason={editorPassiveReason}
                  onPassiveReasonChange={onEditorPassiveReasonChange}
                  privateEmail={editorPrivateEmail}
                  onPrivateEmailChange={onEditorPrivateEmailChange}
                  comments={editorComments}
                  onCommentsChange={onEditorCommentsChange}
                  onSubmit={onSubmitOrEditResponse}
                  submitting={editorSaving}
                  hasExistingResponse={editorHasExistingResponse}
                />
              </Space>
            </Card>
          </Space>
        )}
      </Col>
    </Row>
  );
}
