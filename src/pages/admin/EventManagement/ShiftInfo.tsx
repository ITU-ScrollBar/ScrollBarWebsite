import { InputNumber, Input, DatePicker, Button, Divider, Popconfirm, Select, Space, Typography } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Shift, ShiftCategory } from "../../../types/types-file";

const { Text } = Typography;

export default function ShiftInfo(props: {
  shift: Shift;
  updateShift: (id: string, field: string, value: unknown) => void;
  removeShift: (shift: Shift) => void;
  isMandatory?: boolean;
  satelliteShift?: Shift;
  onAddSatellite: () => void;
  onRemoveSatellite: () => void;
  onUpdateSatellite: (field: string, value: unknown) => void;
}) {
  const { shift, updateShift, removeShift, isMandatory, satelliteShift, onAddSatellite, onRemoveSatellite, onUpdateSatellite } = props;

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

      <Select
        size="small"
        value={shift.category}
        placeholder="Category"
        onChange={(value: ShiftCategory) => updateShift(shift.id, "category", value)}
        style={{ width: 120 }}
        options={[
          { value: "opening", label: "Opening" },
          { value: "middle", label: "Middle" },
          { value: "closing", label: "Closing" },
        ]}
      />

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

      {isMandatory ? (
        <Text type="secondary">Mandatory event — all available tenders are assigned</Text>
      ) : (
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
      )}

      <Divider style={{ margin: "6px 0" }} />

      {satelliteShift ? (
        <Space direction="vertical" size="small" style={{ width: "100%" }}>
          <Text type="secondary" style={{ fontSize: 11 }}>Satellite shift</Text>
          <Space size="small" wrap>
            <Input
              size="small"
              value={satelliteShift.location}
              placeholder="Satellite location"
              onChange={(e) => onUpdateSatellite("location", e.target.value)}
              style={{ width: 140 }}
            />
            {!isMandatory && (
              <InputNumber
                size="small"
                min={1}
                value={satelliteShift.tenders}
                onChange={(value) => onUpdateSatellite("tenders", value)}
                style={{ width: 80 }}
              />
            )}
            <Popconfirm
              title="Remove satellite shift?"
              description="Engagements for this satellite shift will remain."
              onConfirm={onRemoveSatellite}
              okText="Remove"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger icon={<DeleteOutlined />} type="text">
                Remove
              </Button>
            </Popconfirm>
          </Space>
        </Space>
      ) : (
        <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={onAddSatellite}>
          Add satellite shift
        </Button>
      )}
    </Space>
  );
}
