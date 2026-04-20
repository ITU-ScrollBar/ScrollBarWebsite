import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Empty,
  Input,
  Radio,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { formatIsoDate } from "../../../../utils/dateUtils";
import {
  EventChoice,
  ParticipationStatus,
  PeriodEventGroup,
  ResponseFilter,
  SurveyUser,
} from "../types";

const { Text } = Typography;
const { TextArea } = Input;

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
  editorParticipationStatus?: ParticipationStatus;
  onEditorParticipationStatusChange: (status: ParticipationStatus) => void;
  editorWantsAnchor?: boolean;
  onEditorWantsAnchorChange: (value: boolean) => void;
  editorAnchorOnly: boolean;
  onEditorAnchorOnlyChange: (value: boolean) => void;
  editorAnchorSeminarDays: string[];
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
  editorParticipationStatus,
  onEditorParticipationStatusChange,
  editorWantsAnchor,
  onEditorWantsAnchorChange,
  editorAnchorOnly,
  onEditorAnchorOnlyChange,
  editorAnchorSeminarDays,
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
                    <div
                      style={{
                        whiteSpace: "normal",
                        overflowWrap: "anywhere",
                      }}
                    >
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
                    <div
                      style={{
                        whiteSpace: "normal",
                        overflowWrap: "anywhere",
                      }}
                    >
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

                <Card size="small" title="Semester participation">
                  <Radio.Group
                    value={editorParticipationStatus}
                    onChange={(event) =>
                      onEditorParticipationStatusChange(
                        event.target.value as ParticipationStatus
                      )
                    }
                  >
                    <Radio value="active">Active</Radio>
                    <Radio value="passive">Passive</Radio>
                    <Radio value="legacy">Legacy</Radio>
                    <Radio value="leave">Leave</Radio>
                  </Radio.Group>
                </Card>

                {editorParticipationStatus === "active" && (
                  <Card size="small" title="Anchor preference">
                    <Space direction="vertical" style={{ width: "100%" }}>
                      <Radio.Group
                        value={
                          editorWantsAnchor === undefined
                            ? undefined
                            : editorWantsAnchor
                              ? "yes"
                              : "no"
                        }
                        onChange={(event) =>
                          onEditorWantsAnchorChange(event.target.value === "yes")
                        }
                      >
                        <Radio value="yes">Yes</Radio>
                        <Radio value="no">No</Radio>
                      </Radio.Group>

                      {editorWantsAnchor === true && (
                        <Radio.Group
                          value={editorAnchorOnly ? "anchor-only" : "mixed"}
                          onChange={(event) =>
                            onEditorAnchorOnlyChange(
                              event.target.value === "anchor-only"
                            )
                          }
                        >
                          <Radio value="mixed">Mix of anchor and tender shifts</Radio>
                          <Radio value="anchor-only">Only anchor shifts</Radio>
                        </Radio.Group>
                      )}

                      {editorWantsAnchor === true && periodAnchorSeminarDays.length > 0 && (
                        <div>
                          <Typography.Text type="secondary" style={{ display: "block", marginBottom: 6 }}>
                            Anchor seminar days they can attend
                          </Typography.Text>
                          <Checkbox.Group value={editorAnchorSeminarDays} disabled>
                            <Space direction="vertical">
                              {periodAnchorSeminarDays.map((day) => (
                                <Checkbox key={day} value={day}>
                                  {formatIsoDate(day)}
                                </Checkbox>
                              ))}
                            </Space>
                          </Checkbox.Group>
                        </div>
                      )}
                    </Space>
                  </Card>
                )}

                {editorParticipationStatus === "active" && (
                  <Card size="small" title="Availability by event">
                    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                      {periodEventGroups.map((group) => {
                        const choice = editorEventChoices[group.eventId];

                        return (
                          <Card
                            key={group.eventId}
                            size="small"
                            title={group.event?.title ?? group.eventId}
                            extra={
                              group.event?.start
                                ? dayjs(group.event.start).format("DD/MM/YYYY")
                                : "-"
                            }
                          >
                            <Space direction="vertical" style={{ width: "100%" }}>
                              <Radio.Group
                                value={choice}
                                onChange={(event) =>
                                  onEditorEventChoice(
                                    group.eventId,
                                    event.target.value as EventChoice
                                  )
                                }
                              >
                                <Radio value="can">Can work whole event</Radio>
                                <Radio value="cannot">Cannot fully work event</Radio>
                              </Radio.Group>

                              {choice === "cannot" && (
                                <Checkbox.Group
                                  value={editorEventCanShiftIds[group.eventId] ?? []}
                                  onChange={(values) =>
                                    onEditorCanShiftIds(group.eventId, values as string[])
                                  }
                                >
                                  <Space direction="vertical">
                                    {group.shifts.map((shift) => (
                                      <Checkbox key={shift.id} value={shift.id}>
                                        {shift.title} (
                                        {dayjs(shift.start).format("HH:mm")}-
                                        {dayjs(shift.end).format("HH:mm")})
                                      </Checkbox>
                                    ))}
                                  </Space>
                                </Checkbox.Group>
                              )}
                            </Space>
                          </Card>
                        );
                      })}
                    </Space>
                  </Card>
                )}

                {editorParticipationStatus === "passive" && (
                  <Card size="small" title="Reason for being passive">
                    <TextArea
                      rows={3}
                      value={editorPassiveReason}
                      onChange={(event) => onEditorPassiveReasonChange(event.target.value)}
                    />
                  </Card>
                )}

                {editorParticipationStatus === "legacy" && (
                  <Card size="small" title="Private email for Teams">
                    <TextArea
                      rows={1}
                      value={editorPrivateEmail}
                      onChange={(event) => onEditorPrivateEmailChange(event.target.value)}
                      placeholder="your@email.com"
                    />
                  </Card>
                )}

                <Card size="small" title="Comments">
                  <TextArea
                    rows={3}
                    value={editorComments}
                    onChange={(event) => onEditorCommentsChange(event.target.value)}
                  />
                </Card>

                <Button type="primary" loading={editorSaving} onClick={onSubmitOrEditResponse}>
                  {editorHasExistingResponse ? "Edit response" : "Submit response"}
                </Button>
              </Space>
            </Card>
          </Space>
        )}
      </Col>
    </Row>
  );
}
