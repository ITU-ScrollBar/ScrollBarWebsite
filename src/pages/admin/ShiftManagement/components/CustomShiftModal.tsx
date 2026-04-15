import { DatePicker, Input, InputNumber, Modal, Space } from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";

type CustomShiftModalProps = {
  open: boolean;
  onClose: () => void;
  onAddShift: () => void;
  customShiftTitle: string;
  onCustomShiftTitleChange: (value: string) => void;
  customShiftLocation: string;
  onCustomShiftLocationChange: (value: string) => void;
  customShiftStart: Date;
  onCustomShiftStartChange: (value: Date) => void;
  customShiftEnd: Date;
  onCustomShiftEndChange: (value: Date) => void;
  customShiftTenders: number;
  onCustomShiftTendersChange: (value: number) => void;
};

export default function CustomShiftModal({
  open,
  onClose,
  onAddShift,
  customShiftTitle,
  onCustomShiftTitleChange,
  customShiftLocation,
  onCustomShiftLocationChange,
  customShiftStart,
  onCustomShiftStartChange,
  customShiftEnd,
  onCustomShiftEndChange,
  customShiftTenders,
  onCustomShiftTendersChange,
}: CustomShiftModalProps) {
  return (
    <Modal title="Add custom shift" open={open} onOk={onAddShift} onCancel={onClose} okText="Add shift">
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <div>
          <Text strong>Title</Text>
          <Input
            placeholder="Shift title"
            value={customShiftTitle}
            onChange={(event) => onCustomShiftTitleChange(event.target.value)}
            style={{ width: "100%", marginTop: 6 }}
          />
        </div>

        <div>
          <Text strong>Location</Text>
          <Input
            placeholder="Location"
            value={customShiftLocation}
            onChange={(event) => onCustomShiftLocationChange(event.target.value)}
            style={{ width: "100%", marginTop: 6 }}
          />
        </div>

        <div>
          <Text strong>Start time</Text>
          <DatePicker
            format="DD-MM-YYYY HH:mm"
            showTime
            value={dayjs(customShiftStart)}
            onChange={(value) => onCustomShiftStartChange(value?.toDate() || customShiftStart)}
            style={{ width: "100%", marginTop: 6 }}
          />
        </div>

        <div>
          <Text strong>End time</Text>
          <DatePicker
            format="DD-MM-YYYY HH:mm"
            showTime
            value={dayjs(customShiftEnd)}
            onChange={(value) => onCustomShiftEndChange(value?.toDate() || customShiftEnd)}
            style={{ width: "100%", marginTop: 6 }}
          />
        </div>

        <Space style={{ width: "100%" }} size="large">
          <div style={{ flex: 1 }}>
            <Text strong>Total tenders including anchors</Text>
            <InputNumber
              min={1}
              value={customShiftTenders}
              onChange={(value) => onCustomShiftTendersChange(Math.max(1, Number(value ?? 1)))}
              style={{ width: "100%", marginTop: 6 }}
            />
          </div>
        </Space>
      </Space>
    </Modal>
  );
}
