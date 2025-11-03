import { Card, InputNumber, Input, DatePicker, Button, Popconfirm, Space } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Shift } from "../../../types/types-file";

export default function ShiftInfo(props: {
  shift: Shift;
  updateShift: (id: string, field: string, value: unknown) => void;
  removeShift: (shift: Shift) => void;
}) {
  const { shift, updateShift, removeShift } = props;

  return (
    <Card 
      title={shift.title} 
      className="mb-4 shadow-sm rounded-lg"
      extra={
        <Popconfirm
          title="Delete this shift?"
          description="This will permanently delete the shift. Engagements will remain."
          onConfirm={() => removeShift(shift)}
          okText="Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
        >
          <Button type="text" danger icon={<DeleteOutlined />}>
            Delete
          </Button>
        </Popconfirm>
      }
    >
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        {/* Title */}
        <Input
          value={shift.title}
          placeholder="Shift title"
          onChange={(e) => updateShift(shift.id, "title", e.target.value)}
        />

        {/* Location */}
        <Input
          value={shift.location}
          placeholder="Location"
          onChange={(e) => updateShift(shift.id, "location", e.target.value)}
        />

        {/* Dates */}
        <div className="flex flex-wrap items-center gap-4">
          <span>From</span>
          <DatePicker
            format="DD-MM-YYYY HH:mm"
            showTime
            value={dayjs(shift.start)}
            onChange={(value) => updateShift(shift.id, "start", value?.toDate())}
          />

          <span>To</span>
          <DatePicker
            format="DD-MM-YYYY HH:mm"
            showTime
            value={dayjs(shift.end)}
            onChange={(value) => updateShift(shift.id, "end", value?.toDate())}
          />
        </div>

        {/* Numbers */}
        <div className="flex gap-4">
          anchors
          <InputNumber
            min={0}
            value={shift.anchors}
            onChange={(value) => updateShift(shift.id, "anchors", value)}
            placeholder="Anchors"
          />
          tenders
          <InputNumber
            min={0}
            value={shift.tenders}
            onChange={(value) => updateShift(shift.id, "tenders", value)}
            placeholder="Tenders"
          />
        </div>
      </Space>
    </Card>
  );
}
