import { Button, DatePicker, Input, Modal, Radio, Select, Space } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import dayjs, { Dayjs } from "dayjs";
import { Event, ShiftPlanningSurveyType } from "../../../../types/types-file";

const { RangePicker } = DatePicker;

type ShiftPeriodModalsProps = {
  isCreateOpen: boolean;
  isEditOpen: boolean;
  creatingPeriod: boolean;
  editingPeriod: boolean;
  onCloseCreate: () => void;
  onCloseEdit: () => void;
  onCreate: () => void;
  onUpdate: () => void;
  sortedEvents: Event[];
  newPeriodName: string;
  onNewPeriodNameChange: (value: string) => void;
  newPeriodWindow: [Dayjs, Dayjs] | null;
  onNewPeriodWindowChange: (value: [Dayjs, Dayjs] | null) => void;
  newPeriodEventIds: string[];
  onNewPeriodEventIdsChange: (value: string[]) => void;
  newPeriodMandatoryEventIds: string[];
  onNewPeriodMandatoryEventIdsChange: (value: string[]) => void;
  newPeriodSurveyType: ShiftPlanningSurveyType;
  onNewPeriodSurveyTypeChange: (value: ShiftPlanningSurveyType) => void;
  newPeriodAnchorSeminarDays: string[];
  onNewPeriodAnchorSeminarDaysChange: (value: string[]) => void;
  editPeriodName: string;
  onEditPeriodNameChange: (value: string) => void;
  editPeriodDeadline: Dayjs | null;
  onEditPeriodDeadlineChange: (value: Dayjs | null) => void;
  editPeriodEventIds: string[];
  onEditPeriodEventIdsChange: (value: string[]) => void;
  editPeriodMandatoryEventIds: string[];
  onEditPeriodMandatoryEventIdsChange: (value: string[]) => void;
  editPeriodSurveyType: ShiftPlanningSurveyType;
  onEditPeriodSurveyTypeChange: (value: ShiftPlanningSurveyType) => void;
  editPeriodAnchorSeminarDays: string[];
  onEditPeriodAnchorSeminarDaysChange: (value: string[]) => void;
  submissionCount: number;
};

