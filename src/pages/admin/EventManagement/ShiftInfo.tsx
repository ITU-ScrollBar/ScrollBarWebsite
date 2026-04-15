import { InputNumber, Input, DatePicker, Button, Popconfirm, Space, Typography } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Shift } from "../../../types/types-file";

const { Text } = Typography;

export default function ShiftInfo(props: {
  shift: Shift;
  updateShift: (id: string, field: string, value: unknown) => void;
  removeShift: (shift: Shift) => void;
}) {
  const { shift, updateShift, removeShift } = props;

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="small">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <Space size="small" wrap>
          <Input
            size="small"
            value={shift.title}
            placeholder="Shift name"
            onChange={(event) => updateShift(shift.id, "title", event.target.value)}
            style={{ width: 160 }}
          />
          <Input
            size="small"
            value={shift.location}
            placeholder="Location"
            onChange={(event) => updateShift(shift.id, "location", event.target.value)}
            style={{ width: 140 }}
          />
        </Space>

        <Popconfirm
          title="Delete this shift?"
          description="This will permanently delete the shift. Engagements will remain."
          onConfirm={() => removeShift(shift)}
          okText="Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
        >
          <Button type="text" size="small" danger icon={<DeleteOutlined />}>
            Delete
          </Button>
        </Popconfirm>
      </div>

      <Space size="small" wrap>
        <DatePicker
          size="small"
          format="DD-MM-YYYY HH:mm"
          showTime
          allowClear={false}
          value={dayjs(shift.start)}
          onChange={(value) => updateShift(shift.id, "start", value?.toDate())}
        />
        <DatePicker
          size="small"
          format="DD-MM-YYYY HH:mm"
          allowClear={false}
          showTime
          value={dayjs(shift.end)}
          onChange={(value) => updateShift(shift.id, "end", value?.toDate())}
        />
      </Space>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Text type="secondary">Total tenders including anchors</Text>
        <InputNumber
          size="small"
          min={1}
          value={shift.tenders}
          onChange={(value) => updateShift(shift.id, "tenders", value)}
          style={{ width: 96 }}
        />
      </div>
    </Space>
  );
}
