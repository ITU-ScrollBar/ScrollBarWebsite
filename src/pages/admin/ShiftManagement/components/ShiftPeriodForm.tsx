import { Button, DatePicker, Input, Radio, Select, Space } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import dayjs, { Dayjs } from "dayjs";
import { Event, ShiftPlanningSurveyType } from "../../../../types/types-file";

const { RangePicker } = DatePicker;

type ShiftPeriodFormMode = "create" | "edit";

type ShiftPeriodFormProps = {
  mode: ShiftPeriodFormMode;
  sortedEvents: Event[];
  submissionCount: number;
  periodName: string;
  onPeriodNameChange: (value: string) => void;
  submissionWindow: [Dayjs, Dayjs] | null;
  onSubmissionWindowChange: (value: [Dayjs, Dayjs] | null) => void;
  periodEventIds: string[];
  onPeriodEventIdsChange: (value: string[]) => void;
  mandatoryEventIds: string[];
  onMandatoryEventIdsChange: (value: string[]) => void;
  surveyType: ShiftPlanningSurveyType;
  onSurveyTypeChange: (value: ShiftPlanningSurveyType) => void;
  anchorSeminarDays: string[];
  onAnchorSeminarDaysChange: (value: string[]) => void;
};

export default function ShiftPeriodForm({
  mode,
  sortedEvents,
  submissionCount,
  periodName,
  onPeriodNameChange,
  submissionWindow,
  onSubmissionWindowChange,
  periodEventIds,
  onPeriodEventIdsChange,
  mandatoryEventIds,
  onMandatoryEventIdsChange,
  surveyType,
  onSurveyTypeChange,
  anchorSeminarDays,
  onAnchorSeminarDaysChange,
}: ShiftPeriodFormProps) {
  const eventsLocked = mode === "edit" && submissionCount > 0;

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      <div>
        <Text strong>Period name</Text>
        <Input
          size="large"
          style={{ width: "100%", marginTop: 6 }}
          placeholder="Period name (e.g. Spring 2026)"
          value={periodName}
          onChange={(event) => onPeriodNameChange(event.target.value)}
        />
      </div>

      <div>
        <Text strong>Submission window</Text>
        <RangePicker
          size="large"
          showTime
          style={{ width: "100%", marginTop: 6 }}
          value={submissionWindow ? [submissionWindow[0], submissionWindow[1]] : null}
          onChange={(value) => {
            if (!value || !value[0] || !value[1]) {
              onSubmissionWindowChange(null);
              return;
            }
            onSubmissionWindowChange([value[0], value[1]]);
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
          value={periodEventIds}
          disabled={eventsLocked}
          onChange={(value) => {
            onPeriodEventIdsChange(value);
            onMandatoryEventIdsChange(mandatoryEventIds.filter((eventId) => value.includes(eventId)));
          }}
          options={sortedEvents.map((event) => ({
            value: event.id,
            label: `${event.title} - ${dayjs(event.start).format("DD/MM/YYYY")}`,
          }))}
        />
        {eventsLocked && (
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
          placeholder="Mandatory for attending tenders"
          value={mandatoryEventIds}
          onChange={onMandatoryEventIdsChange}
          options={sortedEvents
            .filter((event) => periodEventIds.includes(event.id))
            .map((event) => ({
              value: event.id,
              label: `${event.title} - ${dayjs(event.start).format("DD/MM/YYYY")}`,
            }))}
        />
      </div>

      <div>
        <Text strong>Survey type</Text>
        <Radio.Group
          value={surveyType}
          onChange={(event) =>
            onSurveyTypeChange(event.target.value as ShiftPlanningSurveyType)
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

      {surveyType === "regularSemesterSurvey" && (
        <div>
          <Text strong>Possible anchor seminar days</Text>
          <Space direction="vertical" style={{ width: "100%", marginTop: 6 }}>
            {anchorSeminarDays.map((day, index) => (
              <Space key={index}>
                <DatePicker
                  format="DD/MM/YYYY"
                  value={dayjs(day)}
                  onChange={(value) => {
                    if (!value) return;
                    const updated = [...anchorSeminarDays];
                    updated[index] = value.format("YYYY-MM-DD");
                    onAnchorSeminarDaysChange(updated);
                  }}
                />
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => onAnchorSeminarDaysChange(anchorSeminarDays.filter((_, i) => i !== index))}
                />
              </Space>
            ))}
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => {
                const latest = anchorSeminarDays[anchorSeminarDays.length - 1];
                const next = latest
                  ? dayjs(latest).add(1, "day").format("YYYY-MM-DD")
                  : dayjs().format("YYYY-MM-DD");
                onAnchorSeminarDaysChange([...anchorSeminarDays, next]);
              }}
            >
              Add date
            </Button>
          </Space>
        </div>
      )}
    </Space>
  );
}