export default function ShiftPeriodModals({
  isCreateOpen,
  isEditOpen,
  creatingPeriod,
  editingPeriod,
  onCloseCreate,
  onCloseEdit,
  onCreate,
  onUpdate,
  sortedEvents,
  newPeriodName,
  onNewPeriodNameChange,
  newPeriodWindow,
  onNewPeriodWindowChange,
  newPeriodEventIds,
  onNewPeriodEventIdsChange,
  newPeriodMandatoryEventIds,
  onNewPeriodMandatoryEventIdsChange,
  newPeriodSurveyType,
  onNewPeriodSurveyTypeChange,
  newPeriodAnchorSeminarDays,
  onNewPeriodAnchorSeminarDaysChange,
  editPeriodName,
  onEditPeriodNameChange,
  editPeriodDeadline,
  onEditPeriodDeadlineChange,
  editPeriodEventIds,
  onEditPeriodEventIdsChange,
  editPeriodMandatoryEventIds,
  onEditPeriodMandatoryEventIdsChange,
  editPeriodSurveyType,
  onEditPeriodSurveyTypeChange,
  editPeriodAnchorSeminarDays,
  onEditPeriodAnchorSeminarDaysChange,
  submissionCount,
}: ShiftPeriodModalsProps) {
  return (
    <>
      <Modal
        title="Create new shift planning period"
        open={isCreateOpen}
        onCancel={onCloseCreate}
        onOk={onCreate}
        okText="Create period"
        confirmLoading={creatingPeriod}
        width={760}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <div>
            <Text strong>Period name</Text>
            <Input
              size="large"
              style={{ width: "100%", marginTop: 6 }}
              placeholder="Period name (e.g. Spring 2026 #1)"
              value={newPeriodName}
              onChange={(event) => onNewPeriodNameChange(event.target.value)}
            />
          </div>

          <div>
            <Text strong>Submission window</Text>
            <RangePicker
              size="large"
              showTime
              style={{ width: "100%", marginTop: 6 }}
              value={newPeriodWindow ? [newPeriodWindow[0], newPeriodWindow[1]] : null}
              onChange={(value) => {
                if (!value || !value[0] || !value[1]) {
                  onNewPeriodWindowChange(null);
                  return;
                }
                onNewPeriodWindowChange([value[0], value[1]]);
              }}
            />
          </div>

          <div>
            <Text strong>Events in period</Text>
            <Select
              size="large"
              style={{ width: "100%", marginTop: 6 }}
              mode="multiple"
              placeholder="Select events in this period"
              value={newPeriodEventIds}
              onChange={(value) => {
                onNewPeriodEventIdsChange(value);
                onNewPeriodMandatoryEventIdsChange(
                  newPeriodMandatoryEventIds.filter((eventId) => value.includes(eventId))
                );
              }}
              options={sortedEvents.map((event) => ({
                value: event.id,
                label: `${event.title} - ${dayjs(event.start).format("DD/MM/YYYY")}`,
              }))}
            />
          </div>

          <div>
            <Text strong>Big parties</Text>
            <Select
              size="large"
              style={{ width: "100%", marginTop: 6 }}
              mode="multiple"
              placeholder="Prioritize assigning users to these events"
              value={newPeriodMandatoryEventIds}
              onChange={onNewPeriodMandatoryEventIdsChange}
              options={sortedEvents
                .filter((event) => newPeriodEventIds.includes(event.id))
                .map((event) => ({
                  value: event.id,
                  label: `${event.title} - ${dayjs(event.start).format("DD/MM/YYYY")}`,
                }))}
            />
          </div>

          <div>
            <Text strong>Survey type</Text>
            <Radio.Group
              value={newPeriodSurveyType}
              onChange={(event) =>
                onNewPeriodSurveyTypeChange(event.target.value as ShiftPlanningSurveyType)
              }
              style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}
            >
              <Radio value="regularSemesterSurvey">Regular semester survey</Radio>
              <Radio value="excludeSemesterStatus">Exclude semester status</Radio>
              <Radio value="newbieShiftPlanning">Newbie shift planning</Radio>
            </Radio.Group>
            <Text type="secondary">
              Newbie shift planning is only available to users with newbie role.
            </Text>
          </div>

          {newPeriodSurveyType === "regularSemesterSurvey" && (
            <div>
              <Text strong>Possible anchor seminar days</Text>
              <Space direction="vertical" style={{ width: "100%", marginTop: 6 }}>
                {newPeriodAnchorSeminarDays.map((day, index) => (
                  <Space key={index}>
                    <DatePicker
                      format="DD/MM/YYYY"
                      value={dayjs(day)}
                      onChange={(value) => {
                        if (!value) return;
                        const updated = [...newPeriodAnchorSeminarDays];
                        updated[index] = value.format("YYYY-MM-DD");
                        onNewPeriodAnchorSeminarDaysChange(updated);
                      }}
                    />
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => onNewPeriodAnchorSeminarDaysChange(newPeriodAnchorSeminarDays.filter((_, i) => i !== index))}
                    />
                  </Space>
                ))}
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    const latest = newPeriodAnchorSeminarDays[newPeriodAnchorSeminarDays.length - 1];
                    const next = latest
                      ? dayjs(latest).add(1, "day").format("YYYY-MM-DD")
                      : dayjs().format("YYYY-MM-DD");
                    onNewPeriodAnchorSeminarDaysChange([...newPeriodAnchorSeminarDays, next]);
                  }}
                >
                  Add date
                </Button>
              </Space>
            </div>
          )}
        </Space>
      </Modal>

      <Modal
        title="Edit shift planning period"
        open={isEditOpen}
        onCancel={onCloseEdit}
        onOk={onUpdate}
        okText="Save changes"
        confirmLoading={editingPeriod}
        width={760}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <div>
            <Text strong>Period name</Text>
            <Input
              size="large"
              style={{ width: "100%", marginTop: 6 }}
              value={editPeriodName}
              onChange={(event) => onEditPeriodNameChange(event.target.value)}
            />
          </div>

          <div>
            <Text strong>Submission deadline</Text>
            <DatePicker
              size="large"
              showTime
              format="DD/MM/YYYY HH:mm"
              style={{ width: "100%", marginTop: 6 }}
              value={editPeriodDeadline}
              onChange={(value) => onEditPeriodDeadlineChange(value)}
            />
          </div>

          <div>
            <Text strong>Events in period</Text>
            <Select
              size="large"
              style={{ width: "100%", marginTop: 6 }}
              mode="multiple"
              placeholder="Select events in this period"
              value={editPeriodEventIds}
              disabled={submissionCount > 0}
              onChange={(value) => {
                onEditPeriodEventIdsChange(value);
                onEditPeriodMandatoryEventIdsChange(
                  editPeriodMandatoryEventIds.filter((eventId) => value.includes(eventId))
                );
              }}
              options={sortedEvents.map((event) => ({
                value: event.id,
                label: `${event.title} - ${dayjs(event.start).format("DD/MM/YYYY")}`,
              }))}
            />
            {submissionCount > 0 && (
              <Text type="secondary">
                Events cannot be changed after submissions have been received.
              </Text>
            )}
          </div>

          <div>
            <Text strong>Big parties</Text>
            <Select
              size="large"
              style={{ width: "100%", marginTop: 6 }}
              mode="multiple"
              placeholder="Prioritize assigning users to these events"
              value={editPeriodMandatoryEventIds}
              onChange={onEditPeriodMandatoryEventIdsChange}
              options={sortedEvents
                .filter((event) => editPeriodEventIds.includes(event.id))
                .map((event) => ({
                  value: event.id,
                  label: `${event.title} - ${dayjs(event.start).format("DD/MM/YYYY")}`,
                }))}
            />
            {submissionCount > 0 && (
              <Text type="secondary">Big parties can still be changed after submissions.</Text>
            )}
          </div>

          <div>
            <Text strong>Survey type</Text>
            <Radio.Group
              value={editPeriodSurveyType}
              onChange={(event) =>
                onEditPeriodSurveyTypeChange(event.target.value as ShiftPlanningSurveyType)
              }
              style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}
            >
              <Radio value="regularSemesterSurvey">Regular semester survey</Radio>
              <Radio value="excludeSemesterStatus">Exclude semester status</Radio>
              <Radio value="newbieShiftPlanning">Newbie shift planning</Radio>
            </Radio.Group>
            <Text type="secondary">
              Newbie shift planning is only available to users with newbie role.
            </Text>
          </div>

          {editPeriodSurveyType === "regularSemesterSurvey" && (
            <div>
              <Text strong>Possible anchor seminar days</Text>
              <Space direction="vertical" style={{ width: "100%", marginTop: 6 }}>
                {editPeriodAnchorSeminarDays.map((day, index) => (
                  <Space key={index}>
                    <DatePicker
                      format="DD/MM/YYYY"
                      value={dayjs(day)}
                      onChange={(value) => {
                        if (!value) return;
                        const updated = [...editPeriodAnchorSeminarDays];
                        updated[index] = value.format("YYYY-MM-DD");
                        onEditPeriodAnchorSeminarDaysChange(updated);
                      }}
                    />
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => onEditPeriodAnchorSeminarDaysChange(editPeriodAnchorSeminarDays.filter((_, i) => i !== index))}
                    />
                  </Space>
                ))}
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    const latest = editPeriodAnchorSeminarDays[editPeriodAnchorSeminarDays.length - 1];
                    const next = latest
                      ? dayjs(latest).add(1, "day").format("YYYY-MM-DD")
                      : dayjs().format("YYYY-MM-DD");
                    onEditPeriodAnchorSeminarDaysChange([...editPeriodAnchorSeminarDays, next]);
                  }}
                >
                  Add date
                </Button>
              </Space>
            </div>
          )}
        </Space>
      </Modal>
    </>
  );
}
